import { useCallback } from 'react';
import { STORAGE_KEYS } from '../config';
import { myDonations as seed } from '../data/mock';
import type { MyDonation } from '../types';
import { usePersistedList } from './usePersistedList';

/** The member's donations, saved on the phone until the donations API exists. Newest first. */
export function useMyDonations() {
  const { items, setItems, reload } = usePersistedList<MyDonation>(STORAGE_KEYS.myDonations, seed);
  const add = useCallback((donation: MyDonation) => setItems((list) => [donation, ...list]), [setItems]);
  return { donations: items, add, reload };
}
