import express from 'express';
import { PrismaClient } from '@prisma/client';
import { GenerateToken, VerifyToken } from './challenge';

//https://www.npmjs.com/package/tweetnacl
//https://tweetnacl.js.org/#/box

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

app.get('/', async (req, res) => {
  res.contentType('html');
  res.end(`
<p>Welcome to TTYT, a simple chatting platform for developers.</p>
<p>Visit <a href="/token"><code>/token</code></a> for instructions on generating a valid keypair for yourself.</p>
`);
});

app.get('/token', async (req, res) => {
  const token = GenerateToken();
  const short = token.slice(0, 8) + '...';
  //TODO: decide if encryption public key is imposed or PoW identity can choose to use any whenever they wish
  const help = `Generate an Ed25519 public key such that <code>sign("${short}")</code> has 24 leading zero bits.
Once you have done that, generate yourself a X25519-XSalsa20-Poly1305 keypair for encrypted messaging.
Then POST to <code>/verify</code>:
<pre>
{
  "signature_public_key": "&lt;hex encoded Ed25519 public key&gt;",
  "encryption_public_key": "&lt;hex encoded X25519 public key&gt;",
  "signature": "&lt;hex encoded signature of ${short}&gt;",
  "token": "${token}"
}
</pre>
`;
  res.contentType('html');
  res.end(help);
});

app.post('/verify', async (req, res) => {
  //Check body is valid
  const { key, sig, tok } = req.body;
  if (!key || !sig || !tok)
    return res
      .status(400)
      .json({ error: 'Invalid request body; GET /token for help' });
  if (!VerifyToken(tok))
    return res.status(400).json({ error: 'Invalid token' });
});

/*
When the client submits their public key and nonce, your server should:

    Verify the HMAC of the token.

    Recompute the hash and check the leading zero bits.

    If valid, store the public key in your database of "verified" keys.*/

// GET all users
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { posts: true },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// POST create user
app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await prisma.user.create({
      data: {
        name,
        email,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Error creating user' });
  }
});

// GET all posts
app.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { author: true },
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching posts' });
  }
});

// POST create post
app.post('/posts', async (req, res) => {
  try {
    const { title, content, authorId } = req.body;
    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId,
      },
      include: { author: true },
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: 'Error creating post' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
