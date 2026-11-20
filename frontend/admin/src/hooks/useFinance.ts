import { useQuery } from '@tanstack/react-query';
import { LIST_CACHE_MS } from '@/config';
import {
  donationsApi,
  expensesApi,
  financeApi,
  settingsApi,
  type DonationBody,
  type DonationQuery,
  type ExpenseBody,
  type ExpenseQuery,
  type ReportFilters,
  type ReportType,
  type SettingsChanges,
} from '@/services/finance';
import { useBackendAction, useBackendList } from './useBackend';

/** Cache names. Money changes refresh the lists, the Financial Overview and the dashboard */
const DONATIONS = 'adminDonations';
const EXPENSES = 'adminExpenses';
const FINANCE = 'finance';
const REPORTS = 'adminReports';
const SETTINGS = 'settings';

// ---------- Donations ----------
export const useDonationsPage = (query: DonationQuery) => useBackendList(DONATIONS, query, donationsApi.list);
export const useSaveDonation = () =>
  useBackendAction([DONATIONS, FINANCE], ({ id, body }: { id?: number; body: DonationBody }) => donationsApi.save(id, body));
export const useDonationStatus = () =>
  useBackendAction([DONATIONS, FINANCE], ({ id, status }: { id: number; status: string }) => donationsApi.setStatus(id, status));
export const useDeleteDonation = () => useBackendAction([DONATIONS, FINANCE], (id: number) => donationsApi.remove(id));

// ---------- Expenses ----------
export const useExpensesPage = (query: ExpenseQuery) => useBackendList(EXPENSES, query, expensesApi.list);
export const useSaveExpense = () =>
  useBackendAction([EXPENSES, FINANCE], ({ id, body }: { id?: number; body: ExpenseBody }) => expensesApi.save(id, body));
export const useExpenseStatus = () =>
  useBackendAction([EXPENSES, FINANCE], ({ id, status }: { id: number; status: string }) => expensesApi.setStatus(id, status));
export const useDeleteExpense = () => useBackendAction([EXPENSES, FINANCE], (id: number) => expensesApi.remove(id));

// ---------- Reports ----------
export const useFinanceOverview = (range: { from?: string; to?: string }) =>
  useQuery({ queryKey: [FINANCE, range], queryFn: () => financeApi.overview(range), staleTime: LIST_CACHE_MS });
export const useSavedReports = (query: { page: number; limit: number }) => useBackendList(REPORTS, query, financeApi.reports);
export const useSaveReport = () =>
  useBackendAction([REPORTS], ({ type, filters }: { type: ReportType; filters: ReportFilters }) => financeApi.saveReport(type, filters));
export const useRemoveReport = () => useBackendAction([REPORTS], (id: number) => financeApi.removeReport(id));

// ---------- App settings (also the header's society name / logo) ----------
export const useAppSettings = () => useQuery({ queryKey: [SETTINGS], queryFn: settingsApi.get, staleTime: LIST_CACHE_MS });
/** Downloads the database backup, then reloads the settings (for "Last backup") */
export const useDownloadBackup = () => useBackendAction([SETTINGS], () => settingsApi.backup());

export const useSaveSettings = () =>
  useBackendAction([SETTINGS, 'eventCategories'], (changes: SettingsChanges) => settingsApi.save(changes));
