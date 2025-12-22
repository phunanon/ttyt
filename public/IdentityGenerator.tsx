import { useState } from 'preact/hooks';
import { WithStateProps } from './index.js';
import { IngestSeckey } from './crypto.js';

const { max } = Math;

type PoWResult = {
  nonce: string;
  pkcs8: string;
  publicKey: string;
  signature: string;
};
type Progress = { totalIterations: number; elapsedMs: number } | PoWResult;

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
    iterations++;
    if (iterations % 500 === 0) {
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
  }, 1_000);

  return await new Promise(resolve => {
    function HandleWorkerMessage(e: MessageEvent) {
      if (typeof e.data.iterations === 'number') {
        totalIterations += e.data.iterations;
        return;
      }
      workers.forEach(w => w.terminate());
      clearInterval(timer);
      const { pkcs8, publicKey, signature } = e.data;
      //TODO: replace with Uint8Array.toHex
      const toHex = (arr: number[]) =>
        arr.map(b => b.toString(16).padStart(2, '0')).join('');
      resolve({
        nonce,
        pkcs8: toHex(pkcs8),
        publicKey: toHex(publicKey),
        signature: toHex(signature),
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

type ProgressPanelProps = {
  progress: Progress;
  set: WithStateProps<'generate'>['set'];
};

const ProgressPanel = ({ progress, set }: ProgressPanelProps) => {
  const [pkcs8, setPkcs8] = useState<string>();

  const handleProceed = (pkcs8: string) => async () =>
    set({ page: 'identified', ...(await IngestSeckey(pkcs8)) });

  if (pkcs8) {
    return (
      <div class="column gap-05">
        Submitted!
        <button onClick={handleProceed(pkcs8)}>
          Proceed with this identity.
        </button>
      </div>
    );
  }

  const handleSubmit = (result: PoWResult) => async () => {
    const res = await fetch(`/ttyt/v1/identity/${result.publicKey}`, {
      method: 'PUT',
      headers: {
        'X-TTYT-NONCE': result.nonce,
        'X-TTYT-NONCE-SIG': result.signature,
      },
    });
    if (res.status === 201) {
      setPkcs8(result.pkcs8);
    } else {
      alert(`Failed to submit identity: ${res.status} ${await res.text()}`);
    }
  };

  const submitButton = 'pkcs8' in progress && (
    <button onClick={handleSubmit(progress)}>Submit Identity</button>
  );
  return (
    <div class="column gap-1">
      <pre>{JSON.stringify(progress, null, 2)}</pre>
      {submitButton}
    </div>
  );
};

export const IdentityGenerator = ({ set }: WithStateProps<'generate'>) => {
  const [progress, setProgress] = useState<Progress>();

  const handleStart = async () => {
    setProgress({ totalIterations: 0, elapsedMs: 0 });
    const nonce = await fetch(`/ttyt/v1/nonce`).then(res => res.text());
    const result = await PoW(nonce, 12, setProgress);
    setProgress(result);
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {progress ? (
        <ProgressPanel progress={progress} set={set} />
      ) : (
        <button onClick={handleStart}>Start work</button>
      )}
    </div>
  );
};
