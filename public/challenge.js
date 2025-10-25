const workerCount = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
let found = false;
let iterations = 0;

const workerCode = (tok, zeroes) => `
  console.log("Worker started");
  const token = '${tok}';
  const encoded = new TextEncoder().encode(token);
  const LEADING_ZERO_BITS = ${zeroes};
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

const q = (c, s) => c.querySelector(s);

function StartWork() {
  const { statusDisplay, tok, zeroes } = (() => {
    const form = q(document, '#token-form');
    const fieldSet = q(form, '#token-fieldset');
    fieldSet.disabled = true;
    const statusDisplay = q(document, '#status');
    const tokInput = q(form, '[placeholder="token"]');
    const zeroesInput = q(form, '[placeholder="leading zero bits"]');
    const tok = tokInput.value.trim();
    const zeroes = parseInt(zeroesInput.value.trim(), 10);
    return { statusDisplay, tok, zeroes };
  })();
  const code = workerCode(tok, zeroes);
  const blob = new Blob([code], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const workers = [];
  const startedAt = Date.now();
  let totalIterations = 0;
  let timer = setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1_000;
    const speed = Math.floor(totalIterations / elapsed);
    const text = `Number of workers: ${workerCount}
Total iterations:  ${totalIterations.toLocaleString()}≤
Elapsed time:      ${Math.floor(elapsed)}s
Speed:             ${speed.toLocaleString()} iterations/s`;
    statusDisplay.textContent = text;
  }, 1_000);

  for (let i = 0; i < workerCount; ++i) {
    const worker = new Worker(workerUrl);
    workers.push(worker);
    worker.onmessage = e => {
      if (e.data && typeof e.data.iterations === 'number') {
        totalIterations += e.data.iterations;
      } else if (!found && e.data && e.data.pkcs8 && e.data.signature) {
        found = true;
        workers.forEach(w => w.terminate());
        clearInterval(timer);
        const { pkcs8, publicKey, signature } = e.data;
        const toHex = arr =>
          arr.map(b => b.toString(16).padStart(2, '0')).join('');
        const proofForm = q(document, '#proof-form');
        q(proofForm, '[name="tok"]').value = tok;
        q(proofForm, '[name="key"]').value = toHex(publicKey);
        q(proofForm, '[name="sig"]').value = toHex(signature);
        q(document, '#proof-fieldset').disabled = false;
        const privateKeyDisplay = q(document, '#private-key');
        privateKeyDisplay.textContent = `Private key, in PKCS8 format:
${toHex(pkcs8)}`;
      }
    };
  }
}

async function PostProof(endpoint) {
  const form = q(document, '#proof-form');
  const formData = new FormData(form);
  const body = JSON.stringify(Object.fromEntries(formData));
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).then(res => res.text());
  const responseDisplay = q(document, '#response');
  responseDisplay.textContent = response;
}
