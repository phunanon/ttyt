import { useViewStore } from './hooks/useViewStore';
import { MailPow } from './MailPow';
import { PoWResult } from './PoWorker';

export type SidebarState = {
  kind: 'mail-pow';
  onResult: (result: PoWResult) => void;
};

type SidebarProps = { state: SidebarState };

export const Sidebar = ({ state }: SidebarProps) => {
  const setSidebar = useViewStore(x => x.setSidebar);
  return (
    <div class="sidebar column">
      <div class="fill card column">
        <div class="fill column scroll gap-05">
          {state.kind === 'mail-pow' && <MailPow onResult={state.onResult} />}
        </div>
        <button onClick={() => setSidebar()}>Close</button>
      </div>
    </div>
  );
};
