import { JSX } from 'preact';
import { useState } from 'preact/hooks';
const { max, floor } = Math;

export type PoWResult = {
  nonce: string;
  pkcs8: string;
  publicKey: string;
  signature: string;
};
type Progress = { totalIterations: number; elapsedMs: number } & (
  | {}
  | PoWResult
);

async function PoW(
  nonce: string,
  leadingBits: number,
  handleProgress: (progress: Progress) => void,
): Promise<PoWResult> {
  const workerCode = `
console['log']("Worker started");
const encoded = new TextEncoder().encode('${nonce}');
let iterations = 0;
async function findSignature() {
  while (true) {
    // Generate Ed25519 key pair
    const keyPair = await crypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify']
    );
    // Sign the nonce
    const signature = await crypto.subtle.sign(
      { name: 'Ed25519' },
      keyPair.privateKey,
      encoded
    );
    if (++iterations % 100 === 0) {
      self.postMessage({ iterations });
      iterations = 0;
    }
    const sigArr = new Uint8Array(signature);
    // Compose a 32-bit integer from the first 4 bytes (big-endian)
    const sigInt = (sigArr[0] << 24) | (sigArr[1] << 16) | (sigArr[2] << 8) | sigArr[3];
    if (Math.clz32(sigInt) >= ${leadingBits}) {
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
findSignature();`;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const workers: Worker[] = [];
  const startedAt = Date.now();
  let totalIterations = 0;
  let timer = setInterval(() => {
    handleProgress({ totalIterations, elapsedMs: Date.now() - startedAt });
  }, 500);

  return await new Promise(resolve => {
    function HandleWorkerMessage(e: MessageEvent) {
      if (typeof e.data.iterations === 'number') {
        totalIterations += e.data.iterations;
        return;
      }
      workers.forEach(w => w.terminate());
      clearInterval(timer);
      const { pkcs8, publicKey, signature } = e.data;
      resolve({
        nonce,
        pkcs8: new Uint8Array(pkcs8).toHex(),
        publicKey: new Uint8Array(publicKey).toHex(),
        signature: new Uint8Array(signature).toHex(),
      });
    }

    const workerCount = max(1, (navigator.hardwareConcurrency || 4) - 1);
    for (let i = 0; i < workerCount; ++i) {
      const worker = new Worker(workerUrl);
      workers.push(worker);
      worker.onmessage = HandleWorkerMessage;
    }
  });
}

type WorkerProps = {
  children: (result: false | PoWResult) => JSX.Element;
  onResult?: (result: PoWResult) => void;
};

export const PoWorker = ({ children, onResult }: WorkerProps) => {
  const [progress, setProgress] = useState<Progress>();

  const handleStart = async () => {
    setProgress({ totalIterations: 0, elapsedMs: 0 });
    const nonce = await fetch(`/ttyt/v1/nonce`).then(res => res.text());
    const result = await PoW(nonce, 12, setProgress);
    setProgress(progress => ({
      ...(progress ?? { totalIterations: 0, elapsedMs: 0 }),
      ...result,
    }));
    onResult?.(result);
  };

  return progress ? (
    <div class="column gap-1">
      <div class="info-group">
        <span>
          {'pkcs8' in progress ? 'Completed in ' : ''}
          {floor(progress.elapsedMs / 1000)} seconds
        </span>
        <span>{progress.totalIterations.toLocaleString()} iterations</span>
      </div>
      {'pkcs8' in progress && children(progress)}
    </div>
  ) : (
    <>
      {children(false)}
      <button onClick={handleStart}>Start work</button>
    </>
  );
};
