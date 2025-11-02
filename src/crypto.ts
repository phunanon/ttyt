import crypto from 'crypto';
import { subtle } from 'crypto';

export const tokenTtlSec = 300;
export const numLeadingZeroBitsTarget = 12;
const secret256bit = crypto.randomBytes(32).toString('hex');
type TokenCacheEntry = { token: string; sec: number; ttl: number };
const ipTokenCache = new Map<string, TokenCacheEntry>();

export const GenerateToken = (ip: string) => {
  const sec = Math.floor(Date.now() / 1_000);
  for (const [key, value] of ipTokenCache.entries())
    if (sec > value.sec) ipTokenCache.delete(key);

  const existing = ipTokenCache.get(ip);
  if (existing) return existing.token;

  const server_nonce = crypto.randomBytes(16).toString('hex');
  const ttl = sec + tokenTtlSec;
  const hmac = crypto.createHmac('sha256', secret256bit);
  hmac.update(server_nonce + ttl);
  const hmac_hex = hmac.digest('hex');
  const entry = { token: `${server_nonce}_${ttl}_${ip}_${hmac_hex}`, sec, ttl };
  ipTokenCache.set(ip, entry);
  return entry.token;
};

export const VerifyToken = (ip: string, token: string) => {
  const [server_nonce, ttl_str, tok_ip, hmac_hex] = token.split('_');
  if (!server_nonce || !ttl_str || !hmac_hex) return 'malformed';
  const ttl = parseInt(ttl_str);
  const sec = Math.floor(Date.now() / 1_000);
  if (isNaN(ttl) || sec > ttl) return 'expired';
  if (tok_ip !== ip) return 'wrong IP';
  const hmac = crypto.createHmac('sha256', secret256bit);
  hmac.update(server_nonce + ttl);
  const expected_hmac_hex = hmac.digest('hex');
  const valid = crypto.timingSafeEqual(
    Buffer.from(hmac_hex, 'hex'),
    Buffer.from(expected_hmac_hex, 'hex'),
  );
  return valid ? 'valid' : 'invalid';
};

export async function CheckEd25519Sig(
  publicKeyHex: string,
  message: string,
  signatureHex: string,
) {
  try {
    const publicKeyRaw = Buffer.from(publicKeyHex, 'hex');
    const signature = Buffer.from(signatureHex, 'hex');
    const messageUint8 = Buffer.from(message, 'utf8');
    const publicKey = await subtle.importKey(
      'raw',
      publicKeyRaw,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    const sig_valid = await subtle.verify(
      { name: 'Ed25519' },
      publicKey,
      signature,
      messageUint8,
    );
    return { sig_valid };
  } catch (sig_error) {
    return { sig_error };
  }
}

type SigStatus = Awaited<ReturnType<typeof CheckEd25519Sig>>;
export const SigOR = (a: SigStatus, b: SigStatus) => {
  if ('sig_error' in a) return a;
  if ('sig_error' in b) return b;
  const sig_valid = a.sig_valid || b.sig_valid;
  return { sig_valid };
};

export const CheckEd25519SigOfEpochMin = async (
  pubkeyHex: string,
  sigHex: string,
) => {
  const presentMin = Math.floor(Date.now() / 60_000);
  const previousMin = presentMin - 1;
  const nextMin = presentMin + 1;
  const present = await CheckEd25519Sig(pubkeyHex, `${presentMin}`, sigHex);
  const previous = await CheckEd25519Sig(pubkeyHex, `${previousMin}`, sigHex);
  const next = await CheckEd25519Sig(pubkeyHex, `${nextMin}`, sigHex);
  return SigOR(present, SigOR(previous, next));
};

export const CountLeadingZeroBits = (hex: string): number => {
  const buf = Buffer.from(hex, 'hex');
  let count = 0;
  for (const byte of buf)
    for (let bit = 7; bit >= 0; bit--) {
      if ((byte >> bit) & 1) return count;
      ++count;
    }
  return count;
};
