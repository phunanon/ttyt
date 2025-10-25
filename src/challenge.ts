import * as Crypto from './crypto';
import { Response } from 'express';

type ChallengeParams = { res: Response; key: string; sig: string; tok: string };
export async function Challenge(params: ChallengeParams) {
  const { res, key, sig, tok } = params;
  const tokenStatus = Crypto.VerifyToken(tok);
  if (tokenStatus !== 'valid')
    return res.status(400).end(`Token ${tokenStatus}`);

  const sigStatus = await Crypto.CheckEd25519Signature(key, tok, sig);
  if (!sigStatus.sig_valid) return res.status(400).json(sigStatus).end();

  const numLeadingZeroBits = Crypto.CountLeadingZeroBits(sig);
  if (numLeadingZeroBits < Crypto.numLeadingZeroBitsTarget)
    return res
      .status(400)
      .end(
        `Insufficient leading zero bits: got ${numLeadingZeroBits}, need ${Crypto.numLeadingZeroBitsTarget}`,
      );

  return true;
}
