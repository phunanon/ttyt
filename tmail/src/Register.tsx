import { useState } from 'preact/hooks';
import { WithStateProps } from './index.js';
import { IngestSeckey } from './crypto.js';
import { registerIdentity } from './api.js';
import { PoWorker, PoWResult } from './PoWorker.js';
import { downloadJson } from './utils/download.js';

export const Register = ({ set }: WithStateProps<'register'>) => {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div class="card column gap-05">
        <PoWorker>{RenderPowResult(set)}</PoWorker>
      </div>
    </div>
  );
};

const RenderPowResult =
  (set: WithStateProps<'register'>['set']) => (result: false | PoWResult) => {
    const [reveal, setReveal] = useState(false);

    const handleDownload = (result: PoWResult) => () => {
      const json = JSON.stringify(result, null, 2);
      const ref = prompt('Reference');
      const name = `${window.location.host}-${result.publicKey.slice(0, 8)}-${ref}.json`;
      downloadJson(json, name);
    };

    const handleSubmit = (result: PoWResult) => async () => {
      const { publicKey, nonce, signature, pkcs8 } = result;
      const successful = await registerIdentity(publicKey, nonce, signature);
      if (successful)
        set({ page: 'identified', ...(await IngestSeckey(pkcs8)) });
    };

    if (!result) {
      return (
        <p>
          You may register a TTYT identity with {window.location.host} by your
          browser completing a proof-of-work challenge.
        </p>
      );
    }

    return (
      <div class="column gap-05">
        {reveal ? (
          <>
            <pre>{JSON.stringify(result, null, 2)}</pre>
            <button onClick={() => setReveal(false)}>Hide identity</button>
          </>
        ) : (
          <button onClick={() => setReveal(true)}>Reveal identity</button>
        )}
        <button onClick={handleDownload(result)}>Download identity</button>
        <button onClick={handleSubmit(result)}>Submit identity</button>
      </div>
    );
  };
