import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { BottomPanelView } from '../types';
import { SidebarState } from '../Sidebar';

type SetterArg<T> = T | ((value: T) => T);

export type Contacts = {
  identity: string;
  alias: string;
  addedSec: number;
}[];

type ViewStore = {
  bottom: BottomPanelView;
  contacts: Contacts;
  sidebar?: SidebarState;
  setBottom: (view: SetterArg<BottomPanelView>) => void;
  setContacts: (contacts: Contacts) => void;
  setSidebar: (sidebar?: SidebarState) => void;
  evictContact: (identity: string) => void;
};

export const useViewStore = createWithEqualityFn<ViewStore>()(
  (set, get) => ({
    bottom: { view: 'compose' },
    contacts: [],
    setBottom: view => {
      const prev = get().bottom;
      const bottom = typeof view === 'function' ? view(prev) : view;
      if (JSON.stringify(bottom) === JSON.stringify(prev)) {
        set({ bottom: { view: 'compose' } });
      } else {
        set({ bottom });
      }
    },
    setContacts: contacts => set({ contacts }),
    evictContact: identity =>
      set({
        contacts: get().contacts.filter(
          contact => contact.identity !== identity,
        ),
      }),
    setSidebar: sidebar => set({ sidebar }),
  }),
  shallow,
);
