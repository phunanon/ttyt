import { render } from 'preact';
import { useState } from 'preact/hooks';
import { Register } from './Register.js';
import { Identified } from './Identified.js';
import { Anonymous } from './Anonymous.js';
import { IngestSeckey } from './crypto.js';
import { useViewStore } from './hooks/useViewStore.js';
import { Sidebar } from './Sidebar.js';

export type State =
  | { page: 'greeter' }
  | { page: 'register' }
  | { page: 'generate' }
  | { page: 'anonymous'; identity: Keys; pkcs8Hex: string }
  | { page: 'identified'; identity: Keys };
export type WithStateProps<T extends State['page']> = {
  state: Extract<State, { page: T }>;
  set: (s: State) => void;
};

type PkInputProps = { id: string; onSubmit: (pk: string) => Promise<void> };
const PkInput = ({ id, onSubmit }: PkInputProps) => {
  const [typedPk, setTypedPk] = useState('');
  return (
    <div class="row input-group">
      <input
        id={id}
        type="password"
        class="fill"
        placeholder="Ed25519 private key (hex)"
        style={{ padding: '0.5rem', fontSize: '1rem' }}
        autofocus
        value={typedPk}
        onInput={e => setTypedPk(e.currentTarget.value)}
        onKeyDown={e => e.key === 'Enter' && onSubmit(typedPk)}
      />
      <button onClick={() => onSubmit(typedPk)}>➡️</button>
    </div>
  );
};

const Greeter = ({ set }: WithStateProps<'greeter'>) => {
  const ingestRegistered = async (pkHex: string) => {
    set({ page: 'identified', ...(await IngestSeckey(pkHex)) });
  };
  const ingestAnonymous = async (pkcs8Hex: string) => {
    set({ page: 'anonymous', ...(await IngestSeckey(pkcs8Hex)), pkcs8Hex });
  };
  const generateAnonymous = async () => {
    const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
      'sign',
      'verify',
    ]);
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const pkcs8Hex = new Uint8Array(pkcs8).toHex();
    set({ page: 'anonymous', ...(await IngestSeckey(pkcs8Hex)), pkcs8Hex });
  };

  const instanceCard = (
    <div class="column gap-05 card">
      <p>Use this client for {window.location.host}</p>
      <PkInput id="registered_pk" onSubmit={ingestRegistered} />
      <button onClick={() => set({ page: 'register' })}>
        Register an identity
      </button>
      <a href="/ttyt/v1">About this TTYT instance</a>
    </div>
  );

  const anonCard = (
    <div class="column gap-05 card">
      <p>Use this client anonymously</p>
      <PkInput id="anonymous_pk" onSubmit={ingestAnonymous} />
      <button onClick={generateAnonymous}>
        Generate an anonymous identity
      </button>
    </div>
  );

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div class="column">
        {instanceCard}
        {anonCard}
      </div>
    </div>
  );
};

const App = () => {
  const [state, set] = useState<State>({ page: 'greeter' });
  const sidebar = useViewStore(x => x.sidebar);
  return (
    <>
      <div class={`content ${sidebar ? 'has-sidebar' : ''}`}>
        {state.page === 'greeter' && <Greeter {...{ state, set }} />}
        {state.page === 'identified' && <Identified {...{ state, set }} />}
        {state.page === 'anonymous' && <Anonymous {...{ state, set }} />}
        {state.page === 'register' && <Register {...{ state, set }} />}
      </div>
      {sidebar && <Sidebar state={sidebar} />}
    </>
  );
};

render(<App />, document.body);
