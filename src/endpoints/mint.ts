import { app, prisma, sec } from '../infrastructure';
import { Challenge } from '../challenge';
import * as Crypto from '../crypto';

app.get('/mint', (req, res) => {
  if (!req.ip) return res.status(400).end('IP address not visible');

  const token = Crypto.GenerateToken(req.ip);
  const short = token.slice(0, 8) + '...';
  res.contentType('html');
  res.end(`
<p>Generate an Ed25519 public key such that <code>sign("${short}")</code> has ${Crypto.numLeadingZeroBitsTarget} leading zero bits.</p>
<p>Then POST to <code>/mint</code>:</p>
<pre>
{
  "str": "&lt;the 1-64 byte Unicode recipient you want to mint&gt;",
  "own": "&lt;registered hexadecimal encoded Ed25519 public key&gt;",
  "key": "&lt;hexadecimal encoded Ed25519 public key&gt;",
  "sig": "&lt;hexadecimal encoded signature of ${short}&gt;",
  "tok": "${token}"
}
</pre>
<p>Note: characters <code>&lt; &gt; &amp; &quot; &#39; &grave;</code> are stripped, and the string trimmed.</p>
<p>Optionally, use the <a href="/public/challenge.html">reference implementation</a>.</p>
`);
});

app.post('/mint', async (req, res) => {
  const { str, own, key, sig, tok } = req.body;
  const sanitised =
    typeof str === 'string' ? str.trim().replaceAll(/[<>&"'`]/g, '') : '';
  if (
    !sanitised ||
    typeof own !== 'string' ||
    typeof key !== 'string' ||
    typeof sig !== 'string' ||
    typeof tok !== 'string'
  )
    return res.status(400).end('Invalid request body; GET /mint for help');

  if (!Challenge({ req, res, key, sig, tok })) return;

  try {
    const owner = await prisma.powIdentity.findUnique({
      where: { identity: own.toLowerCase() },
    });
    if (!owner) return res.status(400).end('owner identity (own) not found');
    await prisma.powIdentity.create({
      data: {
        createdSec: sec(),
        identity: sanitised,
        owner: { connect: { id: owner.id } },
      },
    });
    res.end(`Minted: ${sanitised}`);
  } catch {
    return res
      .status(500)
      .end('Database error; perhaps this str has already been minted?');
  }
});
