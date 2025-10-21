import crypto from 'crypto';

const TTL = 5 * 60_000; //5 minutes
const secret256bit = crypto.randomBytes(32).toString('hex');

export const GenerateToken = () => {
  const server_nonce = crypto.randomBytes(16).toString('hex');
  const ttl = Date.now() + TTL;
  const hmac = crypto.createHmac('sha256', secret256bit);
  hmac.update(server_nonce + ttl);
  const hmac_hex = hmac.digest('hex');
  return `${server_nonce}:${ttl}:${hmac_hex}`;
};

export const VerifyToken = (token: string) => {
  const [server_nonce, ttl_str, hmac_hex] = token.split(':');
  if (!server_nonce || !ttl_str || !hmac_hex) return false;
  const ttl = parseInt(ttl_str);
  if (isNaN(ttl) || Date.now() > ttl) return false;
  const hmac = crypto.createHmac('sha256', secret256bit);
  hmac.update(server_nonce + ttl);
  const expected_hmac_hex = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(hmac_hex, 'hex'),
    Buffer.from(expected_hmac_hex, 'hex'),
  );
};
