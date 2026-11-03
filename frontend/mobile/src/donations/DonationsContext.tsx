import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
export type DonationStatus = 'Verified' | 'Pending' | 'Draft';
export type DonationPurpose = 'Festival' | 'Aarti' | 'Cultural' | 'General Fund' | 'Other';

export type Donation = {
  id: string;
  donorName: string;
  memberId: string;
  /** ISO date-time of the donation. */
  date: string;
  mode: PaymentMode;
  amount: number;
  status: DonationStatus;
  reference?: string;
  purpose?: DonationPurpose;
  note?: string;
  receipt?: { name: string; uri: string; mimeType?: string };
};

export type NewDonation = Omit<Donation, 'id'>;

type DonationsContextValue = {
  donations: Donation[];
  loaded: boolean;
  addDonation: (d: NewDonation) => Donation;
  updateDonation: (id: string, changes: Partial<NewDonation>) => void;
  removeDonation: (id: string) => void;
  /** Re-reads saved donations from storage. */
  reload: () => Promise<void>;
};

const SEED: Donation[] = [
  { id: 'd-seed-1', donorName: 'Dhaval Patel', memberId: 'GM001', date: '2026-10-12T10:30:00', mode: 'UPI', amount: 1001, status: 'Verified' },
  { id: 'd-seed-2', donorName: 'Sejal Kothari', memberId: 'GM003', date: '2026-10-11T17:45:00', mode: 'Cash', amount: 501, status: 'Verified' },
  { id: 'd-seed-3', donorName: 'Ramesh Patel', memberId: 'GM018', date: '2026-10-10T16:20:00', mode: 'Bank Transfer', amount: 2500, status: 'Pending' },
  { id: 'd-seed-4', donorName: 'Ketan Thakkar', memberId: 'GM045', date: '2026-10-10T09:15:00', mode: 'UPI', amount: 1101, status: 'Verified' },
  { id: 'd-seed-5', donorName: 'Pooja Gandhi', memberId: 'GM032', date: '2026-10-10T14:10:00', mode: 'Cash', amount: 251, status: 'Verified' },
];

const DonationsContext = createContext<DonationsContextValue | null>(null);

const readSaved = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.donations);
  return raw ? (JSON.parse(raw) as Donation[]) : SEED;
};

export function DonationsProvider({ children }: { children: ReactNode }) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    readSaved()
      .catch(() => SEED)
      .then(setDonations)
      .finally(() => setLoaded(true));
  }, []);

  // Persist after the first load so the seed is not written over saved data.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.donations, JSON.stringify(donations)).catch(() => {});
  }, [donations, loaded]);

  const addDonation = useCallback((d: NewDonation) => {
    const created: Donation = { ...d, id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    setDonations((list) => [created, ...list]);
    return created;
  }, []);

  const updateDonation = useCallback((id: string, changes: Partial<NewDonation>) => {
    setDonations((list) => list.map((d) => (d.id === id ? { ...d, ...changes } : d)));
  }, []);

  const removeDonation = useCallback((id: string) => {
    setDonations((list) => list.filter((d) => d.id !== id));
  }, []);

  const reload = useCallback(async () => {
    try {
      setDonations(await readSaved());
    } catch {
      // Keep what is on screen.
    }
  }, []);

  const value = useMemo(
    () => ({ donations, loaded, addDonation, updateDonation, removeDonation, reload }),
    [donations, loaded, addDonation, updateDonation, removeDonation, reload],
  );

  return <DonationsContext.Provider value={value}>{children}</DonationsContext.Provider>;
}

export function useDonations() {
  const ctx = useContext(DonationsContext);
  if (!ctx) throw new Error('useDonations must be used inside DonationsProvider');
  return ctx;
}
