import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';
import { useAuth } from '../auth/AuthContext';
import type { EventCategory } from '../data/mock';

export type ExecEventStatus = 'Draft' | 'Posted' | 'Scheduled' | 'Needs Approval';

export type ExecEvent = {
  id: string;
  ownerId: string;
  title: string;
  /** Display date, e.g. "10 Oct 2026". */
  date: string;
  /** Optional last day for multi-day events. */
  endDate?: string;
  time?: string;
  venue: string;
  organizer?: string;
  contact?: string;
  category: EventCategory;
  description?: string;
  imageUri?: string;
  status: ExecEventStatus;
  /** Publish time for scheduled events (ms since epoch). */
  scheduledAt?: number;
  createdAt: number;
};

export type NewExecEvent = Omit<ExecEvent, 'id' | 'ownerId' | 'createdAt'>;

type EventsContextValue = {
  /** Events created by the signed-in user, newest first. */
  myEvents: ExecEvent[];
  loaded: boolean;
  addEvent: (event: NewExecEvent) => ExecEvent | null;
  updateEvent: (id: string, changes: Partial<NewExecEvent>) => void;
  removeEvent: (id: string) => void;
};

// Sample events for the mock executive, used only when nothing is saved yet.
const SEED: ExecEvent[] = [
  {
    id: 'x-seed-1',
    ownerId: 'm2',
    title: 'Navratri Garba Mahotsav',
    date: '10 Oct 2026',
    time: '7:00 PM - 10:00 PM',
    venue: 'Society Premises, Vadodara',
    category: 'Festival',
    status: 'Posted',
    createdAt: Date.parse('2026-09-20'),
  },
  {
    id: 'x-seed-2',
    ownerId: 'm2',
    title: 'Diwali Rangoli Competition',
    date: '08 Nov 2026',
    time: '4:00 PM - 7:00 PM',
    venue: 'Society Premises, Vadodara',
    category: 'Cultural',
    status: 'Needs Approval',
    createdAt: Date.parse('2026-10-25'),
  },
  {
    id: 'x-seed-3',
    ownerId: 'm2',
    title: 'Sharad Purnima Raas',
    date: '25 Oct 2026',
    venue: 'Temple Premises, Vadodara',
    category: 'Festival',
    status: 'Draft',
    createdAt: Date.parse('2026-10-28'),
  },
];

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [all, setAll] = useState<ExecEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.executiveEvents)
      .then((raw) => setAll(raw ? (JSON.parse(raw) as ExecEvent[]) : SEED))
      .catch(() => setAll(SEED))
      .finally(() => setLoaded(true));
  }, []);

  // Persist after the first load so the seed is not written over saved data.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.executiveEvents, JSON.stringify(all)).catch(() => {});
  }, [all, loaded]);

  const addEvent = useCallback(
    (event: NewExecEvent) => {
      if (!user) return null;
      const created: ExecEvent = {
        ...event,
        id: `x-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ownerId: user.id,
        createdAt: Date.now(),
      };
      setAll((list) => [created, ...list]);
      return created;
    },
    [user],
  );

  const updateEvent = useCallback((id: string, changes: Partial<NewExecEvent>) => {
    setAll((list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  }, []);

  const removeEvent = useCallback((id: string) => {
    setAll((list) => list.filter((e) => e.id !== id));
  }, []);

  const myEvents = useMemo(
    () => (user ? all.filter((e) => e.ownerId === user.id).sort((a, b) => b.createdAt - a.createdAt) : []),
    [all, user],
  );

  const value = useMemo(
    () => ({ myEvents, loaded, addEvent, updateEvent, removeEvent }),
    [myEvents, loaded, addEvent, updateEvent, removeEvent],
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useExecEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useExecEvents must be used inside EventsProvider');
  return ctx;
}
