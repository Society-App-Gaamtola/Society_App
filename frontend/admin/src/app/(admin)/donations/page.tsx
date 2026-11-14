'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BarChart3, Clock, FileText, HandCoins, Plus, ReceiptText, Star, XCircle } from 'lucide-react';
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
} from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { Button, Input, NativeSelect } from '@/components/ui/primitives';
import { donationsHooks, useSetDonationStatus } from '@/hooks/useDonations';
import { membersHooks } from '@/hooks/useMembers';
import { useSettings } from '@/hooks/useSettings';
import { useUrlState } from '@/hooks/useUrlState';
import { exportDonationReceipt, exportExcel } from '@/lib/exporters';
import { formatDate, formatINR, formatNumber, periodLabel, recordNo, todayISO } from '@/lib/utils';
import { PAYMENT_MODES, REVIEW_STATUSES, type Donation, type NewRecord } from '@/types';

type Draft = NewRecord<Donation>;
const NON_MEMBER = '';

const emptyDraft = (purpose: string): Draft => ({
  donorName: '',
  memberId: NON_MEMBER,
  amount: 0,
  mode: 'UPI',
  purpose,
  reference: '',
  date: todayISO(),
  status: 'Verified',
  receipt: null,
});

function DonationForm({ open, onOpenChange, donation }: { open: boolean; onOpenChange: (open: boolean) => void; donation?: Donation }) {
  const { data: settings } = useSettings();
  const purposes = settings?.donationPurposes ?? [];
  const members = membersHooks.useList({ sort: { field: 'name', order: 'asc' } });
  const create = donationsHooks.useCreate();
  const update = donationsHooks.useUpdate();
  const [draft, setDraft] = useState<Draft>(emptyDraft(''));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (donation) {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = donation;
      setDraft({ ...rest, date: rest.date.slice(0, 10) });
    } else setDraft(emptyDraft(purposes[0] ?? 'General Fund'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, donation]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const pickMember = (memberId: string) => {
    const member = members.data?.data.find((m) => m.memberId === memberId);
    setDraft((d) => ({ ...d, memberId, donorName: member ? member.name : d.donorName }));
  };

  const submit = () => {
    const found: Record<string, string> = {};
    if (!draft.donorName.trim()) found.donorName = 'Donor name is required.';
    if (!(draft.amount > 0)) found.amount = 'Enter an amount above zero.';
    if (!draft.date) found.date = 'Date is required.';
    setErrors(found);
    if (Object.keys(found).length) return;
    // Keep the original time of day when only the date was edited.
    const time = donation?.date.slice(10) || 'T00:00:00';
    const body = { ...draft, donorName: draft.donorName.trim(), date: `${draft.date}${time}` };
    const done = { onSuccess: () => onOpenChange(false) };
    if (donation) update.mutate({ id: donation.id, changes: body }, done);
    else create.mutate(body, done);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={donation ? `Edit ${recordNo('DON', donation.id)}` : 'Add Donation'}
      submitLabel={donation ? 'Save Changes' : 'Add Donation'}
      pending={create.isPending || update.isPending}
      onSubmit={submit}
      className="max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Member">
          <NativeSelect value={draft.memberId} onChange={(e) => pickMember(e.target.value)}>
            <option value={NON_MEMBER}>Not a member</option>
            {members.data?.data.map((m) => (
              <option key={m.id} value={m.memberId}>
                {m.name} ({m.memberId})
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Donor Name" error={errors.donorName}>
          <Input value={draft.donorName} onChange={(e) => set('donorName', e.target.value)} disabled={draft.memberId !== NON_MEMBER} />
        </Field>
        <Field label="Amount (₹)" error={errors.amount}>
          <Input type="number" min={1} value={draft.amount || ''} onChange={(e) => set('amount', Number(e.target.value))} />
        </Field>
        <Field label="Date" error={errors.date}>
          <Input type="date" value={draft.date.slice(0, 10)} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Payment Mode">
          <NativeSelect value={draft.mode} onChange={(e) => set('mode', e.target.value as Draft['mode'])}>
            {PAYMENT_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Purpose">
          <NativeSelect value={draft.purpose} onChange={(e) => set('purpose', e.target.value)}>
            {[...new Set([...purposes, draft.purpose])].filter(Boolean).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Reference / UTR No.">
          <Input value={draft.reference} onChange={(e) => set('reference', e.target.value)} />
        </Field>
        <Field label="Status">
          <NativeSelect value={draft.status} onChange={(e) => set('status', e.target.value as Draft['status'])}>
            {REVIEW_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Payment Proof (optional)">
        <FileUpload value={draft.receipt} onChange={(url) => set('receipt', url)} label="Upload screenshot or slip" />
      </Field>
    </FormDialog>
  );
}

const FILTERS = ['mode', 'status', 'purpose'];

export default function DonationsPage() {
  const url = useUrlState();
  const { data: settings } = useSettings();
  const params = url.toListParams(FILTERS, 'date');
  const list = donationsHooks.useList({ ...params, sort: url.sort ?? { field: 'date', order: 'desc' } });
  // Every matching row (no paging) for the totals and exports.
  const all = donationsHooks.useList({ search: params.search, filters: params.filters });
  const setStatus = useSetDonationStatus();
  const remove = donationsHooks.useRemove();
  const [form, setForm] = useState<{ open: boolean; donation?: Donation }>({ open: false });
  const [viewing, setViewing] = useState<Donation | null>(null);
  const [deleting, setDeleting] = useState<Donation | null>(null);

  const stats = useMemo(() => {
    const verified = (all.data?.data ?? []).filter((d) => d.status === 'Verified');
    const total = verified.reduce((sum, d) => sum + d.amount, 0);
    return {
      total,
      count: all.data?.total ?? 0,
      highest: Math.max(0, ...verified.map((d) => d.amount)),
      average: verified.length ? Math.round(total / verified.length) : 0,
    };
  }, [all.data]);

  const columns = useMemo<Column<Donation>[]>(
    () => [
      { key: 'id', header: 'Receipt No', sortable: true, render: (d) => recordNo('DON', d.id) },
      { key: 'donorName', header: 'Donor Name', sortable: true, className: 'px-4 py-3 font-medium' },
      { key: 'amount', header: 'Amount (₹)', sortable: true, className: 'px-4 py-3 text-right font-medium', render: (d) => formatNumber(d.amount) },
      { key: 'date', header: 'Date', sortable: true, className: 'whitespace-nowrap px-4 py-3', render: (d) => formatDate(d.date) },
      { key: 'mode', header: 'Payment Mode', className: 'whitespace-nowrap px-4 py-3' },
      { key: 'purpose', header: 'Purpose' },
      { key: 'status', header: 'Status', sortable: true, render: (d) => <StatusBadge status={d.status} /> },
      {
        key: 'receipt',
        header: 'Receipt',
        render: (d) => (
          <button
            type="button"
            onClick={() => exportDonationReceipt(d, settings?.societyName)}
            className="rounded-md p-1.5 text-[#C62828] hover:bg-accent"
            aria-label={`Download receipt ${recordNo('DON', d.id)}`}
            title="Download receipt (PDF)"
          >
            <FileText className="h-4 w-4" />
          </button>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (d) => (
          <RowActions
            label={recordNo('DON', d.id)}
            onEdit={() => setForm({ open: true, donation: d })}
            onView={() => setViewing(d)}
            onDelete={() => setDeleting(d)}
            more={[
              { label: 'Mark Verified', icon: BadgeCheck, hidden: d.status === 'Verified', onSelect: () => setStatus.mutate({ id: d.id, status: 'Verified' }) },
              { label: 'Mark Pending', icon: Clock, hidden: d.status === 'Pending', onSelect: () => setStatus.mutate({ id: d.id, status: 'Pending' }) },
              { label: 'Reject', icon: XCircle, destructive: true, hidden: d.status === 'Rejected', onSelect: () => setStatus.mutate({ id: d.id, status: 'Rejected' }) },
            ]}
          />
        ),
      },
    ],
    [setStatus, settings?.societyName],
  );

  const onExport = async () => {
    const rows = all.data?.data ?? [];
    await exportExcel(
      {
        title: 'Donations',
        subtitle: `${periodLabel(url.get('from'), url.get('to'))} · ${rows.length} entries`,
        columns: ['Receipt No', 'Donor', 'Amount', 'Date', 'Mode', 'Purpose', 'Reference', 'Status'],
        rows: [...rows]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((d) => [recordNo('DON', d.id), d.donorName, formatNumber(d.amount), formatDate(d.date), d.mode, d.purpose, d.reference, d.status]),
      },
      'donations',
    );
  };

  return (
    <>
      <PageHeader
        title="Donation Management"
        subtitle="View, add and verify donation entries"
        actions={
          <>
            <Button onClick={() => setForm({ open: true })}>
              <Plus className="h-4 w-4" /> Add Donation
            </Button>
            <ExportButton onExport={onExport} disabled={!all.data} />
          </>
        }
      />
      {all.isLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={HandCoins} value={formatINR(stats.total)} label="Total Donations (verified)" tone="red" />
          <StatCard icon={ReceiptText} value={stats.count} label="Total Transactions" tone="blue" />
          <StatCard icon={Star} value={formatINR(stats.highest)} label="Highest Donation" tone="amber" />
          <StatCard icon={BarChart3} value={formatINR(stats.average)} label="Average Donation" tone="blue" />
        </div>
      )}
      <FilterBar
        searchPlaceholder="Search by donor name or reference..."
        dateRange
        selects={[
          { name: 'mode', label: 'Payment Modes', options: PAYMENT_MODES },
          { name: 'status', label: 'Status', options: REVIEW_STATUSES },
          { name: 'purpose', label: 'Purposes', options: settings?.donationPurposes ?? [] },
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
      <DonationForm open={form.open} donation={form.donation} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ViewDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing ? `Donation ${recordNo('DON', viewing.id)}` : ''}
        footer={
          viewing ? (
            <>
              <Button variant="outline" onClick={() => exportDonationReceipt(viewing, settings?.societyName)}>
                <FileText className="h-4 w-4" /> Download Receipt
              </Button>
              {viewing.status !== 'Verified' ? (
                <Button
                  className="bg-[#1E8E4E] hover:bg-[#187540]"
                  onClick={() => setStatus.mutate({ id: viewing.id, status: 'Verified' }, { onSuccess: () => setViewing(null) })}
                >
                  Verify
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {viewing ? (
          <DetailList
            items={[
              ['Donor', viewing.donorName],
              ['Member ID', viewing.memberId || 'Not a member'],
              ['Amount', formatINR(viewing.amount)],
              ['Date', formatDate(viewing.date)],
              ['Payment Mode', viewing.mode],
              ['Reference', viewing.reference],
              ['Purpose', viewing.purpose],
              ['Status', <StatusBadge key="s" status={viewing.status} />],
              [
                'Payment Proof',
                viewing.receipt ? (
                  <a key="p" href={viewing.receipt} target="_blank" rel="noreferrer" className="text-maroon underline">
                    Open file
                  </a>
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
        title={`Delete ${deleting ? recordNo('DON', deleting.id) : ''}?`}
        description={deleting ? `${deleting.donorName}, ${formatINR(deleting.amount)}. This cannot be undone.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
