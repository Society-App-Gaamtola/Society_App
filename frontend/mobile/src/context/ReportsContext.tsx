import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../config';
import { SEED_REPORTS } from '../data/seeds';
import { usePersistedList } from '../hooks/usePersistedList';
import { createId } from '../utils/format';
import type { Report } from '../types';

type ReportsContextValue = {
  reports: Report[];
  addReport: (report: Omit<Report, 'id'>) => void;
  removeReport: (id: string) => void;
};

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const { items: reports, setItems } = usePersistedList(STORAGE_KEYS.reports, SEED_REPORTS);

  const addReport = useCallback(
    (report: Omit<Report, 'id'>) => {
      setItems((list) => [{ ...report, id: createId('r') }, ...list]);
    },
    [setItems],
  );

  const removeReport = useCallback(
    (id: string) => {
      setItems((list) => list.filter((r) => r.id !== id));
    },
    [setItems],
  );

  const value = useMemo(() => ({ reports, addReport, removeReport }), [reports, addReport, removeReport]);
  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error('useReports must be used inside ReportsProvider');
  return ctx;
}
