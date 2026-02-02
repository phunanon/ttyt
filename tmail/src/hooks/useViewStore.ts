import { BottomPanelView } from '../types';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';

type SetterArg<T> = T | ((value: T) => T);

export type AddressBook = {
  identity: string;
  alias: string;
  addedSec: number;
}[];

type ViewStore = {
  bottom: BottomPanelView;
  addressBook: AddressBook;
  setBottom: (view: SetterArg<BottomPanelView>) => void;
  setAddressBook: (book: AddressBook) => void;
  evictContact: (identity: string) => void;
};

export const useViewStore = createWithEqualityFn<ViewStore>()(
  (set, get) => ({
    bottom: { view: 'compose' },
    addressBook: [],
    setBottom: view => {
      const prev = get().bottom;
      const bottom = typeof view === 'function' ? view(prev) : view;
      if (JSON.stringify(bottom) === JSON.stringify(prev)) {
        set({ bottom: { view: 'compose' } });
      } else {
        set({ bottom });
      }
    },
    setAddressBook: addressBook => set({ addressBook }),
    evictContact: identity =>
      set({
        addressBook: get().addressBook.filter(
          addr => addr.identity !== identity,
        ),
      }),
  }),
  shallow,
);
