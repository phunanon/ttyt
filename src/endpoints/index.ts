import process from 'node:process';
import { app } from '../infrastructure';
import { ServerNonce } from '../crypto';

app.get('/', (req, res) => {
  res.redirect('/tmail');
});

app.get('/ttyt/v1', async (req, res) => {
  res.contentType('text/plain');
  res.sendFile('README.md', { root: process.cwd() });
});

app.get('/ttyt/v1/nonce', (req, res) => {
  res.contentType('text/plain');
  res.end(ServerNonce());
});
