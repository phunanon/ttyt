const tok =
  'e44c8919e860da53ccdbce88746be497:1761216112992:4858dfc78937461d4e1ed722d54c8b5bf25635c66132b892665079afdf9f3432';

const workerCount = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
let found = false;
let iterations = 0;

const workerCode = `
  console.log("Worker started");
  const token = '${tok}';
  const encoded = new TextEncoder().encode(token);
  const LEADING_ZERO_BITS = 12;
  let iterations = 0;
  async function findSignature() {
    while (true) {
      // Generate Ed25519 key pair
      const keyPair = await crypto.subtle.generateKey(
        { name: 'Ed25519' },
        true,
        ['sign', 'verify']
      );
      // Sign the token
      const signature = await crypto.subtle.sign(
        { name: 'Ed25519' },
        keyPair.privateKey,
        encoded
      );
      iterations++;
      if (iterations % 1000 === 0) {
        self.postMessage({ iterations });
        iterations = 0;
      }
      const sigArr = new Uint8Array(signature);
      // Compose a 32-bit integer from the first 4 bytes (big-endian)
      const sigInt = (sigArr[0] << 24) | (sigArr[1] << 16) | (sigArr[2] << 8) | sigArr[3];
      if (Math.clz32(sigInt) >= LEADING_ZERO_BITS) {
        // Export the private key as pkcs8 and the public key as raw
        const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        const publicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);
        self.postMessage({
          pkcs8: Array.from(new Uint8Array(pkcs8)),
          publicKey: Array.from(new Uint8Array(publicKey)),
          signature: Array.from(sigArr)
        });
        break;
      }
    }
  }
  findSignature();
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const workers = [];
let totalIterations = 0;
let timer = setInterval(() => {
  console.log(`Total iterations: ${totalIterations.toLocaleString()}`);
}, 1_000);

function terminateAll() {
  workers.forEach(w => w.terminate());
}

for (let i = 0; i < workerCount; ++i) {
  const worker = new Worker(workerUrl);
  workers.push(worker);
  worker.onmessage = e => {
    if (e.data && typeof e.data.iterations === 'number') {
      totalIterations += e.data.iterations;
    } else if (!found && e.data && e.data.pkcs8 && e.data.signature) {
      found = true;
      terminateAll();
      clearInterval(timer);
      const { pkcs8, publicKey, signature } = e.data;
      const toHex = arr =>
        arr.map(b => b.toString(16).padStart(2, '0')).join('');
      console.log({
        privateKey: toHex(pkcs8),
        publicKey: toHex(publicKey),
        signature: toHex(signature),
        tok,
      });
    }
  };
}

/*
await fetch('/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tok,
    key: '<public key in hex>',
    sig: '<signature in hex>',
  }),
}).then(res => res.text());
*/
