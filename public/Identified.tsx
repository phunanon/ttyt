import { useEffect, useState } from 'preact/hooks';
import { WithStateProps } from './index.js';
import { BodySigHeaders, NonceSigHeaders } from './crypto.js';

type MailMetadata = {
  id: number;
  createdSec: number;
  sender: string;
  firstLine: string;
};
type Mail = MailMetadata & {
  body: string;
  bodySig: string;
};
type BottomPanelView = 'compose' | 'address-book' | MailMetadata;

type MailboxListProps = WithStateProps<'identified'> & {
  viewingId?: number;
  setView: (view: BottomPanelView) => void;
};
const MailboxList = ({ viewingId, state, setView }: MailboxListProps) => {
  type Mailbox = { retrieved: Date; mail: MailMetadata[] };
  const [mailbox, setMailbox] = useState<Mailbox>();

  useEffect(() => {
    const fetchMail = async () => {
      const res = await fetch(
        `/ttyt/v1/mail/${state.pubkey.hex}/0/9999999999`,
        { headers: await NonceSigHeaders(state.seckey) },
      );
      if (res.status !== 200) {
        alert('Failed to fetch mail: ' + (await res.text()));
        return;
      }
      const mail = (await res.json()) as MailMetadata[];
      setMailbox({ retrieved: new Date(), mail });
    };
    fetchMail();
  }, []);

  if (!mailbox) {
    return <div class="fill p-1">Loading mailbox...</div>;
  }

  return (
    <div class="fill">
      <div class="row space-between">
        <div class="p-05">
          {mailbox.mail.length} mail retrieved at{' '}
          {mailbox.retrieved.toLocaleTimeString()}
        </div>
        <div>
          <button onClick={() => setView('address-book')}>Address book</button>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {mailbox.mail.length === 0 && <div class="m-1">No mail.</div>}
        {mailbox.mail.map(m => (
          <div
            class={`row space-between p-05 mail${
              m.id === viewingId ? ' viewing' : ''
            }`}
            key={m.id}
            onClick={() => setView(m)}
          >
            <span class="row gap-1 align-items-center">
              <code>{m.sender.slice(0, 6)}</code> {m.firstLine}
            </span>
            <span>{new Date(m.createdSec * 1000).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

type ComposerProps = WithStateProps<'identified'> & { to?: string };
const Composer = ({ state, ...props }: ComposerProps) => {
  const [to, setTo] = useState(props.to ?? '');
  const [body, setBody] = useState('');

  const handleSend = async () => {
    const res = await fetch(`/ttyt/v1/mail/${state.pubkey.hex}/${to}`, {
      method: 'PUT',
      headers: await BodySigHeaders(state.seckey, body),
      body,
    });
    alert(`${res.status}: ${await res.text()}`);
  };

  return (
    <div class="column gap-05 fill">
      <div class="row gap-05">
        <input
          class="fill"
          placeholder="Recipient public key"
          value={to}
          onChange={e => setTo(e.currentTarget.value)}
        />
        <button onClick={handleSend}>Send</button>
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

type ViewerProps = WithStateProps<'identified'> & { view: MailMetadata };
const Viewer = ({ state, view }: ViewerProps) => {
  const [mail, setMail] = useState<Mail>();

  useEffect(() => {
    const fetchMail = async () => {
      const res = await fetch(`/ttyt/v1/mail/${state.pubkey.hex}/${view.id}`, {
        headers: await NonceSigHeaders(state.seckey),
      });
      if (res.status !== 200) {
        alert('Failed to fetch mail: ' + (await res.text()));
        return;
      }
      const mail = (await res.json()) as Mail;
      setMail(mail);
    };
    fetchMail();
  }, []);

  const content = mail ? mail.body : <b>Loading...</b>;
  return (
    <pre class="fill column gap-1">
      <b>From: {view.sender}</b>
      {content}
    </pre>
  );
};

const AddressBookEditor = ({ state }: WithStateProps<'identified'>) => {
  type AddressBook = { identity: string; addedSec: number }[];
  const [addressBook, setAddressBook] = useState<AddressBook>();

  useEffect(() => {
    const fetchAddressBook = async () => {
      const res = await fetch(`/ttyt/v1/address-book/${state.pubkey.hex}`, {
        headers: await NonceSigHeaders(state.seckey),
      });
      if (res.status !== 200) {
        alert('Failed to fetch address book: ' + (await res.text()));
        return;
      }
      const addressBook = (await res.json()) as AddressBook;
      setAddressBook(addressBook);
    };
    fetchAddressBook();
  }, []);

  if (!addressBook) {
    return <div class="fill p-1">Loading address book...</div>;
  }

  const rows = addressBook.map(a => (
    <div class="row space-between align-items-center gap-05 px-05">
      <code class="ellipsis fill">{a.identity}</code>
      {new Date(a.addedSec * 1_000).toLocaleString()}
      <button class="sm">🗑</button>
    </div>
  ));

  return <div class="column fill gap-05">{rows}</div>;
};

type BottomPanelProps = WithStateProps<'identified'> &
  ComposerProps & {
    view: BottomPanelView;
    setView: (view: BottomPanelView) => void;
  };
const BottomPanel = ({ view, ...props }: BottomPanelProps) => {
  if (typeof view === 'object')
    return <Viewer {...props} view={view} key={view.id} />;
  if (view === 'compose') return <Composer {...props} />;
  return <AddressBookEditor {...props} />;
};

export const Identified = (props: WithStateProps<'identified'>) => {
  const [view, setView] = useState<BottomPanelView>('compose');

  const handleSelect = (view: BottomPanelView) => {
    setView(v => (v === view ? 'compose' : view));
  };

  return (
    <div class="column" style={{ height: '100vh'}}>
      <MailboxList
        {...props}
        viewingId={typeof view === 'object' ? view.id : undefined}
        setView={handleSelect}
        key={JSON.stringify(props)}
      />
      <div class="row fill">
        <BottomPanel {...props} {...{ view, setView }} />
      </div>
    </div>
  );
};
