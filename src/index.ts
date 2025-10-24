import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as Challenge from './challenge';
import * as HTML from './html';

const numLeadingZeroBitsTarget = 12;
const sec = () => Math.floor(Date.now() / 1_000);

const prisma = new PrismaClient();
const app = express();
app.use((req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    req.headers['content-type'] = 'application/json';
  }
  next();
});
app.use(express.json({ limit: '1kb' }));

app.get('/', async (req, res) => {
  res.contentType('html');
  res.end(`
<p>Welcome to TTYT, a simple chatting platform for developers.</p>
<ul>
  <li>Visit <a href="/verify"><code>/verify</code></a> for instructions on generating a valid keypair for yourself.</li>
  <li>Visit <a href="/mint"><code>/mint</code></a> for instructions on minting arbitrary recipients.</li>
  <li>Visit <a href="/recipients"><code>/recipients</code></a> to list & search recipients.</li>
  <li>Visit <a href="/posts"><code>/posts</code></a> to list & search posts.</li>
</ul>
`);
});

app.get('/verify', async (req, res) => {
  const token = Challenge.ThisMinuteToken();
  const short = token.slice(0, 8) + '...';
  res.contentType('html');
  res.end(`
<p>Generate an Ed25519 public key such that <code>sign("${short}")</code> has ${numLeadingZeroBitsTarget} leading zero bits.</p>
<p>Then POST to <code>/verify</code>:</p>
<pre>
{
  "key": "&lt;hex encoded Ed25519 public key&gt;",
  "sig": "&lt;hex encoded signature of ${short}&gt;",
  "tok": "${token}"
}
</pre>
<p><code>key</code> will be stored as your identity on TTYT if the proof is valid.</p>
`);
});

app.post('/verify', async (req, res) => {
  const { key, sig, tok } = req.body;
  if (!key || !sig || !tok)
    return res.status(400).end('Invalid request body; GET /verify for help');
  const tokenStatus = Challenge.VerifyToken(tok);
  if (tokenStatus !== 'valid')
    return res.status(400).end(`Token ${tokenStatus}`);

  const sigStatus = await Challenge.CheckEd25519Signature(key, tok, sig);
  if (typeof sigStatus === 'string') return res.status(400).end(sigStatus);
  if (!sigStatus) return res.status(400).end('Invalid signature');

  const numLeadingZeroBits = Challenge.CountLeadingZeroBits(sig);
  if (numLeadingZeroBits < numLeadingZeroBitsTarget)
    return res
      .status(400)
      .end(
        `Insufficient leading zero bits: got ${numLeadingZeroBits}, need ${numLeadingZeroBitsTarget}`,
      );

  try {
    await prisma.powIdentity.create({
      data: { createdSec: sec(), identity: key, lastQueryMs: Date.now() },
    });
    res.end(`Welcome to TTYT, ${key}.`);
  } catch {
    return res
      .status(500)
      .end('Database error; perhaps this key already exists?');
  }
});

app.get('/mint', (req, res) => {
  const token = Challenge.ThisMinuteToken();
  const short = token.slice(0, 8) + '...';
  res.contentType('html');
  res.end(`
<p>Generate an Ed25519 public key such that <code>sign("${short}")</code> has ${numLeadingZeroBitsTarget} leading zero bits.</p>
<p>Then POST to <code>/mint</code>:</p>
<pre>
{
  "str": "&lt;the 1-64 byte Unicode recipient you want to mint&gt;",
  "key": "&lt;hex encoded Ed25519 public key&gt;",
  "sig": "&lt;hex encoded signature of ${short}&gt;",
  "tok": "${token}"
}
</pre>
`);
});

app.post('/mint', async (req, res) => {
  const { str, key, sig, tok } = req.body;
  if (!str || !key || !sig || !tok)
    return res.status(400).end('Invalid request body; GET /mint for help');
  const tokenStatus = Challenge.VerifyToken(tok);
  if (tokenStatus !== 'valid')
    return res.status(400).end(`Token ${tokenStatus}`);
  //TODO...
});

app.get('/recipients', async (req, res) => {
  try {
    const recipients = await prisma.powIdentity.findMany({
      include: {
        _count: { select: { Received: { where: { public: true } } } },
        parent: { select: { identity: true } },
      },
    });
    const table = HTML.tabulate(
      recipients.map(r => ({
        identity: r.identity,
        'created sec': `${r.createdSec}`,
        parent: r.parent?.identity ?? '--',
        'public post count': r._count.Received,
      })),
    );
    res.contentType('html');
    res.end(table);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).end('Error fetching recipients');
  }
});

app.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { public: true },
      include: { author: { select: { identity: true } } },
    });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).end('Error fetching posts');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
