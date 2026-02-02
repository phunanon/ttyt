import { useEffect, useState } from 'preact/hooks';
import { WithStateProps } from './index.js';
import { BodySigHeaders, NonceSigHeaders } from './crypto.js';
import { useViewStore } from './hooks/useViewStore.js';
import { Mail, MailMetadata } from './types.js';
import { deleteMail, fetchAddressBook } from './api.js';

const A = (sec: number) => new Date(sec * 1000).toLocaleString();
const R = (sec: number) => {
  const delta = Math.floor(Date.now() / 1_000) - sec;
  if (delta < 60) return 'this minute';
  if (delta < 3_600) return 'this hour';
  if (delta < 86_400) return 'today';
  return `${Math.ceil(delta / 86_400)} days ago`;
};

type MailboxListProps = WithStateProps<'identified'>;
const MailboxList = ({ state }: MailboxListProps) => {
  const [selected, setSelected] = useState<number[]>([]);
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

  const handleDelete = async (e: Event) => {
    e.stopPropagation();
    const confirmed = confirm(`Delete ${selected.length} mail?`);
    if (!confirmed) return;
    for (const id of selected) {
      const ok = await deleteMail(state, id);
      if (ok) setSelected(selected => selected.filter(i => i !== id));
      setMailbox(box => {
        if (!box) return;
        return { ...box, mail: box.mail.filter(m => m.id !== id) };
      });
    }
    await fetchMail();
  };

  const handleSelect =
    ({ id }: MailMetadata) =>
    (e: Event) => {
      setSelected(selected =>
        selected.includes(id)
          ? selected.filter(i => i !== id)
          : [...selected, id],
      );
      e.stopPropagation();
    };

  if (!mailbox) {
    return <div class="fill p-1">Loading mailbox...</div>;
  }

  const buttons = [
    selected.length ? (
      <button class="sm" onClick={handleDelete}>
        🗑️
      </button>
    ) : null,
  ].filter(x => !!x);

  return (
    <div class="fill column scroll">
      <div class="row gap-05 space-between align-items-center p-05">
        <div class="row gap-1 align-items-center">
          <h1 style={{ marginLeft: '0.5rem' }}>tmail</h1>
          <span class="btn-group">
            <button onClick={() => setView({ view: 'address-book' })}>
              Address book
            </button>
            <button onClick={fetchMail}>Refresh</button>
          </span>
          {!!buttons.length && <span class="btn-group">{buttons}</span>}
        </div>
        <span class="time">
          {mailbox.mail.length} mail retrieved at{' '}
          {mailbox.retrieved.toLocaleTimeString()}
        </span>
      </div>
      <div class="column">
        {mailbox.mail.length === 0 && <div class="m-1">No mail.</div>}
        {mailbox.mail.map(m => {
          const viewingClass = m.id === viewingId ? ' viewing' : '';
          const className = `row gap-05 space-between align-items-center p-05 mail${viewingClass}`;
          const handleClick = () => setView({ view: 'mail', mail: m });
          return (
            <button class={className} key={m.id} onClick={handleClick}>
              <span class="row gap-05 align-items-center no-wrap">
                <input
                  type="checkbox"
                  onClick={handleSelect(m)}
                  checked={selected.includes(m.id)}
                />
                <span class="row gap-1 align-items-center no-wrap">
                  <code>{m.sender.alias.slice(0, 8)}</code>
                  <span class="ellipsis">{m.firstLine}</span>
                </span>
              </span>
              <span class="time">{R(m.createdSec)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

type ComposerProps = WithStateProps<'identified'> & { to?: string };
const Composer = ({ state, ...props }: ComposerProps) => {
  const addressBook = useViewStore(x => x.addressBook);
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
          id="recipient_identity"
          class="fill"
          placeholder="Recipient alias / identity"
          value={to}
          onChange={e => setTo(e.currentTarget.value)}
        />
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
            {addressBook.map(contact => (
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
            <div style={{}}>👥</div>
          </div>
        </div>
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
      <span class="ellipsis" style={{ minWidth: '6rem' }}>
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
      <div class="row gap-05 space-between align-items-center">
        <Contact contact={view.sender} full />
        {mail && <span class="time">{A(mail.createdSec)}</span>}
      </div>
      <pre class="fill">{content}</pre>
    </div>
  );
};

type AddressBookEditorProps = WithStateProps<'identified'> & {};
const AddressBookEditor = ({ state }: AddressBookEditorProps) => {
  const { book, setBook } = useViewStore(x => ({
    book: x.addressBook,
    setBook: x.setAddressBook,
  }));

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
    const book = await fetchAddressBook(state);
    if (book) setBook(book);
  };

  //TODO: handle delete contact
  const rows = book.map(addr => (
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
  const setAddressBook = useViewStore(x => x.setAddressBook);

  useEffect(() => {
    async function fetchAsync() {
      const book = await fetchAddressBook(props.state);
      if (book) setAddressBook(book);
    }
    fetchAsync();
  }, []);

  return (
    <div class="column" style={{ height: '100vh' }}>
      <MailboxList {...props} key={JSON.stringify(props)} />
      <div class="fill card column scroll">
        <BottomPanel {...props} />
      </div>
    </div>
  );
};
