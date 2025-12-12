import crypto from 'crypto';
import { subtle } from 'crypto';

export const tokenTtlSec = 300;
export const numBitsChallenge = 12;
const secret256bit = crypto.randomBytes(32).toString('hex');
const min = () => Math.floor(Date.now() / 60_000);

export const ServerNonce = (epochMin = min()) => {
  const hmac = crypto.createHmac('sha256', secret256bit);
  hmac.update(`${epochMin}`);
  return hmac.digest('hex');
};

export const VerifyServerNonce = (nonceHex: string) => {
  const now = min();
  const nonce = Buffer.from(nonceHex, 'hex');
  const present = Buffer.from(ServerNonce(now), 'hex');
  const previous = Buffer.from(ServerNonce(now - 1), 'hex');
  const next = Buffer.from(ServerNonce(now + 1), 'hex');
  return nonce.equals(present) || nonce.equals(previous) || nonce.equals(next);
};

export async function CheckEd25519Sig(
  publicKeyHex: string,
  plaintext: string,
  signatureHex: string,
) {
  try {
    const publicKeyRaw = Buffer.from(publicKeyHex, 'hex');
    const signature = Buffer.from(signatureHex, 'hex');
    const messageUint8 = Buffer.from(plaintext, 'utf8');
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
