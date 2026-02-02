import { useState } from 'preact/hooks';

export const useCheckList = <T>() => {
  const [selected, setSelected] = useState<T[]>([]);

  const evict = (what: T) => {
    setSelected(selected => selected.filter(x => x !== what));
  };

  const toggle = (what: T) => {
    setSelected(selected =>
      selected.includes(what)
        ? selected.filter(i => i !== what)
        : [...selected, what],
    );
  };

  const handleSelect = (what: T) => (e: Event) => {
    toggle(what);
    e.stopPropagation();
  };

  return { selected, evict, toggle, handleSelect };
};
