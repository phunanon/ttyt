import { app } from '../infrastructure';
import { ServerNonce } from '../crypto';

app.get('/ttyt/v1/nonce', (req, res) => {
  res.contentType('text/plain');
  res.end(ServerNonce());
});
