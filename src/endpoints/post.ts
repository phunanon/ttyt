import { app, prisma, sec } from '../infrastructure';
import * as Crypto from '../crypto';

app.get('/post', async (req, res) => {
  res.contentType('html');
  res.sendFile('post.html', { root: 'public' });
});

app.post('/post', async (req, res) => {
  const { key, sig, payload } = req.body;
  if (typeof key !== 'string') return res.status(400).end('Missing key');
  if (typeof sig !== 'string') return res.status(400).end('Missing sig');
  const parsed = (() => {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  })();
  if (!parsed) return res.status(400).end('Invalid JSON payload');
  const { recipient, content } = parsed;
  if (typeof recipient !== 'string')
    return res.status(400).end('Missing payload recipient');
  if (typeof content !== 'string')
    return res.status(400).end('Missing payload content');
  if (typeof parsed.public !== 'boolean')
    return res.status(400).end('Missing payload public flag');

  const sigStatus = await Crypto.CheckEd25519Signature(key, payload, sig);
  if (!sigStatus.sig_valid) return res.status(400).json(sigStatus).end();

  const [authorPoW, recipientPoW] = await Promise.all([
    prisma.powIdentity.findUnique({ where: { identity: key.toLowerCase() } }),
    prisma.powIdentity.findUnique({
      where: { identity: recipient.toLowerCase() },
    }),
  ]);
  if (!authorPoW) return res.status(400).end('key not found');
  if (!recipientPoW) return res.status(400).end('recipient not found');

  try {
    await prisma.post.create({
      data: {
        createdSec: sec(),
        authorId: authorPoW.id,
        recipientId: recipientPoW.id,
        content,
        signature: sig,
        public: parsed.public,
      },
    });
    res.end('Post created');
  } catch (e) {
    console.error('Error creating post:', e);
    res.status(500).end('Database error creating post');
  }
});
