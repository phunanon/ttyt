import * as Crypto from './crypto';

export async function Challenge(res, key: string, sig: string, tok: string) {
  const tokenStatus = Crypto.VerifyToken(tok);
  if (tokenStatus !== 'valid')
    return res.status(400).end(`Token ${tokenStatus}`);

  const sigStatus = await Crypto.CheckEd25519Signature(key, tok, sig);
  if (typeof sigStatus === 'string') return res.status(400).end(sigStatus);
  if (!sigStatus) return res.status(400).end('Invalid signature');

  const numLeadingZeroBits = Crypto.CountLeadingZeroBits(sig);
  if (numLeadingZeroBits < Crypto.numLeadingZeroBitsTarget)
    return res
      .status(400)
      .end(
        `Insufficient leading zero bits: got ${numLeadingZeroBits}, need ${Crypto.numLeadingZeroBitsTarget}`,
      );

  return true;
}
