const q = (c, s) => c.querySelector(s);

async function Post() {
  const form = q(document, '#post-form');
  const payload = JSON.stringify({
    recipient: q(form, '[placeholder="recipient"]').value.trim(),
    content: q(form, '[placeholder="content"]').value.trim(),
    public: q(form, '[name="public"]').checked,
  });
  const privateKeyInput = q(form, '[name="private-key"]');
  const privateKeyHex = privateKeyInput.value.trim();

  //Import private key from pkcs8 hex
  const privateKeyBytes = Uint8Array.fromHex(privateKeyHex);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'Ed25519' },
    true,
    ['sign'],
  );

  //Sign the payload
  const encodedPayload = new TextEncoder().encode(payload);
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    encodedPayload,
  );
  const sig = new Uint8Array(signature).toHex();

  //Export public key of the private key
  const publicKeyBase64url = await crypto.subtle
    .exportKey('jwk', privateKey)
    .then(jwk => jwk.x);
  const publicKeyBase64 = publicKeyBase64url
    .replaceAll('-', '+')
    .replaceAll('_', '/');
  const key = base64ToHex(publicKeyBase64);

  const body = { key, sig, payload };
  const response = await fetch('/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  q(document, '#response').textContent = await response.text();
}

function base64ToHex(str) {
  console.log('Converting base64 to hex:', str);
  const raw = [...atob(str)];
  const result = raw
    .map(c => {
      const hex = c.charCodeAt(0).toString(16);
      return hex.length === 2 ? hex : '0' + hex;
    })
    .join('');
  return result.toUpperCase();
}
