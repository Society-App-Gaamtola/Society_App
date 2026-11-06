import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../config';
import { SEED_EXEC_EVENTS } from '../data/seeds';
import { usePersistedList } from '../hooks/usePersistedList';
import { createId } from '../utils/format';
import type { ExecEvent, NewExecEvent } from '../types';
import { useAuth } from './AuthContext';

type EventsContextValue = {
  /** Events created by the signed-in user, newest first. */
  myEvents: ExecEvent[];
  addEvent: (event: NewExecEvent) => ExecEvent | null;
};

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { items: all, setItems } = usePersistedList(STORAGE_KEYS.executiveEvents, SEED_EXEC_EVENTS);

  const addEvent = useCallback(
    (event: NewExecEvent) => {
      if (!user) return null;
      const created: ExecEvent = { ...event, id: createId('x'), ownerId: user.id, createdAt: Date.now() };
      setItems((list) => [created, ...list]);
      return created;
    },
    [user, setItems],
  );

  const myEvents = useMemo(
    () => (user ? all.filter((e) => e.ownerId === user.id).sort((a, b) => b.createdAt - a.createdAt) : []),
    [all, user],
  );

  const value = useMemo(() => ({ myEvents, addEvent }), [myEvents, addEvent]);

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useExecEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useExecEvents must be used inside EventsProvider');
  return ctx;
}
