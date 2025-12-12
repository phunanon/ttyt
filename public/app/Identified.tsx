import { useEffect, useState } from 'preact/hooks';
import { WithStateProps } from './index.js';
import { NonceSigHeaders, PubkeyToHex } from './crypto.js';

type Mail = {
  createdSec: number;
  body: string;
  bodySig: string;
  sender: { identity: string };
};

const MailboxList = ({ state }: WithStateProps<'identified'>) => {
  type Mailbox = { retrieved: Date; mail: Mail[] };
  const [mailbox, setMailbox] = useState<Mailbox>();

  useEffect(() => {
    const fetchMail = async () => {
      const identity = PubkeyToHex(state.pubkey);
      const res = await fetch(`/ttyt/v1/mail/${identity}/0/9999999999`, {
        headers: await NonceSigHeaders(state.seckey),
      });
      if (res.status !== 200) {
        alert('Failed to fetch mail:' + res.statusText);
        return;
      }
      const mail = (await res.json()) as Mail[];
      setMailbox({ retrieved: new Date(), mail });
    };
    fetchMail();
  }, []);

  if (!mailbox) {
    return <div>Loading mailbox...</div>;
  }

  return (
    <>
      <div style={{ flex: 1 }}>
        {mailbox.mail.length === 0 && <div class="m-1">No mail.</div>}
        {mailbox.mail.map(m => (
          <div
            key={JSON.stringify(m)}
            style={{
              border: '1px solid black',
              margin: '0.5rem',
              padding: '0.5rem',
            }}
          >
            <div>
              <strong>From:</strong> {m.sender.identity}
            </div>
            <div>
              <strong>At:</strong>{' '}
              {new Date(m.createdSec * 1000).toLocaleString()}
            </div>
            <div>
              <strong>Body:</strong>
              <pre>{m.body}</pre>
            </div>
          </div>
        ))}
      </div>
      <div class="m-1">
        retrieved at {mailbox.retrieved.toLocaleTimeString()}
      </div>
    </>
  );
};

export const Identified = (props: WithStateProps<'identified'>) => {
  return (
    <div class="column" style={{ height: '100vh' }}>
      <MailboxList {...props} />
    </div>
  );
};
