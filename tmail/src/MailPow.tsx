import { PoWorker, PoWResult } from './PoWorker';

type Props = { onResult: (result: PoWResult) => void };

export const MailPow = ({ onResult }: Props) => {
  return (
    <PoWorker onResult={onResult}>
      {result =>
        result ? (
          <div>You may now send your mail.</div>
        ) : (
          <div>
            You're not in their contacts. If you still want to send mail, your
            browser will have to solve a proof-of-work challenge.
          </div>
        )
      }
    </PoWorker>
  );
};
