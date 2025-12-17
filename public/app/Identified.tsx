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

type MailboxListProps = WithStateProps<'identified'> & {
  viewingId?: number;
  onSelect: (mail: MailMetadata) => void;
};
const MailboxList = ({ viewingId, state, onSelect }: MailboxListProps) => {
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
      <div class="p-05">
        {mailbox.mail.length} mail retrieved at{' '}
        {mailbox.retrieved.toLocaleTimeString()}
      </div>
      <div style={{ flex: 1 }}>
        {mailbox.mail.length === 0 && <div class="m-1">No mail.</div>}
        {mailbox.mail.map(m => (
          <div
            class={`row space-between p-05 mail${
              m.id === viewingId ? ' viewing' : ''
            }`}
            key={m.id}
            onClick={() => onSelect(m)}
          >
            <span class="row gap-1">
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
          placeholder="Public key"
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

type ViewOrComposeProps = WithStateProps<'identified'> &
  ComposerProps & {
    view?: MailMetadata;
    setView: (mail?: MailMetadata) => void;
  };
const ViewOrCompose = ({ view, ...props }: ViewOrComposeProps) => {
  return view ? (
    <Viewer {...props} view={view} key={view.id} />
  ) : (
    <Composer {...props} />
  );
};

export const Identified = (props: WithStateProps<'identified'>) => {
  const [view, setView] = useState<MailMetadata>();

  const handleSelect = (mail: MailMetadata) => {
    setView(v => (v === mail ? undefined : mail));
  };

  return (
    <div class="column" style={{ height: '100vh' }}>
      <MailboxList
        {...props}
        viewingId={view?.id}
        onSelect={handleSelect}
        key={JSON.stringify(props)}
      />
      <div class="row fill">
        <ViewOrCompose {...props} {...{ view, setView }} />
      </div>
    </div>
  );
};
