import { create } from 'zustand';
import { BottomPanelView } from '../types';

type SetterArg<T> = T | ((value: T) => T);

type ViewStore = {
  bottom: BottomPanelView;
  setBottom: (view: SetterArg<BottomPanelView>) => void;
};

export const useViewStore = create<ViewStore>()((set, get) => ({
  bottom: { view: 'compose' },
  setBottom: view => {
    const prev = get().bottom;
    const bottom = typeof view === 'function' ? view(prev) : view;
    if (JSON.stringify(bottom) === JSON.stringify(prev)) {
      set({ bottom: { view: 'compose' } });
    } else {
      set({ bottom });
    }
  },
}));
