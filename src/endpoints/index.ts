import process from 'node:process';
import { app } from '../infrastructure';

app.get('/', (req, res) => {
  res.redirect('/ttyt/v1');
});

app.get('/ttyt/v1', async (req, res) => {
  res.contentType('text/plain');
  res.sendFile('README.md', { root: process.cwd() });
});
