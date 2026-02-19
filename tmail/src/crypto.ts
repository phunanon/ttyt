declare global {
  interface Uint8ArrayConstructor {
    fromHex: (hex: string) => Uint8Array<ArrayBuffer>;
    fromBase64: (b64: string) => Uint8Array<ArrayBuffer>;
  }
  interface Uint8Array {
    toHex: () => string;
  }
  type Seckey = { readonly seckey: CryptoKey };
  type Pubkey = { readonly pubkey: ArrayBuffer; readonly hex: string };
  type Keys = { readonly seckey: Seckey; readonly pubkey: Pubkey };
}

export const NonceSigHeaders = async ({ seckey: key }: Seckey) => {
  const nonce = crypto.getRandomValues(new Uint8Array(16)).toHex();
  const bytes = new TextEncoder().encode(nonce);
  const signature = await crypto.subtle.sign({ name: 'Ed25519' }, key, bytes);
  const sigArr = new Uint8Array(signature);
  return {
    'X-TTYT-NONCE': nonce,
    'X-TTYT-NONCE-SIG': new Uint8Array(sigArr).toHex(),
  };
};

export const BodySigHeaders = async ({ seckey: key }: Seckey, body: string) => {
  const bytes = new TextEncoder().encode(body);
  const signature = await crypto.subtle.sign({ name: 'Ed25519' }, key, bytes);
  const sigArr = new Uint8Array(signature);
  return { 'X-TTYT-BODY-SIG': new Uint8Array(sigArr).toHex() };
};

export const IngestSeckey = async (seckeyHex: string) => {
  const seckeyBytes = Uint8Array.fromHex(seckeyHex);
  const exportable = await crypto.subtle.importKey(
    'pkcs8',
    seckeyBytes,
    { name: 'Ed25519' },
    true,
    ['sign'],
  );
  const nonExportable = await crypto.subtle.importKey(
    'pkcs8',
    seckeyBytes,
    { name: 'Ed25519' },
    false,
    ['sign'],
  );

  const publicKeyBase64url = await crypto.subtle
    .exportKey('jwk', exportable)
    .then(jwk => jwk.x);

  if (!publicKeyBase64url) {
    throw new Error('Failed to export public key from secret key');
  }

  const publicKeyBase64 = publicKeyBase64url
    .replaceAll('-', '+')
    .replaceAll('_', '/');
  const publicKeyBytes = Uint8Array.fromBase64(publicKeyBase64);

  return {
    identity: {
      seckey: { seckey: nonExportable },
      pubkey: { pubkey: publicKeyBytes.buffer, hex: publicKeyBytes.toHex() },
    },
  };
};
