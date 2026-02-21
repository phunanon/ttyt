import { useEffect, useState } from 'preact/hooks';
import { WithStateProps } from './index.js';
import { NonceSigHeaders } from './crypto.js';
import { useViewStore } from './hooks/useViewStore.js';
import { Mail, MailMetadata } from './types.js';
import { deleteContact, deleteMail, fetchContacts } from './api.js';
import { fetchMailById, fetchAllMail } from './api.js';
import { useCheckList } from './hooks/useCheckList.js';
import { Composer, ComposerProps } from './Composer.js';
import { Header } from './Header.js';

const A = (sec: number) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeStyle: 'long',
  }).format(new Date(sec * 1000));
const R = (sec: number) => {
  const delta = Math.floor(Date.now() / 1_000) - sec;
  if (delta < 60) return 'this minute';
  if (delta < 3_600) return 'this hour';
  if (delta < 86_400) return 'today';
  return `${Math.ceil(delta / 86_400)} days ago`;
};

type MailboxListProps = WithStateProps<'identified'>;
const MailboxList = ({ state }: MailboxListProps) => {
  const { selected, evict, handleSelect, toggleAll } = useCheckList<number>();
  const viewingId = useViewStore(x =>
    x.bottom.view === 'mail' ? x.bottom.mail.id : undefined,
  );
  const setView = useViewStore(x => x.setBottom);

  type Mailbox = { retrieved: Date; mail: MailMetadata[] };
  const [mailbox, setMailbox] = useState<Mailbox>();

  const fetchMail = async () => {
    const mail = await fetchAllMail(state.identity);
    if (mail) setMailbox({ retrieved: new Date(), mail });
  };
  useEffect(() => void fetchMail(), []);

  const handleDelete = async (e: Event) => {
    e.stopPropagation();
    const confirmed = confirm(`Delete ${selected.length} mail?`);
    if (!confirmed) return;
    for (const id of selected) {
      const ok = await deleteMail(state.identity, id);
      if (!ok) continue;
      evict(id);
      setMailbox(box => {
        if (!box) return;
        return { ...box, mail: box.mail.filter(m => m.id !== id) };
      });
    }
  };

  if (!mailbox) {
    return <div class="fill p-1">Loading mailbox...</div>;
  }

  const headerButtons = (
    <>
      <span class="btn-group">
        <button onClick={() => setView({ view: 'contacts' })}>Contacts</button>
        <button onClick={fetchMail}>Refresh</button>
      </span>
      {!!selected.length && (
        <>
          <button class="sm" onClick={handleDelete}>
            🗑️
          </button>
          <div class="row gap-05">
            <input
              type="checkbox"
              onClick={toggleAll(mailbox.mail.map(x => x.id))}
              checked={selected.length === mailbox.mail.length}
            />
            All
          </div>
        </>
      )}
    </>
  );
  const headerAfter = (
    <span class="time">
      {mailbox.mail.length} mail retrieved at{' '}
      {mailbox.retrieved.toLocaleTimeString()}
    </span>
  );

  return (
    <div class="fill column scroll">
      <Header buttons={headerButtons} after={headerAfter} />
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
                  onClick={handleSelect(m.id)}
                  checked={selected.includes(m.id)}
                />
                <span
                  class="row gap-1 align-items-center no-wrap"
                  style={{ minWidth: 0 }}
                >
                  <span style={{ minWidth: '5.5rem', textAlign: 'left' }}>
                    <Identity contact={m} len={8} full />
                  </span>
                  <span class="ellipsis">{m.firstLine}</span>
                </span>
              </span>
              <span class="time">{R(m.sentSec)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

type IdentityProps = {
  contact: { identity: string; alias?: string };
  full?: boolean;
  len?: number;
};
const Identity = ({ contact, full, len }: IdentityProps) => {
  const alias = (contact.alias ?? '').slice(0, len);
  const rest = contact.identity.slice(alias.length, len);
  return (
    <>
      {alias && <u class="code">{alias}</u>}
      <span style={{ color: '#eee' }} class="code">
        {full && rest}
      </span>
    </>
  );
};

type ContactProps = IdentityProps & { you: string; className?: string };
const Contact = ({ you, contact, className, ...props }: ContactProps) => {
  const setView = useViewStore(x => x.setBottom);

  const handleCopy = () => {
    navigator.clipboard.writeText(contact.identity);
    alert('Copied to clipboard');
  };

  const handleCompose = () => {
    setView({ view: 'compose', to: contact.alias ?? contact.identity });
  };

  return (
    <code class={`row-inline gap-05 align-items-center ${className ?? ''}`}>
      <span class="btn-group">
        <button onClick={handleCopy}>📄</button>
        <button onClick={handleCompose}>📨</button>
      </span>
      <span class="ellipsis" style={{ minWidth: '6rem' }}>
        <Identity {...{ contact, ...props }} />
        {you === contact.identity ? ' (you)' : null}
      </span>
    </code>
  );
};

type ViewerProps = WithStateProps<'identified'> & { view: MailMetadata };
const Viewer = ({ state, view }: ViewerProps) => {
  const { identity } = state;
  const [mail, setMail] = useState<Mail>();

  useEffect(() => {
    const fetchMail = async () => {
      const mail = await fetchMailById(identity, view.id);
      if (mail) setMail(mail);
    };
    fetchMail();
  }, [view.id]);

  const content = mail ? mail.body : <b>Loading...</b>;
  return (
    <div class="column fill gap-05">
      <div class="row gap-05 space-between align-items-center">
        <Contact
          you={identity.pubkey.hex}
          contact={{ identity: view.identity, alias: view.alias }}
          full
        />
        {mail && <span class="time">{A(mail.sentSec)}</span>}
      </div>
      <pre class="fill">{content}</pre>
    </div>
  );
};

type ContactsEditorProps = WithStateProps<'identified'> & {};
const ContactsEditor = ({ state }: ContactsEditorProps) => {
  const { identity } = state;
  const { contacts, setContacts, evictContact } = useViewStore(x => ({
    contacts: x.contacts,
    setContacts: x.setContacts,
    evictContact: x.evictContact,
  }));
  const { selected, evict, handleSelect } = useCheckList<string>();

  const handleNewContact = async () => {
    const contact = prompt('Enter contact alias / identity');
    if (!contact) return;
    const res = await fetch(
      `/ttyt/v1/contacts/${identity.pubkey.hex}/${contact}`,
      {
        method: 'PUT',
        headers: await NonceSigHeaders(identity.seckey),
      },
    );
    if (res.status !== 201) {
      alert('Failed to add to contacts: ' + (await res.text()));
      return;
    }
    setTimeout(async () => {
      const contacts = await fetchContacts(identity);
      if (contacts) setContacts(contacts);
    }, 1_500);
  };

  const handleDelete = async () => {
    const confirmed = confirm(`Delete ${selected.length} contact(s)?`);
    if (!confirmed) return;
    for (const id of selected) {
      const ok = await deleteContact(identity, id);
      if (!ok) continue;
      evict(id);
      evictContact(id);
    }
  };

  const buttons = [
    selected.length ? (
      <button class="sm" onClick={handleDelete}>
        🗑️
      </button>
    ) : null,
  ].filter(x => !!x);

  const rows = contacts.map(contact => (
    <div class="row space-between align-items-center gap-05">
      <input
        type="checkbox"
        onClick={handleSelect(contact.identity)}
        checked={selected.includes(contact.identity)}
      />
      <Contact
        you={identity.pubkey.hex}
        contact={contact}
        className="fill"
        full
      />
      {new Date(contact.addedSec * 1_000).toLocaleString()}
    </div>
  ));

  return (
    <div class="column fill gap-05">
      <span class="row gap-05 align-items-center">
        <button onClick={handleNewContact}>Add new contact</button>
        {!!buttons.length && <div class="btn-group">{buttons}</div>}
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
  if (view.view === 'contacts') return <ContactsEditor {...props} />;
  return '???';
};

export const Identified = (props: WithStateProps<'identified'>) => {
  const setContacts = useViewStore(x => x.setContacts);

  useEffect(() => {
    async function fetchAsync() {
      const contacts = await fetchContacts(props.state.identity);
      if (contacts) setContacts(contacts);
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
