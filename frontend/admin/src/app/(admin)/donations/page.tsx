'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BarChart3, Clock, FileText, HandCoins, Plus, ReceiptText, Star, XCircle } from 'lucide-react';
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
import { MemberPicker } from '@/components/MemberPicker';
import { Button, Input, NativeSelect, Textarea } from '@/components/ui/primitives';
import { DEFAULT_PAGE_SIZE } from '@/config';
import { useAppSettings, useDeleteDonation, useDonationsPage, useDonationStatus, useSaveDonation } from '@/hooks/useFinance';
import { useUrlState } from '@/hooks/useUrlState';
import { exportDonationReceipt, exportTable, type ExportFormat } from '@/lib/exporters';
import { formatDate, formatDateTime, formatINR, formatNumber, periodLabel, recordNo, todayISO } from '@/lib/utils';
import { uploadFinanceFile } from '@/services/cloudinary';
import {
  donationsApi,
  donationStatusLabel,
  DONATION_STATUS_OPTIONS,
  methodLabel,
  PAYMENT_MODE_OPTIONS,
  type Donation,
  type DonationBody,
  type DonationQuery,
  type PaymentMode,
} from '@/services/finance';

/** What the panel can enter: UPI made outside the app is "upi_app" */
const METHODS = [
  { value: 'upi_app', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
];

type Draft = Omit<DonationBody, 'amount'> & { amount: string; donor_name: string };

const emptyDraft = (purpose: string): Draft => ({
  donor_user_id: null,
  donor_name: '',
  amount: '',
  purpose,
  method: 'upi_app',
  reference_no: '',
  donated_on: todayISO(),
  status: 'success',
  proof_url: null,
  note: '',
});

const toDraft = (d: Donation): Draft => ({
  donor_user_id: d.donor_user_id,
  donor_name: d.donor_name,
  amount: String(d.amount),
  purpose: d.purpose ?? '',
  method: d.method,
  reference_no: d.reference_no ?? '',
  donated_on: d.donated_on,
  status: d.status === 'success' || d.status === 'pending' ? d.status : 'rejected',
  proof_url: d.proof_url,
  note: d.note ?? '',
});

function DonationForm({ open, onOpenChange, donation }: { open: boolean; onOpenChange: (open: boolean) => void; donation?: Donation }) {
  const { data: settings } = useAppSettings();
  const purposes = settings?.settings.donation_purposes ?? [];
  const save = useSaveDonation();
  const [draft, setDraft] = useState<Draft>(emptyDraft(''));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDraft(donation ? toDraft(donation) : emptyDraft(purposes[0] ?? ''));
    // purposes only matter for a new donation's default
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, donation]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const found: Record<string, string> = {};
    if (!draft.donor_user_id && !draft.donor_name.trim()) found.donor_name = 'Choose a member or type the donor name.';
    if (!(Number(draft.amount) > 0)) found.amount = 'Enter an amount above zero.';
    if (!draft.purpose) found.purpose = 'Choose a purpose.';
    if (!draft.donated_on) found.donated_on = 'Date is required.';
    else if (draft.donated_on > todayISO()) found.donated_on = "The date can't be in the future.";
    setErrors(found);
    if (Object.keys(found).length) return;
    const body: DonationBody = {
      ...draft,
      amount: Number(draft.amount),
      donor_name: draft.donor_user_id ? undefined : draft.donor_name.trim(),
      reference_no: draft.reference_no.trim(),
      note: draft.note.trim(),
    };
    save.mutate({ id: donation?.id, body }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={donation ? `Edit ${recordNo('DON', donation.id)}` : 'Add Donation'}
      submitLabel={donation ? 'Save Changes' : 'Add Donation'}
      pending={save.isPending}
      onSubmit={submit}
      className="max-w-2xl"
    >
      <Field label="Member">
        <MemberPicker
          value={draft.donor_user_id}
          emptyLabel="Not a member (type the name below)"
          onChange={(id, name) => setDraft((d) => ({ ...d, donor_user_id: id, donor_name: id ? name : d.donor_name }))}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Donor Name" error={errors.donor_name}>
          <Input value={draft.donor_name} onChange={(e) => set('donor_name', e.target.value)} disabled={!!draft.donor_user_id} />
        </Field>
        <Field label="Amount (₹)" error={errors.amount}>
          <Input type="number" min={1} value={draft.amount} onChange={(e) => set('amount', e.target.value)} />
        </Field>
        <Field label="Date" error={errors.donated_on}>
          <Input type="date" value={draft.donated_on} max={todayISO()} onChange={(e) => set('donated_on', e.target.value)} />
        </Field>
        <Field label="Payment Mode">
          <NativeSelect value={draft.method} onChange={(e) => set('method', e.target.value)}>
            {[...METHODS, ...(METHODS.some((m) => m.value === draft.method) ? [] : [{ value: draft.method, label: methodLabel(draft.method) }])].map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Purpose" error={errors.purpose}>
          <NativeSelect value={draft.purpose} onChange={(e) => set('purpose', e.target.value)}>
            <option value="">Choose…</option>
            {[...new Set([...purposes, draft.purpose])].filter(Boolean).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Reference / UTR No.">
          <Input value={draft.reference_no} onChange={(e) => set('reference_no', e.target.value)} />
        </Field>
        <Field label="Status">
          <NativeSelect value={draft.status} onChange={(e) => set('status', e.target.value)}>
            {DONATION_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Note (optional)">
        <Textarea rows={2} value={draft.note} onChange={(e) => set('note', e.target.value)} />
      </Field>
      <Field label="Payment Proof (optional)">
        <FileUpload value={draft.proof_url} onChange={(url) => set('proof_url', url)} label="Upload screenshot or slip" maxMb={10} upload={uploadFinanceFile} />
      </Field>
    </FormDialog>
  );
}

/** The URL (page, search, filters, dates, sort) → the GET /admin/donations query. Same URL = same cached page */
function useDonationQuery(): DonationQuery {
  const url = useUrlState();
  return {
    page: url.page,
    limit: DEFAULT_PAGE_SIZE,
    search: url.search || undefined,
    status: url.get('status') || undefined,
    mode: (url.get('mode') || undefined) as PaymentMode | undefined,
    purpose: url.get('purpose') || undefined,
    from_date: url.range.from,
    to_date: url.range.to,
    sort: (url.sort?.field as DonationQuery['sort']) ?? 'date',
    order: url.sort?.order ?? 'desc',
  };
}

export default function DonationsPage() {
  const url = useUrlState();
  const { data: settings } = useAppSettings();
  const societyName = settings?.settings.society_name;
  const query = useDonationQuery();
  const list = useDonationsPage(query);
  const setStatus = useDonationStatus();
  const remove = useDeleteDonation();
  const [form, setForm] = useState<{ open: boolean; donation?: Donation }>({ open: false });
  const [viewing, setViewing] = useState<Donation | null>(null);
  const [deleting, setDeleting] = useState<Donation | null>(null);
  const summary = list.data?.summary;

  const receipt = (d: Donation) => exportDonationReceipt(d, { societyName, modeLabel: methodLabel, statusLabel: donationStatusLabel });

  const columns = useMemo<Column<Donation>[]>(
    () => [
      { key: 'id', header: 'Receipt No', render: (d) => recordNo('DON', d.id) },
      {
        key: 'donor',
        header: 'Donor Name',
        render: (d) => (
          <span>
            <span className="block font-medium">{d.donor_name}</span>
            <span className="block text-xs text-muted-foreground">{d.member_code ?? (d.donor_user_id ? 'Member' : 'Not a member')}</span>
          </span>
        ),
      },
      { key: 'amount', header: 'Amount (₹)', sortable: true, className: 'px-4 py-3 text-right font-medium', render: (d) => formatNumber(d.amount) },
      { key: 'date', header: 'Date', sortable: true, className: 'whitespace-nowrap px-4 py-3', render: (d) => formatDate(d.donated_on) },
      { key: 'mode', header: 'Payment Mode', className: 'whitespace-nowrap px-4 py-3', render: (d) => methodLabel(d.method) },
      { key: 'purpose', header: 'Purpose', render: (d) => d.purpose ?? '—' },
      { key: 'status', header: 'Status', render: (d) => <StatusBadge status={donationStatusLabel(d.status)} /> },
      {
        key: 'receipt',
        header: 'Receipt',
        render: (d) => (
          <button type="button" onClick={() => receipt(d)} className="rounded-md p-1.5 text-[#C62828] hover:bg-accent" aria-label={`Download receipt ${recordNo('DON', d.id)}`} title="Download receipt (PDF)">
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
              { label: 'Mark Verified', icon: BadgeCheck, hidden: d.status === 'success', onSelect: () => setStatus.mutate({ id: d.id, status: 'success' }) },
              { label: 'Mark Pending', icon: Clock, hidden: d.status === 'pending', onSelect: () => setStatus.mutate({ id: d.id, status: 'pending' }) },
              { label: 'Reject', icon: XCircle, destructive: true, hidden: d.status === 'rejected', onSelect: () => setStatus.mutate({ id: d.id, status: 'rejected' }) },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setStatus, societyName],
  );

  /** Every donation matching the filters, read page by page */
  const onExport = async (format: ExportFormat) => {
    const { page, limit, ...filters } = query;
    const rows = await donationsApi.listAll(filters);
    await exportTable(
      {
        title: 'Donations',
        subtitle: `${periodLabel(query.from_date, query.to_date)} · ${rows.length} entries`,
        columns: ['Receipt No', 'Donor', 'Member Code', 'Amount', 'Date', 'Mode', 'Purpose', 'Reference', 'Status'],
        rows: rows.map((d) => [recordNo('DON', d.id), d.donor_name, d.member_code ?? '', formatNumber(d.amount), formatDate(d.donated_on), methodLabel(d.method), d.purpose ?? '', d.reference_no ?? '', donationStatusLabel(d.status)]),
      },
      'donations',
      format,
    );
  };

  return (
    <>
      <PageHeader
        title="Donation Management"
        subtitle="Members' donations from the app and entries added here. Verify them to count them in the totals"
        actions={
          <>
            <Button onClick={() => setForm({ open: true })}>
              <Plus className="h-4 w-4" /> Add Donation
            </Button>
            <ExportButton onExport={onExport} disabled={!list.data?.pagination.total} />
          </>
        }
      />
      {!summary ? (
        <StatCardsSkeleton />
      ) : (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={HandCoins} value={formatINR(summary.verified_total)} label="Total Donations (verified)" tone="red" />
          <StatCard icon={ReceiptText} value={summary.count} label="Total Entries" tone="blue" />
          <StatCard icon={Star} value={formatINR(summary.highest)} label="Highest Donation" tone="amber" />
          <StatCard icon={BarChart3} value={formatINR(summary.average)} label="Average Donation" tone="blue" />
        </div>
      )}
      <FilterBar
        searchPlaceholder="Search by donor, member code or reference..."
        dateRange
        selects={[
          { name: 'mode', label: 'Payment Modes', options: PAYMENT_MODE_OPTIONS },
          { name: 'status', label: 'Status', options: DONATION_STATUS_OPTIONS },
          { name: 'purpose', label: 'Purposes', options: settings?.settings.donation_purposes ?? [] },
        ]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.donations}
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
        emptyMessage="No donations found."
      />
      <DonationForm open={form.open} donation={form.donation} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ViewDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing ? `Donation ${recordNo('DON', viewing.id)}` : ''}
        footer={
          viewing ? (
            <>
              <Button variant="outline" onClick={() => receipt(viewing)}>
                <FileText className="h-4 w-4" /> Download Receipt
              </Button>
              {viewing.status !== 'success' ? (
                <Button className="bg-[#1E8E4E] hover:bg-[#187540]" onClick={() => setStatus.mutate({ id: viewing.id, status: 'success' }, { onSuccess: () => setViewing(null) })}>
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
              ['Donor', viewing.donor_name],
              ['Member Code', viewing.member_code ?? (viewing.donor_user_id ? 'Member' : 'Not a member')],
              ['Amount', formatINR(viewing.amount)],
              ['Date', formatDate(viewing.donated_on)],
              ['Payment Mode', methodLabel(viewing.method)],
              ['Reference', viewing.reference_no || '—'],
              ['Purpose', viewing.purpose || '—'],
              ['Status', <StatusBadge key="s" status={donationStatusLabel(viewing.status)} />],
              ['Entered By', viewing.entered_by_name ?? 'The member (app)'],
              ...(viewing.verified_by_name ? [['Reviewed By', viewing.verified_by_name] as [string, string]] : []),
              ...(viewing.confirmed_at ? [['Verified On', formatDateTime(viewing.confirmed_at)] as [string, string]] : []),
              ...(viewing.note ? [['Note', viewing.note] as [string, string]] : []),
              [
                'Payment Proof',
                viewing.proof_url ? (
                  <FileLink key="p" href={viewing.proof_url} className="text-maroon underline">
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
        title={`Delete ${deleting ? recordNo('DON', deleting.id) : ''}?`}
        description={deleting ? `${deleting.donor_name}, ${formatINR(deleting.amount)}.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
