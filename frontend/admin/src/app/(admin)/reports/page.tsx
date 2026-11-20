'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Layers,
  Loader2,
  ReceiptText,
  SlidersHorizontal,
  Star,
  Trash2,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card, ConfirmDialog, ErrorState, Field, PageHeader, StatCard, StatCardsSkeleton, StatusBadge, Tabs } from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { PeriodFilter, usePeriodLabel } from '@/components/PeriodFilter';
import { Button, Input, NativeSelect, Skeleton } from '@/components/ui/primitives';
import { DEFAULT_PAGE_SIZE } from '@/config';
import { useAppSettings, useFinanceOverview, useRemoveReport, useSavedReports, useSaveReport } from '@/hooks/useFinance';
import { useUrlState } from '@/hooks/useUrlState';
import { exportTable, type ExportFormat } from '@/lib/exporters';
import { cn, formatDate, formatDateTime, formatINR, formatNumber, periodLabel } from '@/lib/utils';
import { toMonths } from '@/services/dashboard';
import {
  buildReportTable,
  donationStatusLabel,
  expenseStatusLabel,
  methodLabel,
  PAYMENT_MODE_OPTIONS,
  reportFileName,
  reportLabel,
  REPORT_TYPES,
  type PaymentMode,
  type ReportFilters,
  type ReportType,
  type SavedReport,
} from '@/services/finance';

const IncomeExpenseChart = dynamic(() => import('@/components/IncomeExpenseChart'), { ssr: false, loading: () => <Skeleton className="h-72" /> });

const REPORT_ICONS: Record<ReportType, { icon: LucideIcon; color: string }> = {
  summary: { icon: FileText, color: 'text-[#C62828]' },
  donation: { icon: Star, color: 'text-[#B3172E]' },
  expense: { icon: ReceiptText, color: 'text-[#E0700B]' },
  category: { icon: Layers, color: 'text-[#C62828]' },
  monthly: { icon: CalendarRange, color: 'text-[#1E63C6]' },
  custom: { icon: SlidersHorizontal, color: 'text-[#6B46C1]' },
};

const modeName = (mode?: string | null) => PAYMENT_MODE_OPTIONS.find((m) => m.value === mode)?.label ?? '';

// ---------- Overview (GET /admin/finance) ----------

function Overview() {
  const { range } = useUrlState();
  const { data, isLoading, isError, error, refetch } = useFinanceOverview(range);
  const periodText = usePeriodLabel();

  if (isError) return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  if (isLoading || !data) return <StatCardsSkeleton />;
  const t = data.totals;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HandCoins} value={formatINR(t.donations)} label="Total Donations" trend={t.donation_trend} tone="green" />
        <StatCard icon={Wallet} value={formatINR(t.expenses)} label="Total Expenses" trend={t.expense_trend} trendGoodWhenUp={false} tone="red" />
        <StatCard icon={BarChart3} value={formatINR(t.balance)} label="Balance" tone="blue" />
        <StatCard icon={ReceiptText} value={t.transactions} label="Verified Transactions" tone="amber" />
      </div>
      <Card
        title="Income vs Expenses"
        className="mt-4 min-w-0"
        action={<span className="rounded-full bg-[#FDECEC] px-3 py-1 text-xs font-semibold text-maroon">{periodText}</span>}
      >
        <IncomeExpenseChart data={toMonths(data.monthly)} />
      </Card>
      <Card
        title="Recent Transactions"
        className="mt-4"
        action={
          <Link href="/donations" className="inline-flex items-center gap-1 text-sm font-semibold text-maroon hover:underline">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FBF5EC] text-xs font-semibold">
              <tr>
                {['Date', 'Type', 'Description', 'Amount (₹)', 'Category', 'Payment Mode', 'Status', ''].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.length ? (
                data.recent.map((tx) => (
                  <tr key={`${tx.kind}${tx.id}`} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(tx.date)}</td>
                    <td className={cn('px-3 py-2 font-medium', tx.kind === 'donation' ? 'text-[#1E8E4E]' : 'text-[#C62828]')}>{tx.kind === 'donation' ? 'Donation' : 'Expense'}</td>
                    <td className="px-3 py-2">{tx.description}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(tx.amount)}</td>
                    <td className="px-3 py-2">{tx.category ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2">{methodLabel(tx.mode)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={tx.kind === 'donation' ? donationStatusLabel(tx.status) : expenseStatusLabel(tx.status)} />
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/${tx.kind === 'donation' ? 'donations' : 'expenses'}?search=${encodeURIComponent(tx.description ?? '')}`}
                        className="inline-flex rounded-md p-1.5 hover:bg-accent"
                        aria-label={`Open ${tx.kind} ${tx.description}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    No transactions in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ---------- Export (GET /admin/reports/data/:type, read page by page; file built in the browser) ----------

type ExportForm = { type: ReportType; from: string; to: string; category: string; mode: '' | PaymentMode; format: ExportFormat };
const EMPTY_FORM: ExportForm = { type: 'summary', from: '', to: '', category: '', mode: '', format: 'excel' };

const toFilters = (f: { from?: string | null; to?: string | null; category?: string | null; mode?: string | null }): ReportFilters => ({
  from_date: f.from || undefined,
  to_date: f.to || undefined,
  category: f.category || undefined,
  mode: (f.mode || undefined) as PaymentMode | undefined,
});

function ExportReports() {
  const url = useUrlState();
  const { data: settings } = useAppSettings();
  const [form, setForm] = useState<ExportForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [building, setBuilding] = useState<string | null>(null); // "new" or a saved report's id
  const save = useSaveReport();
  const remove = useRemoveReport();
  const list = useSavedReports({ page: url.page, limit: DEFAULT_PAGE_SIZE });
  const [deleting, setDeleting] = useState<SavedReport | null>(null);
  const categories = [...new Set([...(settings?.settings.donation_purposes ?? []), ...(settings?.settings.expense_categories ?? [])])];

  const set = <K extends keyof ExportForm>(key: K, value: ExportForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  /** Builds the file from today's data and downloads it */
  const download = async (type: ReportType, filters: ReportFilters, format: ExportFormat, key: string) => {
    setBuilding(key);
    try {
      await exportTable(await buildReportTable(type, filters), reportFileName(type, filters), format);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the report.');
      return false;
    } finally {
      setBuilding(null);
    }
  };

  const submit = async () => {
    if (form.from && form.to && form.to < form.from) return setError('The end date is before the start date.');
    setError('');
    const filters = toFilters(form);
    if (await download(form.type, filters, form.format, 'new')) save.mutate({ type: form.type, filters });
  };

  const columns = useMemo<Column<SavedReport>[]>(
    () => [
      { key: 'title', header: 'Report Name', className: 'px-4 py-3 font-medium', render: (r) => reportLabel(r.report_type) },
      { key: 'period', header: 'Date Range', className: 'whitespace-nowrap px-4 py-3', render: (r) => periodLabel(r.from_date, r.to_date) },
      {
        key: 'filters',
        header: 'Filters',
        className: 'px-4 py-3 text-xs text-muted-foreground',
        render: (r) => [r.category, modeName(r.mode)].filter(Boolean).join(' · ') || 'None',
      },
      {
        key: 'generated',
        header: 'Generated',
        className: 'whitespace-nowrap px-4 py-3',
        render: (r) => (
          <span>
            {formatDateTime(r.created_at)}
            {r.generated_by_name ? <span className="block text-xs text-muted-foreground">by {r.generated_by_name}</span> : null}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Download',
        render: (r) => {
          const busy = building === String(r.id);
          const filters = toFilters({ from: r.from_date, to: r.to_date, category: r.category, mode: r.mode });
          return (
            <div className="flex items-center gap-1">
              {(['excel', 'pdf'] as const).map((format) => (
                <Button
                  key={format}
                  size="sm"
                  variant="outline"
                  className="border-maroon text-maroon"
                  disabled={!!building}
                  onClick={() => download(r.report_type, filters, format, String(r.id))}
                  title="Built again from today's data"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : format === 'pdf' ? <FileText className="h-3.5 w-3.5" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                  {format === 'pdf' ? 'PDF' : 'Excel'}
                </Button>
              ))}
              <button type="button" className="rounded-md p-1.5 text-[#C62828] hover:bg-accent" onClick={() => setDeleting(r)} aria-label={`Delete ${reportLabel(r.report_type)}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [building],
  );

  return (
    <>
      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-bold">Select Report Type</h2>
        <div role="radiogroup" aria-label="Report type" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {REPORT_TYPES.map(({ type, label, hint }) => {
            const { icon: Icon, color } = REPORT_ICONS[type];
            const active = form.type === type;
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set('type', type)}
                className={cn('flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors', active ? 'border-maroon bg-[#FDF3F3]' : 'border-border bg-white hover:bg-[#FBF5EC]')}
              >
                <Icon className={cn('h-6 w-6', color)} />
                <span className={cn('text-xs font-semibold', active && 'text-maroon')}>{label}</span>
                <span className="text-[11px] leading-tight text-muted-foreground">{hint}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Field label="From">
            <Input type="date" value={form.from} max={form.to || undefined} onChange={(e) => set('from', e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={form.to} min={form.from || undefined} onChange={(e) => set('to', e.target.value)} />
          </Field>
          <Field label="Category (optional)">
            <NativeSelect value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Payment Mode (optional)">
            <NativeSelect value={form.mode} onChange={(e) => set('mode', e.target.value as ExportForm['mode'])}>
              <option value="">All Payment Modes</option>
              {PAYMENT_MODE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="File">
            <NativeSelect value={form.format} onChange={(e) => set('format', e.target.value as ExportFormat)}>
              <option value="excel">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
            </NativeSelect>
          </Field>
        </div>
        {error ? <p className="mt-2 text-xs text-[#C62828]">{error}</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">Leave the dates empty for all time. Totals count verified entries only.</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={submit} disabled={!!building || save.isPending} className="min-w-40">
            {building === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Generate Report
          </Button>
          <Button variant="outline" className="border-maroon text-maroon" onClick={() => setForm(EMPTY_FORM)}>
            Reset
          </Button>
        </div>
      </Card>

      <h2 className="mb-2 text-base font-bold text-[#1F2A44]">Generated Reports</h2>
      <DataTable
        columns={columns}
        rows={list.data?.reports}
        total={list.data?.pagination.total ?? 0}
        page={url.page}
        pageSize={DEFAULT_PAGE_SIZE}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        errorMessage={list.error?.message}
        onRetry={() => list.refetch()}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="reports"
        emptyMessage="No reports generated yet."
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove "${deleting ? reportLabel(deleting.report_type) : ''}" from the list?`}
        description="Only the history entry is removed. You can generate it again any time."
        confirmLabel="Remove"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const url = useUrlState();
  const tab = url.get('tab') === 'export' ? 'export' : 'overview';
  return (
    <>
      <PageHeader
        title={tab === 'overview' ? 'Financial Overview' : 'Export Financial Reports'}
        subtitle={tab === 'overview' ? 'Income, expenses and balance of the society (verified entries)' : 'Generate and download detailed financial reports as Excel or PDF'}
        actions={tab === 'overview' ? <PeriodFilter /> : null}
      />
      <Tabs
        variant="underline"
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'export', label: 'Export Reports' },
        ]}
        value={tab}
        onChange={(value) => router.replace(value === 'export' ? '/reports?tab=export' : '/reports', { scroll: false })}
      />
      {tab === 'overview' ? <Overview /> : <ExportReports />}
    </>
  );
}
