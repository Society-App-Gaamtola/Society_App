'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BarChart3, Clock, Download, FileText, Plus, ReceiptText, TrendingUp, Wallet, XCircle } from 'lucide-react';
import {
  ConfirmDialog,
  DetailList,
  ExportButton,
  Field,
  FileLink,
  FileUpload,
  FormDialog,
  PageHeader,
  RowActions,
  StatCard,
  StatCardsSkeleton,
  StatusBadge,
  ViewDialog,
} from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { Button, Input, NativeSelect } from '@/components/ui/primitives';
import { DEFAULT_PAGE_SIZE } from '@/config';
import { useAppSettings, useDeleteExpense, useExpensesPage, useExpenseStatus, useSaveExpense } from '@/hooks/useFinance';
import { useUrlState } from '@/hooks/useUrlState';
import { exportExpenseVoucher, exportTable, type ExportFormat } from '@/lib/exporters';
import { cn, formatDate, formatINR, formatNumber, periodLabel, recordNo, todayISO } from '@/lib/utils';
import { uploadFinanceFile } from '@/services/cloudinary';
import {
  expensesApi,
  expenseStatusLabel,
  EXPENSE_STATUS_OPTIONS,
  methodLabel,
  PAYMENT_MODE_OPTIONS,
  type Expense,
  type ExpenseBody,
  type ExpenseQuery,
  type PaymentMode,
} from '@/services/finance';

type Draft = Omit<ExpenseBody, 'amount'> & { amount: string };

const emptyDraft = (category: string): Draft => ({
  description: '',
  paid_to: '',
  category,
  amount: '',
  mode: 'cash',
  reference_no: '',
  txn_date: todayISO(),
  status: 'pending',
  bill_url: null,
});

const toDraft = (e: Expense): Draft => ({
  description: e.description,
  paid_to: e.paid_to ?? '',
  category: e.category ?? '',
  amount: String(e.amount),
  mode: (e.mode as PaymentMode) ?? 'cash',
  reference_no: e.reference_no ?? '',
  txn_date: e.txn_date,
  status: e.status,
  bill_url: e.bill_url,
});

function ExpenseForm({ open, onOpenChange, expense }: { open: boolean; onOpenChange: (open: boolean) => void; expense?: Expense }) {
  const { data: settings } = useAppSettings();
  const categories = settings?.settings.expense_categories ?? [];
  const save = useSaveExpense();
  const [draft, setDraft] = useState<Draft>(emptyDraft(''));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDraft(expense ? toDraft(expense) : emptyDraft(categories[0] ?? ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const found: Record<string, string> = {};
    if (!draft.description.trim()) found.description = 'Description is required.';
    if (!draft.paid_to.trim()) found.paid_to = 'Who was paid is required.';
    if (!draft.category) found.category = 'Choose a category.';
    if (!(Number(draft.amount) > 0)) found.amount = 'Enter an amount above zero.';
    if (!draft.txn_date) found.txn_date = 'Date is required.';
    else if (draft.txn_date > todayISO()) found.txn_date = "The date can't be in the future.";
    setErrors(found);
    if (Object.keys(found).length) return;
    const body: ExpenseBody = {
      ...draft,
      amount: Number(draft.amount),
      description: draft.description.trim(),
      paid_to: draft.paid_to.trim(),
      reference_no: draft.reference_no.trim(),
    };
    save.mutate({ id: expense?.id, body }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? `Edit ${recordNo('EXP', expense.id)}` : 'Add Expense'}
      submitLabel={expense ? 'Save Changes' : 'Add Expense'}
      pending={save.isPending}
      onSubmit={submit}
      className="max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Description" error={errors.description} className="sm:col-span-2">
          <Input value={draft.description} onChange={(e) => set('description', e.target.value)} autoFocus />
        </Field>
        <Field label="Vendor / Paid To" error={errors.paid_to}>
          <Input value={draft.paid_to} onChange={(e) => set('paid_to', e.target.value)} />
        </Field>
        <Field label="Category" error={errors.category}>
          <NativeSelect value={draft.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Choose…</option>
            {[...new Set([...categories, draft.category])].filter(Boolean).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Amount (₹)" error={errors.amount}>
          <Input type="number" min={1} value={draft.amount} onChange={(e) => set('amount', e.target.value)} />
        </Field>
        <Field label="Date" error={errors.txn_date}>
          <Input type="date" value={draft.txn_date} max={todayISO()} onChange={(e) => set('txn_date', e.target.value)} />
        </Field>
        <Field label="Payment Mode">
          <NativeSelect value={draft.mode} onChange={(e) => set('mode', e.target.value as PaymentMode)}>
            {PAYMENT_MODE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Reference / Cheque No.">
          <Input value={draft.reference_no} onChange={(e) => set('reference_no', e.target.value)} />
        </Field>
        <Field label="Status">
          <NativeSelect value={draft.status} onChange={(e) => set('status', e.target.value)}>
            {EXPENSE_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Bill / Receipt">
        <FileUpload value={draft.bill_url} onChange={(url) => set('bill_url', url)} label="Upload bill photo or PDF" maxMb={10} upload={uploadFinanceFile} />
      </Field>
    </FormDialog>
  );
}

function useExpenseQuery(): ExpenseQuery {
  const url = useUrlState();
  return {
    page: url.page,
    limit: DEFAULT_PAGE_SIZE,
    search: url.search || undefined,
    status: url.get('status') || undefined,
    mode: (url.get('mode') || undefined) as PaymentMode | undefined,
    category: url.get('category') || undefined,
    from_date: url.range.from,
    to_date: url.range.to,
    sort: (url.sort?.field as ExpenseQuery['sort']) ?? 'date',
    order: url.sort?.order ?? 'desc',
  };
}

export default function ExpensesPage() {
  const url = useUrlState();
  const { data: settings } = useAppSettings();
  const query = useExpenseQuery();
  const list = useExpensesPage(query);
  const setStatus = useExpenseStatus();
  const remove = useDeleteExpense();
  const [form, setForm] = useState<{ open: boolean; expense?: Expense }>({ open: false });
  const [viewing, setViewing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const summary = list.data?.summary;

  // Receipts carry App Settings' name, phone(s), address and logo
  const s = settings?.settings;
  const society = useMemo(
    () => ({ name: s?.society_name, phone: s?.phone, address: s?.address, logoUrl: s?.logo_url }),
    [s?.society_name, s?.phone, s?.address, s?.logo_url],
  );
  const voucher = (e: Expense) => exportExpenseVoucher(e, { society, modeLabel: methodLabel, statusLabel: expenseStatusLabel });

  const columns = useMemo<Column<Expense>[]>(
    () => [
      { key: 'id', header: 'Expense No', render: (e) => recordNo('EXP', e.id) },
      { key: 'date', header: 'Date', sortable: true, className: 'whitespace-nowrap px-4 py-3', render: (e) => formatDate(e.txn_date) },
      {
        key: 'description',
        header: 'Description',
        render: (e) => (
          <span>
            <span className="block font-medium">{e.description}</span>
            <span className="block text-xs text-muted-foreground">{e.paid_to}</span>
          </span>
        ),
      },
      { key: 'category', header: 'Category', render: (e) => e.category ?? '—' },
      { key: 'amount', header: 'Amount (₹)', sortable: true, className: 'px-4 py-3 text-right font-medium', render: (e) => formatNumber(e.amount) },
      { key: 'mode', header: 'Payment Mode', className: 'whitespace-nowrap px-4 py-3', render: (e) => methodLabel(e.mode) },
      { key: 'status', header: 'Status', render: (e) => <StatusBadge status={expenseStatusLabel(e.status)} /> },
      {
        key: 'bill',
        header: 'Receipt / Bill',
        render: (e) => (
          <span className="inline-flex items-center gap-0.5">
            <button type="button" onClick={() => voucher(e)} className="rounded-md p-1.5 text-[#C62828] hover:bg-accent" aria-label={`Download voucher ${recordNo('EXP', e.id)}`} title="Download voucher (PDF)">
              <Download className="h-4 w-4" />
            </button>
            {e.bill_url ? (
              <FileLink href={e.bill_url} className="inline-flex rounded-md p-1.5 text-[#C62828] hover:bg-accent" aria-label={`Open bill for ${recordNo('EXP', e.id)}`} title="Open uploaded bill">
                <FileText className="h-4 w-4" />
              </FileLink>
            ) : (
              <span className={cn('inline-flex p-1.5 text-muted-foreground/50')} title="No bill uploaded">
                <FileText className="h-4 w-4" aria-label="No bill uploaded" />
              </span>
            )}
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
              { label: 'Mark Verified', icon: BadgeCheck, hidden: e.status === 'verified', onSelect: () => setStatus.mutate({ id: e.id, status: 'verified' }) },
              { label: 'Mark Pending', icon: Clock, hidden: e.status === 'pending', onSelect: () => setStatus.mutate({ id: e.id, status: 'pending' }) },
              { label: 'Reject', icon: XCircle, destructive: true, hidden: e.status === 'rejected', onSelect: () => setStatus.mutate({ id: e.id, status: 'rejected' }) },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setStatus, society],
  );

  const onExport = async (format: ExportFormat) => {
    const { page, limit, ...filters } = query;
    const rows = await expensesApi.listAll(filters);
    await exportTable(
      {
        title: 'Expenses',
        subtitle: `${periodLabel(query.from_date, query.to_date)} · ${rows.length} entries`,
        columns: ['Expense No', 'Date', 'Description', 'Paid To', 'Category', 'Amount', 'Mode', 'Status'],
        rows: rows.map((e) => [recordNo('EXP', e.id), formatDate(e.txn_date), e.description, e.paid_to ?? '', e.category ?? '', formatNumber(e.amount), methodLabel(e.mode), expenseStatusLabel(e.status)]),
      },
      'expenses',
      format,
    );
  };

  return (
    <>
      <PageHeader
        title="Society Expenses"
        subtitle="Record and verify what the society spends. Only verified expenses count in the totals and reports"
        actions={
          <>
            <Button onClick={() => setForm({ open: true })}>
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
            <ExportButton onExport={onExport} disabled={!list.data?.pagination.total} />
          </>
        }
      />
      {!summary ? (
        <StatCardsSkeleton />
      ) : (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Wallet} value={formatINR(summary.verified_total)} label="Total Expenses (verified)" tone="red" />
          <StatCard icon={ReceiptText} value={summary.count} label="Total Entries" tone="amber" />
          <StatCard icon={TrendingUp} value={formatINR(summary.highest)} label="Highest Expense" tone="orange" />
          <StatCard icon={BarChart3} value={formatINR(summary.average)} label="Average Expense" tone="green" />
        </div>
      )}
      <FilterBar
        searchPlaceholder="Search by description, vendor or reference..."
        dateRange
        selects={[
          { name: 'category', label: 'Categories', options: settings?.settings.expense_categories ?? [] },
          { name: 'status', label: 'Status', options: EXPENSE_STATUS_OPTIONS },
          { name: 'mode', label: 'Payment Modes', options: PAYMENT_MODE_OPTIONS },
        ]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.expenses}
        total={list.data?.pagination.total ?? 0}
        page={url.page}
        pageSize={DEFAULT_PAGE_SIZE}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        errorMessage={list.error?.message}
        onRetry={() => list.refetch()}
        sort={{ field: query.sort ?? 'date', order: query.order ?? 'desc' }}
        onSortChange={({ field, order }) => url.setParams({ sort: field, order })}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="entries"
        emptyMessage="No expenses found."
      />
      <ExpenseForm open={form.open} expense={form.expense} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ViewDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing ? `Expense ${recordNo('EXP', viewing.id)}` : ''}
        footer={
          viewing && viewing.status !== 'verified' ? (
            <Button className="bg-[#1E8E4E] hover:bg-[#187540]" onClick={() => setStatus.mutate({ id: viewing.id, status: 'verified' }, { onSuccess: () => setViewing(null) })}>
              Verify
            </Button>
          ) : null
        }
      >
        {viewing ? (
          <DetailList
            items={[
              ['Description', viewing.description],
              ['Paid To', viewing.paid_to || '—'],
              ['Category', viewing.category || '—'],
              ['Amount', formatINR(viewing.amount)],
              ['Date', formatDate(viewing.txn_date)],
              ['Payment Mode', methodLabel(viewing.mode)],
              ['Reference', viewing.reference_no || '—'],
              ['Status', <StatusBadge key="s" status={expenseStatusLabel(viewing.status)} />],
              ['Entered By', viewing.entered_by_name ?? '—'],
              ...(viewing.verified_by_name ? [['Reviewed By', viewing.verified_by_name] as [string, string]] : []),
              [
                'Bill',
                viewing.bill_url ? (
                  <FileLink key="b" href={viewing.bill_url} className="text-maroon underline">
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
        description={deleting ? `${deleting.description}, ${formatINR(deleting.amount)}.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
