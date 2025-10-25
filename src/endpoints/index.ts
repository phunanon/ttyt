import { app } from '../infrastructure';

app.get('/', async (req, res) => {
  res.contentType('html');
  res.end(`
<p>Welcome to TTYT, a simple chatting platform for developers.</p>
<ul>
  <li>Visit <a href="/register"><code>/register</code></a> for instructions on generating a valid keypair for yourself.</li>
  <li>Visit <a href="/mint"><code>/mint</code></a> for instructions on minting arbitrary recipients.</li>
  <li>Visit <a href="/recipients"><code>/recipients</code></a> to list & search recipients.</li>
  <li>Visit <a href="/posts"><code>/posts</code></a> to list & search posts.</li>
  <li>Visit <a href="/post"><code>/post</code></a> to submit a new post.</li>
</ul>
`);
});
