import { PrismaClient } from './generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import express, { Response, Request } from 'express';
import { CircularBuffer } from './circular-buffer';
import * as Crypto from './crypto';

const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/db.db' });
export const prisma = new PrismaClient({ adapter });
export const app = express();
export const sec = () => Math.floor(Date.now() / 1_000);

const nonceSigCache = new CircularBuffer(1_024);

export const VerifyNonceSig = async (
  req: Request,
  res: Response,
  pubkey: string,
  verifyIsServerNonce = true,
) => {
  const nonceHeader = req.headers['x-ttyt-nonce'];
  const signatureHeader = req.headers['x-ttyt-nonce-sig'];
  if (!nonceHeader || !signatureHeader) {
    res.status(402).end('X-TTYT-NONCE or X-TTYT-NONCE-SIG missing');
    return false;
  }
  const nonce = `${nonceHeader}`;
  const signature = `${signatureHeader}`;
  if (nonceSigCache.has(signature)) {
    res.status(429).end('X-TTYT-NONCE-SIG already used');
    return false;
  }
  nonceSigCache.add(signature);
  if (verifyIsServerNonce && !Crypto.VerifyServerNonce(nonce)) {
    res.status(400).end('X-TTYT-NONCE invalid');
    return false;
  }
  const sigStatus = await Crypto.CheckEd25519Sig(pubkey, nonce, signature);
  if (sigStatus.sig_error) {
    res.status(400).end(`X-TTYT-NONCE-SIG error: ${sigStatus.sig_error}`);
    return false;
  }
  if (!sigStatus.sig_valid) {
    res.status(401).end('X-TTYT-NONCE-SIG invalid');
    return false;
  }

  const numBits = Math.clz32(parseInt(signature.slice(0, 8), 16));
  if (verifyIsServerNonce && numBits < Crypto.numBitsChallenge) {
    const body = `X-TTYT-NONCE-SIG ${numBits} < ${Crypto.numBitsChallenge} leading zero bits`;
    res.status(400).end(body);
    return false;
  }

  return true;
};

export const VerifyBodySig = async (
  req: Request,
  res: Response,
  pubkey: string,
) => {
  const signatureHeader = req.headers['x-ttyt-body-sig'];
  if (!signatureHeader) {
    res.status(400).end('X-TTYT-BODY-SIG missing');
    return false;
  }
  const signature = `${signatureHeader}`;
  const sigStatus = await Crypto.CheckEd25519Sig(pubkey, req.body, signature);
  if (sigStatus.sig_error) {
    res.status(500).end(`X-TTYT-BODY-SIG error: ${sigStatus.sig_error}`);
    return false;
  }
  if (!sigStatus.sig_valid) {
    res.status(401).end('X-TTYT-BODY-SIG invalid');
    return false;
  }
  return signature;
};

const identityCache = new Set<string>();
setInterval(() => identityCache.clear(), 1_000);
export const RateLimited = (identity: string, res: Response) => {
  const limited = identityCache.has(identity);
  if (limited) {
    res.status(429).end('Identity rate limited');
    return true;
  }
  identityCache.add(identity);
  return false;
}

app.use((req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    req.headers['content-type'] = 'application/json';
  }
  next();
});
app.use(express.text({ limit: '1kb' }));
app.use('/tmail', express.static('www'));

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close();
  process.exit(0);
});
