'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BarChart3, Clock, FileText, Plus, ReceiptText, TrendingUp, Wallet, XCircle } from 'lucide-react';
import {
  ConfirmDialog,
  DetailList,
  ExportButton,
  Field,
  FileUpload,
  FormDialog,
  PageHeader,
  RowActions,
  StatCard,
  StatCardsSkeleton,
  StatusBadge,
  ViewDialog,
  FileLink,
} from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { Button, Input, NativeSelect } from '@/components/ui/primitives';
import { expensesHooks, useSetExpenseStatus } from '@/hooks/useExpenses';
import { useSettings } from '@/hooks/useSettings';
import { useUrlState } from '@/hooks/useUrlState';
import { exportExcel } from '@/lib/exporters';
import { cn, formatDate, formatINR, formatNumber, periodLabel, recordNo, todayISO } from '@/lib/utils';
import { PAYMENT_MODES, REVIEW_STATUSES, type Expense, type NewRecord } from '@/types';

type Draft = NewRecord<Expense>;

const emptyDraft = (category: string): Draft => ({
  description: '',
  vendor: '',
  category,
  amount: 0,
  mode: 'Cash',
  date: todayISO(),
  status: 'Pending',
  approvedBy: 'Super Admin',
  receipt: null,
});

function ExpenseForm({ open, onOpenChange, expense }: { open: boolean; onOpenChange: (open: boolean) => void; expense?: Expense }) {
  const { data: settings } = useSettings();
  const categories = settings?.expenseCategories ?? [];
  const create = expensesHooks.useCreate();
  const update = expensesHooks.useUpdate();
  const [draft, setDraft] = useState<Draft>(emptyDraft(''));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (expense) {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = expense;
      setDraft(rest);
    } else setDraft(emptyDraft(categories[0] ?? 'Other'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const found: Record<string, string> = {};
    if (!draft.description.trim()) found.description = 'Description is required.';
    if (!draft.vendor.trim()) found.vendor = 'Vendor is required.';
    if (!(draft.amount > 0)) found.amount = 'Enter an amount above zero.';
    if (!draft.date) found.date = 'Date is required.';
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { ...draft, description: draft.description.trim(), vendor: draft.vendor.trim() };
    const done = { onSuccess: () => onOpenChange(false) };
    if (expense) update.mutate({ id: expense.id, changes: body }, done);
    else create.mutate(body, done);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? `Edit ${recordNo('EXP', expense.id)}` : 'Add Expense'}
      submitLabel={expense ? 'Save Changes' : 'Add Expense'}
      pending={create.isPending || update.isPending}
      onSubmit={submit}
      className="max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Description" error={errors.description} className="sm:col-span-2">
          <Input value={draft.description} onChange={(e) => set('description', e.target.value)} autoFocus />
        </Field>
        <Field label="Vendor / Paid To" error={errors.vendor}>
          <Input value={draft.vendor} onChange={(e) => set('vendor', e.target.value)} />
        </Field>
        <Field label="Category">
          <NativeSelect value={draft.category} onChange={(e) => set('category', e.target.value)}>
            {[...new Set([...categories, draft.category])].filter(Boolean).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Amount (₹)" error={errors.amount}>
          <Input type="number" min={1} value={draft.amount || ''} onChange={(e) => set('amount', Number(e.target.value))} />
        </Field>
        <Field label="Date" error={errors.date}>
          <Input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Payment Mode">
          <NativeSelect value={draft.mode} onChange={(e) => set('mode', e.target.value as Draft['mode'])}>
            {PAYMENT_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Status">
          <NativeSelect value={draft.status} onChange={(e) => set('status', e.target.value as Draft['status'])}>
            {REVIEW_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Approved By" className="sm:col-span-2">
          <Input value={draft.approvedBy} onChange={(e) => set('approvedBy', e.target.value)} />
        </Field>
      </div>
      <Field label="Bill / Receipt">
        <FileUpload value={draft.receipt} onChange={(url) => set('receipt', url)} label="Upload bill photo or PDF" />
      </Field>
    </FormDialog>
  );
}

const FILTERS = ['category', 'status', 'mode'];

export default function ExpensesPage() {
  const url = useUrlState();
  const { data: settings } = useSettings();
  const params = url.toListParams(FILTERS, 'date');
  const list = expensesHooks.useList({ ...params, sort: url.sort ?? { field: 'date', order: 'desc' } });
  const all = expensesHooks.useList({ search: params.search, filters: params.filters });
  const setStatus = useSetExpenseStatus();
  const remove = expensesHooks.useRemove();
  const [form, setForm] = useState<{ open: boolean; expense?: Expense }>({ open: false });
  const [viewing, setViewing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const stats = useMemo(() => {
    const verified = (all.data?.data ?? []).filter((e) => e.status === 'Verified');
    const total = verified.reduce((sum, e) => sum + e.amount, 0);
    return {
      total,
      count: all.data?.total ?? 0,
      highest: Math.max(0, ...verified.map((e) => e.amount)),
      average: verified.length ? Math.round(total / verified.length) : 0,
    };
  }, [all.data]);

  const columns = useMemo<Column<Expense>[]>(
    () => [
      { key: 'id', header: 'Expense No', sortable: true, render: (e) => recordNo('EXP', e.id) },
      { key: 'date', header: 'Date', sortable: true, className: 'whitespace-nowrap px-4 py-3', render: (e) => formatDate(e.date) },
      { key: 'description', header: 'Description', className: 'px-4 py-3 font-medium' },
      { key: 'vendor', header: 'Vendor / Paid To' },
      { key: 'category', header: 'Category', sortable: true },
      { key: 'amount', header: 'Amount (₹)', sortable: true, className: 'px-4 py-3 text-right font-medium', render: (e) => formatNumber(e.amount) },
      { key: 'mode', header: 'Payment Mode', className: 'whitespace-nowrap px-4 py-3' },
      { key: 'status', header: 'Status', sortable: true, render: (e) => <StatusBadge status={e.status} /> },
      {
        key: 'receipt',
        header: 'Receipt',
        render: (e) =>
          e.receipt ? (
            <FileLink href={e.receipt} className="inline-flex rounded-md p-1.5 text-[#C62828] hover:bg-accent" aria-label={`Open bill for ${recordNo('EXP', e.id)}`} title="Open bill">
              <FileText className="h-4 w-4" />
            </FileLink>
          ) : (
            <span className="inline-flex p-1.5 text-[#CFC6BB]" title="No bill uploaded">
              <FileText className="h-4 w-4" aria-label="No bill uploaded" />
            </span>
          ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (e) => (
          <RowActions
            label={recordNo('EXP', e.id)}
            onEdit={() => setForm({ open: true, expense: e })}
            onView={() => setViewing(e)}
            onDelete={() => setDeleting(e)}
            more={[
              { label: 'Mark Verified', icon: BadgeCheck, hidden: e.status === 'Verified', onSelect: () => setStatus.mutate({ id: e.id, status: 'Verified' }) },
              { label: 'Mark Pending', icon: Clock, hidden: e.status === 'Pending', onSelect: () => setStatus.mutate({ id: e.id, status: 'Pending' }) },
              { label: 'Reject', icon: XCircle, destructive: true, hidden: e.status === 'Rejected', onSelect: () => setStatus.mutate({ id: e.id, status: 'Rejected' }) },
            ]}
          />
        ),
      },
    ],
    [setStatus],
  );

  const onExport = async () => {
    const rows = all.data?.data ?? [];
    await exportExcel(
      {
        title: 'Expenses',
        subtitle: `${periodLabel(url.get('from'), url.get('to'))} · ${rows.length} entries`,
        columns: ['Expense No', 'Date', 'Description', 'Vendor', 'Category', 'Amount', 'Mode', 'Status'],
        rows: [...rows]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((e) => [recordNo('EXP', e.id), formatDate(e.date), e.description, e.vendor, e.category, formatNumber(e.amount), e.mode, e.status]),
      },
      'expenses',
    );
  };

  return (
    <>
      <PageHeader
        title="Expense Management"
        subtitle="Record and manage society expenses and vendor payments"
        actions={
          <>
            <Button onClick={() => setForm({ open: true })}>
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
            <ExportButton onExport={onExport} disabled={!all.data} />
          </>
        }
      />
      {all.isLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Wallet} value={formatINR(stats.total)} label="Total Expenses (verified)" tone="red" />
          <StatCard icon={ReceiptText} value={stats.count} label="Total Transactions" tone="amber" />
          <StatCard icon={TrendingUp} value={formatINR(stats.highest)} label="Highest Expense" tone="orange" />
          <StatCard icon={BarChart3} value={formatINR(stats.average)} label="Average Expense" tone="green" />
        </div>
      )}
      <FilterBar
        searchPlaceholder="Search by description or vendor name..."
        dateRange
        selects={[
          { name: 'category', label: 'Categories', options: settings?.expenseCategories ?? [] },
          { name: 'status', label: 'Status', options: REVIEW_STATUSES },
          { name: 'mode', label: 'Payment Modes', options: PAYMENT_MODES },
        ]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.data}
        total={list.data?.total ?? 0}
        page={url.page}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        sort={url.sort ?? { field: 'date', order: 'desc' }}
        onSortChange={({ field, order }) => url.setParams({ sort: field, order })}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="entries"
      />
      <ExpenseForm open={form.open} expense={form.expense} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ViewDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing ? `Expense ${recordNo('EXP', viewing.id)}` : ''}
        footer={
          viewing && viewing.status !== 'Verified' ? (
            <Button className="bg-[#1E8E4E] hover:bg-[#187540]" onClick={() => setStatus.mutate({ id: viewing.id, status: 'Verified' }, { onSuccess: () => setViewing(null) })}>
              Verify
            </Button>
          ) : null
        }
      >
        {viewing ? (
          <DetailList
            items={[
              ['Description', viewing.description],
              ['Vendor / Paid To', viewing.vendor],
              ['Amount', formatINR(viewing.amount)],
              ['Date', formatDate(viewing.date)],
              ['Category', viewing.category],
              ['Payment Mode', viewing.mode],
              ['Approved By', viewing.approvedBy],
              ['Status', <StatusBadge key="s" status={viewing.status} />],
              [
                'Bill / Receipt',
                viewing.receipt ? (
                  <FileLink key="r" href={viewing.receipt} className={cn('text-maroon underline')}>
                    Open file
                  </FileLink>
                ) : (
                  'Not uploaded'
                ),
              ],
            ]}
          />
        ) : null}
      </ViewDialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting ? recordNo('EXP', deleting.id) : ''}?`}
        description={deleting ? `${deleting.description}, ${formatINR(deleting.amount)}. This cannot be undone.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
