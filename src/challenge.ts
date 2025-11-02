import * as Crypto from './crypto';
import { Request, Response } from 'express';

const expendedTokens = new Map<string, Date>();

type ChallengeParams = {
  req: Request;
  res: Response;
  key: string;
  sig: string;
  tok: string;
};
export async function Challenge(params: ChallengeParams) {
  const { req, res, key, sig, tok } = params;
  if (!req.ip) return res.status(400).end('IP address not visible');

  const existing = expendedTokens.get(tok);
  if (existing) {
    res.status(400).end(`Token already used at ${existing.toISOString()}`);
    return false;
  }

  console.log(req.ip);
  const tokenStatus = Crypto.VerifyToken(req.ip, tok);
  if (tokenStatus !== 'valid') {
    res.status(400).end(`Token ${tokenStatus}`);
    return false;
  }

  const sigStatus = await Crypto.CheckEd25519Sig(key, tok, sig);
  if (!sigStatus.sig_valid) {
    res.status(400).json(sigStatus).end();
    return false;
  }

  const numLeadingZeroBits = Crypto.CountLeadingZeroBits(sig);
  if (numLeadingZeroBits < Crypto.numLeadingZeroBitsTarget) {
    res
      .status(400)
      .end(
        `Insufficient leading zero bits: got ${numLeadingZeroBits}, need ${Crypto.numLeadingZeroBitsTarget}`,
      );
    return false;
  }

  const tokenTtlMs = Crypto.tokenTtlSec * 1_000;
  for (const [usedTok, usedAt] of expendedTokens.entries())
    if (Date.now() - usedAt.getTime() > tokenTtlMs)
      expendedTokens.delete(usedTok);
  expendedTokens.set(tok, new Date());

  return true;
}
