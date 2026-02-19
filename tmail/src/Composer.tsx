import { useState } from 'preact/hooks';
import { WithStateProps } from '.';
import { useViewStore } from './hooks/useViewStore';
import { sendMail } from './api';
import { PoWResult } from './PoWorker';

export type ComposerProps = WithStateProps<'identified' | 'anonymous'> & {
  to?: string;
};
export const Composer = ({ state, ...props }: ComposerProps) => {
  const { page, identity } = state;
  const [contacts, setSidebar] = useViewStore(x => [x.contacts, x.setSidebar]);
  const [to, setTo] = useState(props.to ?? '');
  const [body, setBody] = useState('');
  const [pow, setPow] = useState<PoWResult>();

  const handleSend = async () => {
    const nonceSigHeaders = pow
      ? {
          'X-TTYT-PUBKEY': pow.publicKey,
          'X-TTYT-NONCE': pow.nonce,
          'X-TTYT-NONCE-SIG': pow.signature,
        }
      : undefined;
    const status = await sendMail(identity, to, body, nonceSigHeaders);
    if (status === 402) setSidebar({ kind: 'mail-pow', onResult: setPow });
    if (pow) {
      setPow(undefined);
      setSidebar(undefined);
    }
  };

  const contactSelector = page === 'identified' && (
    <div style={{ position: 'relative', display: 'flex' }}>
      <select
        id="contact_list"
        onChange={({ target }) => {
          if (!target) return;
          setTo((target as HTMLSelectElement).value);
        }}
        style={{ appearance: 'none', width: '2rem' }}
      >
        <option></option>
        {contacts.map(contact => (
          <option value={contact.alias}>
            {contact.alias} {contact.identity.slice(contact.alias.length)}
          </option>
        ))}
      </select>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div>👥</div>
      </div>
    </div>
  );

  return (
    <div class="column gap-05 fill">
      <div class="row gap-05">
        <input
          id="recipient_identity"
          class="fill"
          placeholder="Recipient alias / identity"
          value={to}
          onChange={e => setTo(e.currentTarget.value)}
        />
        {contactSelector}
        <button onClick={handleSend}>
          {pow ? 'Send with proof-of-work ✅' : 'Send'}
        </button>
      </div>
      <textarea
        placeholder="Mail body"
        value={body}
        onChange={e => setBody(e.currentTarget.value)}
        class="fill"
      />
    </div>
  );
};
