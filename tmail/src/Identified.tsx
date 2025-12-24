import { useEffect, useState } from 'preact/hooks';
import { WithStateProps } from './index.js';
import { BodySigHeaders, NonceSigHeaders } from './crypto.js';
import { useViewStore } from './hooks/useViewStore.js';
import { Mail, MailMetadata } from './types.js';

type MailboxListProps = WithStateProps<'identified'>;
const MailboxList = ({ state }: MailboxListProps) => {
  const viewingId = useViewStore(x =>
    x.bottom.view === 'mail' ? x.bottom.mail.id : undefined,
  );
  const setView = useViewStore(x => x.setBottom);

  type Mailbox = { retrieved: Date; mail: MailMetadata[] };
  const [mailbox, setMailbox] = useState<Mailbox>();

  const fetchMail = async () => {
    const res = await fetch(`/ttyt/v1/mail/${state.pubkey.hex}/0/9999999999`, {
      headers: await NonceSigHeaders(state.seckey),
    });
    if (res.status !== 200) {
      alert('Failed to fetch mail: ' + (await res.text()));
      return;
    }
    const mail = (await res.json()) as MailMetadata[];
    setMailbox({ retrieved: new Date(), mail });
  };

  useEffect(() => {
    fetchMail();
  }, []);

  if (!mailbox) {
    return <div class="fill p-1">Loading mailbox...</div>;
  }

  return (
    <div class="fill column scroll">
      <div class="row gap-05 space-between align-items-center p-05">
        <div class="row gap-1 align-items-center">
          <h1 style={{ marginLeft: '1rem' }}>tmail</h1>
          <span class="btn-group">
            <button onClick={() => setView({ view: 'address-book' })}>
              Address book
            </button>
            <button onClick={fetchMail}>Refresh</button>
          </span>
        </div>
        <span>
          {mailbox.mail.length} mail retrieved at{' '}
          {mailbox.retrieved.toLocaleTimeString()}
        </span>
      </div>
      <div class="column">
        {mailbox.mail.length === 0 && <div class="m-1">No mail.</div>}
        {mailbox.mail.map(m => (
          <button
            class={`row gap-05 space-between p-05 mail${
              m.id === viewingId ? ' viewing' : ''
            }`}
            key={m.id}
            onClick={() => setView({ view: 'mail', mail: m })}
          >
            <span class="row gap-1 align-items-center">
              <code>
                <u>{m.sender.alias}</u>
              </code>{' '}
              {m.firstLine}
            </span>
            <span>{new Date(m.createdSec * 1000).toLocaleString()}</span>
          </button>
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
          placeholder="Recipient alias / identity"
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

type ContactProps = {
  contact: { identity: string; alias: string };
  full?: boolean;
  className?: string;
};
const Contact = ({ contact, full, className }: ContactProps) => {
  const setView = useViewStore(x => x.setBottom);

  const handleCopy = () => {
    navigator.clipboard.writeText(contact.identity);
    alert('Copied to clipboard');
  };

  const handleCompose = () => {
    setView({ view: 'compose', to: contact.alias });
  };

  return (
    <code class={`row-inline gap-05 align-items-center ${className ?? ''}`}>
      <span class="btn-group">
        <button onClick={handleCopy}>📄</button>
        <button onClick={handleCompose}>📨</button>
      </span>
      <span class="ellipsis">
        <u>{contact.alias}</u>
        <span style={{ color: '#eee' }}>
          {full && contact.identity.slice(contact.alias.length)}
        </span>
      </span>
    </code>
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
  }, [view.id]);

  const content = mail ? mail.body : <b>Loading...</b>;
  return (
    <div class="column fill gap-05">
      <Contact contact={view.sender} full />
      <pre class="fill">{content}</pre>
    </div>
  );
};

type AddressBookEditorProps = WithStateProps<'identified'> & {};
const AddressBookEditor = ({ state }: AddressBookEditorProps) => {
  type AddressBook = { identity: string; alias: string; addedSec: number }[];
  const [addressBook, setAddressBook] = useState<AddressBook>();

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

  useEffect(() => {
    fetchAddressBook();
  }, []);

  if (!addressBook) {
    return <div class="fill p-1">Loading address book...</div>;
  }

  const handleNewContact = async () => {
    const contact = prompt('Enter contact alias / identity');
    if (!contact) return;
    const res = await fetch(
      `/ttyt/v1/address-book/${state.pubkey.hex}/${contact}`,
      {
        method: 'PUT',
        headers: await NonceSigHeaders(state.seckey),
      },
    );
    if (res.status !== 201) {
      alert('Failed to add to address book: ' + (await res.text()));
      return;
    }
    await fetchAddressBook();
  };

  //TODO: handle delete contact
  const rows = addressBook.map(addr => (
    <div class="row space-between align-items-center gap-05">
      <Contact contact={addr} className="fill" full />
      {new Date(addr.addedSec * 1_000).toLocaleString()}
      <button class="sm">🗑️</button>
    </div>
  ));

  return (
    <div class="column fill gap-05">
      <span>
        <button onClick={handleNewContact}>Add new contact</button>
      </span>
      {rows}
    </div>
  );
};

type BottomPanelProps = WithStateProps<'identified'> & ComposerProps;
const BottomPanel = (props: BottomPanelProps) => {
  const view = useViewStore(x => x.bottom);
  if (view.view === 'mail') return <Viewer {...props} view={view.mail} />;
  if (view.view === 'compose') return <Composer {...props} to={view.to} />;
  if (view.view === 'address-book') return <AddressBookEditor {...props} />;
  return '???';
};

export const Identified = (props: WithStateProps<'identified'>) => {
  return (
    <div class="column" style={{ height: '100vh' }}>
      <MailboxList {...props} key={JSON.stringify(props)} />
      <div class="fill card column scroll">
        <BottomPanel {...props} />
      </div>
    </div>
  );
};
