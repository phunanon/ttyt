import { app, prisma, sec } from '../infrastructure';
import { Challenge } from '../challenge';
import * as Crypto from '../crypto';

app.get('/register', async (req, res) => {
  const token = Crypto.ThisMinuteToken();
  const short = token.slice(0, 8) + '...';
  res.contentType('html');
  res.end(`
<p>Generate an Ed25519 public key such that <code>sign("${short}")</code> has ${Crypto.numLeadingZeroBitsTarget} leading zero bits.</p>
<p>Then POST to <code>/register</code>:</p>
<pre>
{
  "key": "&lt;hex encoded Ed25519 public key&gt;",
  "sig": "&lt;hex encoded signature of ${short}&gt;",
  "tok": "${token}"
}
</pre>
<p><code>key</code> will be stored as your identity on TTYT if the proof is valid.</p>
<p>Optionally, use the <a href="/public/challenge.html">reference implementation</a>.</p>
`);
});

app.post('/register', async (req, res) => {
  const { key, sig, tok } = req.body;
  if (!key || !sig || !tok)
    return res.status(400).end('Invalid request body; GET /register for help');

  if (!await Challenge(res, key, sig, tok)) return;

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

