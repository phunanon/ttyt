import { app, prisma } from '../infrastructure';
import { Challenge } from '../challenge';
import * as Crypto from '../crypto';

app.get('/mint', (req, res) => {
  const token = Crypto.ThisMinuteToken();
  const short = token.slice(0, 8) + '...';
  res.contentType('html');
  res.end(`
<p>Generate an Ed25519 public key such that <code>sign("${short}")</code> has ${Crypto.numLeadingZeroBitsTarget} leading zero bits.</p>
<p>Then POST to <code>/mint</code>:</p>
<pre>
{
  "str": "&lt;the 1-64 byte Unicode recipient you want to mint&gt;",
  "key": "&lt;hex encoded Ed25519 public key&gt;",
  "sig": "&lt;hex encoded signature of ${short}&gt;",
  "tok": "${token}"
}
</pre>
<p>Optionally, use the <a href="/public/challenge.html">reference implementation</a>.</p>
`);
});

app.post('/mint', async (req, res) => {
  const { str, key, sig, tok } = req.body;
  if (!str || !key || !sig || !tok)
    return res.status(400).end('Invalid request body; GET /mint for help');

  if (!Challenge(res, key, sig, tok)) return;
});

