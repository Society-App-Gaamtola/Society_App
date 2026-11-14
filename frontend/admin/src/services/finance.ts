import type { DateRange, Donation, Expense, FinanceSummary, MonthTotals, Transaction } from '@/types';
import { monthName, todayISO } from '@/lib/utils';
import { donationsService } from './donations';
import { expensesService } from './expenses';

const CHART_MONTHS = 6;
const RECENT_COUNT = 5;

export const inRange = (date: string, { from, to }: DateRange) => {
  const day = date.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
};

const sum = (rows: { amount: number }[]) => rows.reduce((total, r) => total + r.amount, 0);

/** The period of the same length just before the range, for "↑ 12%" trends. */
function previousRange({ from, to }: DateRange): DateRange | null {
  if (!from || !to) return null;
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(start.getTime() - 86_400_000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86_400_000);
  return { from: prevStart.toISOString().slice(0, 10), to: prevEnd.toISOString().slice(0, 10) };
}

const trend = (current: number, previous: number) =>
  previous ? Math.round(((current - previous) / previous) * 100) : null;

/** The six months ending with the range's end month (or this month). */
function monthlyTotals(donations: Donation[], expenses: Expense[], end: string): MonthTotals[] {
  const [y, m] = end.split('-').map(Number);
  return Array.from({ length: CHART_MONTHS }, (_, i) => {
    const date = new Date(y, m - 1 - (CHART_MONTHS - 1 - i), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      month: monthName(date.getMonth()),
      donations: sum(donations.filter((d) => d.date.startsWith(key))),
      expenses: sum(expenses.filter((e) => e.date.startsWith(key))),
    };
  });
}

export function toTransactions(donations: Donation[], expenses: Expense[]): Transaction[] {
  return [
    ...donations.map((d): Transaction => ({
      key: `d${d.id}`,
      kind: 'Donation',
      date: d.date,
      description: d.donorName,
      category: d.purpose,
      mode: d.mode,
      amount: d.amount,
      status: d.status,
      href: `/donations?search=${encodeURIComponent(d.donorName)}`,
    })),
    ...expenses.map((e): Transaction => ({
      key: `e${e.id}`,
      kind: 'Expense',
      date: e.date,
      description: e.description,
      category: e.category,
      mode: e.mode,
      amount: e.amount,
      status: e.status,
      href: `/expenses?search=${encodeURIComponent(e.description)}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export async function loadFinanceRows() {
  const [donations, expenses] = await Promise.all([donationsService.list(), expensesService.list()]);
  return { donations: donations.data, expenses: expenses.data };
}

/** Totals count only Verified entries; pending ones are not money in or out yet. */
export function summarize(allDonations: Donation[], allExpenses: Expense[], range: DateRange): FinanceSummary {
  const verifiedDonations = allDonations.filter((d) => d.status === 'Verified');
  const verifiedExpenses = allExpenses.filter((e) => e.status === 'Verified');
  const donations = verifiedDonations.filter((d) => inRange(d.date, range));
  const expenses = verifiedExpenses.filter((e) => inRange(e.date, range));
  const totalDonations = sum(donations);
  const totalExpenses = sum(expenses);

  const previous = previousRange(range);

  return {
    totalDonations,
    totalExpenses,
    balance: totalDonations - totalExpenses,
    transactions: donations.length + expenses.length,
    donationTrend: previous ? trend(totalDonations, sum(verifiedDonations.filter((d) => inRange(d.date, previous)))) : null,
    expenseTrend: previous ? trend(totalExpenses, sum(verifiedExpenses.filter((e) => inRange(e.date, previous)))) : null,
    monthly: monthlyTotals(verifiedDonations, verifiedExpenses, range.to ?? todayISO()),
    recent: toTransactions(
      allDonations.filter((d) => inRange(d.date, range)),
      allExpenses.filter((e) => inRange(e.date, range)),
    ).slice(0, RECENT_COUNT),
  };
}

export const financeService = {
  async getSummary(range: DateRange) {
    const { donations, expenses } = await loadFinanceRows();
    return summarize(donations, expenses, range);
  },
};
