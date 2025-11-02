import { app, prisma } from '../infrastructure';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import * as Crypto from '../crypto';
import * as HTML from '../html';

async function GetPosts(
  res: Response,
  where: Prisma.PostWhereInput,
  limit: number,
  jsonMode: boolean,
) {
  try {
    const posts = await prisma.post.findMany({
      where,
      select: {
        createdSec: true,
        content: true,
        author: { select: { identity: true } },
        recipient: {
          select: { identity: true, owner: { select: { identity: true } } },
        },
      },
      take: Math.min(100, limit),
    });

    if (jsonMode) {
      res.json(posts);
      return;
    }

    const truncate = true;
    const table = HTML.tabulate(
      posts.map(({ author, recipient, createdSec, content }) => {
        const aHref = `/posts?author=${author.identity}`;
        const rHref = `/posts?recipient=${recipient.identity}`;
        const timestamp = new Date(createdSec * 1_000)
          .toISOString()
          .replace('T', ' ')
          .replace('.000Z', '');
        return {
          author: { text: author.identity, truncate, href: aHref },
          recipient: { text: recipient.identity, truncate, href: rHref },
          at: {
            text: `<a href="/posts?beforeSec=${createdSec}">⬅</a>
${timestamp}
<a href="/posts?afterSec=${createdSec}">➡</a>`,
          },
          content: { text: content },
        };
      }),
    );
    res.contentType('html');
    res.end(`<p><a href="?json=true">JSON mode</a></p>
${table}`);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).end('Error fetching posts');
  }
}

app.get('/conversation', async (req, res) => {
  const { a, b, epochMinSig, json, beforeSec, afterSec, limit } = req.query;

  if (typeof a !== 'string' || typeof b !== 'string') {
    res.status(400).end('invalid or missing "a" and/or "b" parameters');
    return;
  }
  if (typeof epochMinSig !== 'string') {
    res.status(400).end('invalid or missing "epochMinSig" parameter');
    return;
  }

  const Check = Crypto.CheckEd25519SigOfEpochMin;
  const forA = await Check(a, epochMinSig);
  const forB = await Check(b, epochMinSig);
  const sigStatus = Crypto.SigOR(forA, forB);
  if (sigStatus.sig_error) {
    res.status(400).json(sigStatus);
    return;
  }
  if (!sigStatus.sig_valid) {
    res.status(403).json(sigStatus);
    return;
  }

  const where: Prisma.PostWhereInput = {
    OR: [
      { author: { identity: a }, recipient: { identity: b } },
      { author: { identity: b }, recipient: { identity: a } },
    ],
    createdSec: {
      lt: beforeSec ? Number(beforeSec) : undefined,
      gt: afterSec ? Number(afterSec) : undefined,
    },
  };

  const limitParsed = Number(limit);
  const limitNum = Number.isNaN(limitParsed) ? 100 : limitParsed;
  return GetPosts(res, where, limitNum, json === 'true');
});

app.get('/posts', async (req, res) => {
  const { author, recipient } = req.query;
  const { json, beforeSec, afterSec, limit } = req.query;
  if (author && typeof author !== 'string') {
    res.status(400).end('invalid author parameter');
    return;
  }
  if (recipient && typeof recipient !== 'string') {
    res.status(400).end('invalid recipient parameter');
    return;
  }

  const where: Prisma.PostWhereInput = {
    public: true,
    author: author ? { identity: author } : undefined,
    recipient: recipient ? { identity: recipient } : undefined,
    createdSec: {
      lt: beforeSec ? Number(beforeSec) : undefined,
      gt: afterSec ? Number(afterSec) : undefined,
    },
  };

  const limitParsed = Number(limit);
  const limitNum = Number.isNaN(limitParsed) ? 100 : limitParsed;
  await GetPosts(res, where, limitNum, json === 'true');
});
