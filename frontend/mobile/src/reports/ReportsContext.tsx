import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';

export type ReportFormat = 'PDF' | 'Excel';

export type Report = {
  id: string;
  title: string;
  period: string;
  generatedOn: string;
  format: ReportFormat;
  /** Local file of a generated report; seed entries have none. */
  fileUri?: string;
};

type ReportsContextValue = {
  reports: Report[];
  addReport: (report: Omit<Report, 'id'>) => void;
  removeReport: (id: string) => void;
};

const SEED: Report[] = [
  {
    id: 'r1',
    title: 'Monthly Report - October 2026',
    period: '01 Oct 2026 - 31 Oct 2026',
    generatedOn: '14 Oct 2026, 05:30 PM',
    format: 'PDF',
  },
  {
    id: 'r2',
    title: 'Monthly Report - September 2026',
    period: '01 Sep 2026 - 30 Sep 2026',
    generatedOn: '01 Oct 2026, 11:20 AM',
    format: 'PDF',
  },
  {
    id: 'r3',
    title: 'Donation Summary - Q3 2026',
    period: '01 Jul 2026 - 30 Sep 2026',
    generatedOn: '01 Oct 2026, 10:15 AM',
    format: 'Excel',
  },
];

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.reports)
      .then((raw) => setReports(raw ? (JSON.parse(raw) as Report[]) : SEED))
      .catch(() => setReports(SEED))
      .finally(() => setLoaded(true));
  }, []);

  // Persist after the first load so the seed is not written over saved data.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports)).catch(() => {});
  }, [reports, loaded]);

  const addReport = useCallback((report: Omit<Report, 'id'>) => {
    setReports((list) => [{ ...report, id: `r-${Date.now()}` }, ...list]);
  }, []);

  const removeReport = useCallback((id: string) => {
    setReports((list) => list.filter((r) => r.id !== id));
  }, []);

  const value = useMemo(() => ({ reports, addReport, removeReport }), [reports, addReport, removeReport]);
  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error('useReports must be used inside ReportsProvider');
  return ctx;
}
