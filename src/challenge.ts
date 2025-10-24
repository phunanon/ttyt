import crypto from 'crypto';
import { subtle } from 'crypto';

const TTL = 5 * 60_000; //5 minutes
const secret256bit = crypto.randomBytes(32).toString('hex');
const tokenCache = { token: '', ttl: 0 };

export const ThisMinuteToken = () => {
  if (Date.now() <= tokenCache.ttl) return tokenCache.token;
  const server_nonce = crypto.randomBytes(16).toString('hex');
  const ttl = Date.now() + TTL;
  const hmac = crypto.createHmac('sha256', secret256bit);
  hmac.update(server_nonce + ttl);
  const hmac_hex = hmac.digest('hex');
  tokenCache.token = `${server_nonce}:${ttl}:${hmac_hex}`;
  tokenCache.ttl = Date.now() + 60_000;
  return tokenCache.token;
};

export const VerifyToken = (token: string) => {
  const [server_nonce, ttl_str, hmac_hex] = token.split(':');
  if (!server_nonce || !ttl_str || !hmac_hex) return 'malformed';
  const ttl = parseInt(ttl_str);
  if (isNaN(ttl) || Date.now() > ttl) return 'expired';
  const hmac = crypto.createHmac('sha256', secret256bit);
  hmac.update(server_nonce + ttl);
  const expected_hmac_hex = hmac.digest('hex');
  const valid = crypto.timingSafeEqual(
    Buffer.from(hmac_hex, 'hex'),
    Buffer.from(expected_hmac_hex, 'hex'),
  );
  return valid ? 'valid' : 'invalid';
};

export async function CheckEd25519Signature(
  publicKeyHex: string,
  message: string,
  signatureHex: string,
): Promise<boolean | string> {
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
    const valid = await subtle.verify(
      { name: 'Ed25519' },
      publicKey,
      signature,
      messageUint8,
    );
    return valid;
  } catch (e) {
    return `${e}`;
  }
}

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
