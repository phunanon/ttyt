import { render } from 'preact';
import { useState } from 'preact/hooks';
import { IdentityGenerator } from './IdentityGenerator.js';
import { Identified } from './Identified.js';
import { IngestSeckey } from './crypto.js';

export type State =
  | { page: 'greeter' }
  | { page: 'generate' }
  | { page: 'identified'; seckey: Seckey; pubkey: Pubkey };
export type WithStateProps<T extends State['page']> = {
  state: Extract<State, { page: T }>;
  set: (s: State) => void;
};

const Greeter = ({ set }: WithStateProps<'greeter'>) => {
  const [typedPk, setTypedPk] = useState('');
  const onSubmitPk = async (pkHex: string) => {
    set({ page: 'identified', ...(await IngestSeckey(pkHex)) });
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
      <div class="column gap-05">
        <div class="row">
          <input
            type="password"
            placeholder="Ed25519 private key"
            style={{ padding: '0.5rem', fontSize: '1rem' }}
            autofocus
            value={typedPk}
            onInput={e => setTypedPk(e.currentTarget.value)}
            onKeyDown={e => e.key === 'Enter' && onSubmitPk(typedPk)}
          />
          <button onClick={() => onSubmitPk(typedPk)}>➡️</button>
        </div>
        <button onClick={() => set({ page: 'generate' })}>
          Alternatively, generate key
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [state, setState] = useState<State>({ page: 'greeter' });
  return (
    <>
      {state.page === 'greeter' && <Greeter state={state} set={setState} />}
      {state.page === 'identified' && (
        <Identified state={state} set={setState} />
      )}
      {state.page === 'generate' && (
        <IdentityGenerator state={state} set={setState} />
      )}
    </>
  );
};

render(<App />, document.body);
