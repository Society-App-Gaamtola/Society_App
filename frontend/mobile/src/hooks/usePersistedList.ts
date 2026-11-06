import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** A list kept in AsyncStorage. Shows `seed` until something has been saved. */
export function usePersistedList<T>(storageKey: string, seed: T[]) {
  const [items, setItems] = useState<T[]>([]);
  // The list as last read or written, so storage is only touched when it really changes.
  const stored = useRef<T[] | null>(null);

  const readSaved = useCallback(async () => {
    const raw = await AsyncStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T[]) : seed;
  }, [storageKey, seed]);

  const apply = useCallback((list: T[]) => {
    stored.current = list;
    setItems(list);
  }, []);

  useEffect(() => {
    readSaved().catch(() => seed).then(apply);
  }, [readSaved, seed, apply]);

  useEffect(() => {
    if (stored.current === null || stored.current === items) return;
    stored.current = items;
    AsyncStorage.setItem(storageKey, JSON.stringify(items)).catch(() => {});
  }, [items, storageKey]);

  /** Re-reads saved items; keeps what is on screen if that fails. */
  const reload = useCallback(async () => {
    try {
      apply(await readSaved());
    } catch {
      // Keep what is on screen.
    }
  }, [readSaved, apply]);

  return { items, setItems, reload };
}
