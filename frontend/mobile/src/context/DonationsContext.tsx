import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../config';
import { SEED_DONATIONS } from '../data/seeds';
import { usePersistedList } from '../hooks/usePersistedList';
import { createId } from '../utils/format';
import type { Donation, NewDonation } from '../types';

type DonationsContextValue = {
  donations: Donation[];
  addDonation: (d: NewDonation) => Donation;
  updateDonation: (id: string, changes: Partial<NewDonation>) => void;
  removeDonation: (id: string) => void;
  /** Re-reads saved donations from storage. */
  reload: () => Promise<void>;
};

const DonationsContext = createContext<DonationsContextValue | null>(null);

export function DonationsProvider({ children }: { children: ReactNode }) {
  const { items: donations, setItems, reload } = usePersistedList(STORAGE_KEYS.donations, SEED_DONATIONS);

  const addDonation = useCallback(
    (d: NewDonation) => {
      const created: Donation = { ...d, id: createId('d') };
      setItems((list) => [created, ...list]);
      return created;
    },
    [setItems],
  );

  const updateDonation = useCallback(
    (id: string, changes: Partial<NewDonation>) => {
      setItems((list) => list.map((d) => (d.id === id ? { ...d, ...changes } : d)));
    },
    [setItems],
  );

  const removeDonation = useCallback(
    (id: string) => {
      setItems((list) => list.filter((d) => d.id !== id));
    },
    [setItems],
  );

  const value = useMemo(
    () => ({ donations, addDonation, updateDonation, removeDonation, reload }),
    [donations, addDonation, updateDonation, removeDonation, reload],
  );

  return <DonationsContext.Provider value={value}>{children}</DonationsContext.Provider>;
}

export function useDonations() {
  const ctx = useContext(DonationsContext);
  if (!ctx) throw new Error('useDonations must be used inside DonationsProvider');
  return ctx;
}
