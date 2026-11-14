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
import { Card, ConfirmDialog, DateRangePicker, ErrorState, Field, PageHeader, StatCard, StatCardsSkeleton, StatusBadge, Tabs } from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { Button, Input, NativeSelect, Skeleton } from '@/components/ui/primitives';
import { useFinanceSummary } from '@/hooks/useDashboard';
import { reportsHooks, useDownloadReport, useGenerateReport } from '@/hooks/useReports';
import { useSettings } from '@/hooks/useSettings';
import { useUrlState } from '@/hooks/useUrlState';
import { cn, formatDate, formatDateTime, formatINR, formatNumber } from '@/lib/utils';
import { REPORT_TYPES } from '@/services/reports';
import { PAYMENT_MODES, type Report, type ReportType } from '@/types';

const IncomeExpenseChart = dynamic(() => import('@/components/IncomeExpenseChart'), { ssr: false, loading: () => <Skeleton className="h-72" /> });

const REPORT_ICONS: Record<ReportType, { icon: LucideIcon; color: string }> = {
  summary: { icon: FileText, color: 'text-[#C62828]' },
  donation: { icon: Star, color: 'text-[#B3172E]' },
  expense: { icon: ReceiptText, color: 'text-[#E0700B]' },
  category: { icon: Layers, color: 'text-[#C62828]' },
  monthly: { icon: CalendarRange, color: 'text-[#1E63C6]' },
  custom: { icon: SlidersHorizontal, color: 'text-[#6B46C1]' },
};

function Overview() {
  const { range } = useUrlState();
  const { data, isLoading, isError, refetch } = useFinanceSummary(range);

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isLoading || !data) return <StatCardsSkeleton />;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HandCoins} value={formatINR(data.totalDonations)} label="Total Donations" trend={data.donationTrend} tone="green" />
        <StatCard icon={Wallet} value={formatINR(data.totalExpenses)} label="Total Expenses" trend={data.expenseTrend} trendGoodWhenUp={false} tone="red" />
        <StatCard icon={BarChart3} value={formatINR(data.balance)} label="Current Balance" tone="blue" />
        <StatCard icon={ReceiptText} value={data.transactions} label="Total Transactions" tone="amber" />
      </div>
      <Card title="Income vs Expenses" className="mt-4">
        <IncomeExpenseChart data={data.monthly} />
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
                {['Date', 'Type', 'Description', 'Amount (₹)', 'Category', 'Payment Mode', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.length ? (
                data.recent.map((t) => (
                  <tr key={t.key} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(t.date)}</td>
                    <td className={cn('px-3 py-2 font-medium', t.kind === 'Donation' ? 'text-[#1E8E4E]' : 'text-[#C62828]')}>{t.kind}</td>
                    <td className="px-3 py-2">{t.description}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(t.amount)}</td>
                    <td className="px-3 py-2">{t.category}</td>
                    <td className="whitespace-nowrap px-3 py-2">{t.mode}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-3 py-2">
                      <Link href={t.href} className="inline-flex rounded-md p-1.5 hover:bg-accent" aria-label={`Open ${t.kind.toLowerCase()} ${t.description}`}>
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

type ExportForm = { type: ReportType; from: string; to: string; category: string; mode: string };
const EMPTY_FORM: ExportForm = { type: 'summary', from: '', to: '', category: '', mode: '' };

function ExportReports() {
  const url = useUrlState();
  const { data: settings } = useSettings();
  const [form, setForm] = useState<ExportForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const generate = useGenerateReport();
  const download = useDownloadReport();
  const remove = reportsHooks.useRemove();
  const list = reportsHooks.useList({ ...url.toListParams(), sort: { field: 'generatedOn', order: 'desc' } });
  const [deleting, setDeleting] = useState<Report | null>(null);
  const categories = [...new Set([...(settings?.donationPurposes ?? []), ...(settings?.expenseCategories ?? [])])];

  const set = <K extends keyof ExportForm>(key: K, value: ExportForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (form.from && form.to && form.to < form.from) return setError('The end date is before the start date.');
    setError('');
    generate.mutate({ ...form, from: form.from || null, to: form.to || null });
  };

  const columns = useMemo<Column<Report>[]>(
    () => [
      { key: 'title', header: 'Report Name', className: 'px-4 py-3 font-medium' },
      { key: 'period', header: 'Date Range', className: 'whitespace-nowrap px-4 py-3' },
      {
        key: 'filters',
        header: 'Filters',
        className: 'px-4 py-3 text-xs text-muted-foreground',
        render: (r) => [r.category, r.mode].filter(Boolean).join(' · ') || 'None',
      },
      { key: 'generatedOn', header: 'Generated On', className: 'whitespace-nowrap px-4 py-3', render: (r) => formatDateTime(r.generatedOn) },
      {
        key: 'actions',
        header: 'Actions',
        render: (r) => (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="border-maroon text-maroon"
              disabled={download.isPending && download.variables?.id === r.id}
              onClick={() => download.mutate(r)}
              title="Builds the file again from current data"
            >
              {download.isPending && download.variables?.id === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download
            </Button>
            <button type="button" className="rounded-md p-1.5 text-[#C62828] hover:bg-accent" onClick={() => setDeleting(r)} aria-label={`Delete ${r.title}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [download],
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
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors',
                  active ? 'border-maroon bg-[#FDF3F3]' : 'border-border bg-white hover:bg-[#FBF5EC]',
                )}
              >
                <Icon className={cn('h-6 w-6', color)} />
                <span className={cn('text-xs font-semibold', active && 'text-maroon')}>{label}</span>
                <span className="text-[11px] leading-tight text-muted-foreground">{hint}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            <NativeSelect value={form.mode} onChange={(e) => set('mode', e.target.value)}>
              <option value="">All Payment Modes</option>
              {PAYMENT_MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {error ? <p className="mt-2 text-xs text-[#C62828]">{error}</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">Reports download as Excel files. Leave the dates empty for all time. Totals count verified entries only.</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={submit} disabled={generate.isPending} className="min-w-40">
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Generate Report
          </Button>
          <Button variant="outline" className="border-maroon text-maroon" onClick={() => setForm(EMPTY_FORM)}>
            Reset
          </Button>
        </div>
      </Card>

      <h2 className="mb-2 text-base font-bold text-[#1F2A44]">Generated Reports</h2>
      <DataTable
        columns={columns}
        rows={list.data?.data}
        total={list.data?.total ?? 0}
        page={url.page}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="reports"
        emptyMessage="No reports generated yet."
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove "${deleting?.title}" from the list?`}
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
        subtitle={tab === 'overview' ? 'View income, expenses and balance summary for the society' : 'Generate and download detailed financial reports'}
        actions={tab === 'overview' ? <DateRangePicker /> : null}
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
