'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Pencil, Plus, Search } from 'lucide-react';
import { Avatar, ConfirmDialog, Field, FileLink, FormDialog, PageHeader, ReasonDialog, StatusBadge, Tabs } from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { Button, Input, NativeSelect, Switch } from '@/components/ui/primitives';
import { DEFAULT_PAGE_SIZE } from '@/config';
import { useAddExecutive, useExecutivesPage, useRemoveExecutive, useRequestsPage, useReviewRequest, useSetPermissions } from '@/hooks/useAdminContent';
import { useMembersPage } from '@/hooks/useAdminMembers';
import { useUrlState } from '@/hooks/useUrlState';
import { formatDate, formatINR } from '@/lib/utils';
import { DEFAULT_PERMISSIONS, SECTION_LABEL, type RequestStatus } from '@/services/adminExecutives';
import { memberMobile, memberName } from '@/services/adminMembers';
import { PERMISSION_SECTIONS, type AdminExecutive, type BackendExecutiveRequest, type ExecutivePermissions, type PermissionSection } from '@/types';

const REQUEST_TABS: { value: RequestStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

// ---------- Requests (GET /executive/executive-requests, review API) ----------

function RequestsView() {
  const url = useUrlState();
  const status = (url.get('status') || 'pending') as RequestStatus;
  const list = useRequestsPage({ page: url.page, limit: DEFAULT_PAGE_SIZE, status, search: url.search || undefined });
  const review = useReviewRequest();
  const [approving, setApproving] = useState<BackendExecutiveRequest | null>(null);
  const [rejecting, setRejecting] = useState<BackendExecutiveRequest | null>(null);
  const counts = list.data?.counts;

  const columns = useMemo<Column<BackendExecutiveRequest>[]>(
    () => [
      {
        key: 'applicant',
        header: 'Applicant',
        render: (r) => (
          <Link href={`/members/${r.user_id}`} className="flex items-center gap-2 hover:text-maroon">
            <Avatar name={r.full_name || r.email} size={36} />
            <span>
              <span className="block font-medium">{r.full_name || r.email}</span>
              <span className="block text-xs text-muted-foreground">{r.mobile}</span>
            </span>
          </Link>
        ),
      },
      { key: 'date', header: 'Request Date', className: 'whitespace-nowrap px-4 py-3', render: (r) => formatDate(r.created_at) },
      {
        key: 'reason',
        header: 'Message',
        className: 'max-w-xs px-4 py-3 text-xs',
        render: (r) => (
          <>
            {r.reason}
            <div className="mt-1 text-muted-foreground">
              Donation {formatINR(r.donation_amount)} · UTR {r.reference_no}
              {r.donation_status ? ` · ${r.donation_status}` : ' · not found in donations'}
            </div>
            {r.review_note ? <div className="mt-1 text-[#C62828]">Note: {r.review_note}</div> : null}
          </>
        ),
      },
      {
        key: 'proof',
        header: 'Payment Proof',
        render: (r) =>
          r.payment_proof_url ? (
            <FileLink href={r.payment_proof_url} className="inline-flex items-center gap-1 text-xs text-maroon underline">
              <FileText className="h-3.5 w-3.5" /> View
            </FileLink>
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r) =>
          r.status === 'pending' ? (
            <div className="flex flex-col gap-1.5">
              <Button size="sm" className="bg-[#1E8E4E] hover:bg-[#187540]" onClick={() => setApproving(r)}>
                Approve
              </Button>
              <Button size="sm" variant="outline" className="border-[#C62828] text-[#C62828]" onClick={() => setRejecting(r)}>
                Reject
              </Button>
            </div>
          ) : (
            <StatusBadge status={r.status === 'approved' ? 'Approved' : 'Rejected'} />
          ),
      },
    ],
    [],
  );

  return (
    <>
      <Tabs
        tabs={REQUEST_TABS.map((t) => ({ value: t.value, label: t.label, count: counts?.[t.value] }))}
        value={status}
        onChange={(value) => url.setParams({ status: value === 'pending' ? undefined : value })}
      />
      <FilterBar searchPlaceholder="Search by name, mobile or email..." keep={['tab', 'status']} />
      <DataTable
        columns={columns}
        rows={list.data?.requests}
        total={list.data?.pagination.total ?? 0}
        page={url.page}
        pageSize={DEFAULT_PAGE_SIZE}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        errorMessage={list.error?.message}
        onRetry={() => list.refetch()}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="requests"
        emptyMessage="No requests here."
      />
      <ConfirmDialog
        open={!!approving}
        onOpenChange={(open) => !open && setApproving(null)}
        title={`Approve ${approving?.full_name || approving?.email}?`}
        description="They become an Executive with the default permissions (Events and Notices, events need your approval). They are logged out and log in again with the new role."
        confirmLabel="Approve"
        onConfirm={() => approving && review.mutate({ id: approving.id, action: 'approve' })}
      />
      <ReasonDialog
        open={!!rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={`Reject ${rejecting?.full_name || rejecting?.email}'s request`}
        pending={review.isPending}
        onSubmit={(reason) => rejecting && review.mutate({ id: rejecting.id, action: 'reject', reason }, { onSuccess: () => setRejecting(null) })}
      />
    </>
  );
}

// ---------- Permissions ----------

const withSection = (p: ExecutivePermissions, section: PermissionSection, on: boolean): ExecutivePermissions => ({
  sections: on ? [...new Set([...p.sections, section])] : p.sections.filter((s) => s !== section),
});

function PermissionToggles({ value, onChange }: { value: ExecutivePermissions; onChange: (value: ExecutivePermissions) => void }) {
  return (
    <div className="space-y-3">
      {PERMISSION_SECTIONS.map((section) => (
        <div key={section} className="flex items-center justify-between text-sm">
          {SECTION_LABEL[section]}
          <Switch label={SECTION_LABEL[section]} checked={value.sections.includes(section)} onCheckedChange={(on) => onChange(withSection(value, section, on))} />
        </div>
      ))}
    </div>
  );
}

/** Pick an active member (searched on the backend, 50 at a time) and their permissions */
function AddExecutiveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const add = useAddExecutive();
  const [search, setSearch] = useState('');
  const [typed, setTyped] = useState('');
  const [memberId, setMemberId] = useState('');
  const [permissions, setPermissions] = useState<ExecutivePermissions>(DEFAULT_PERMISSIONS);
  const [error, setError] = useState('');
  const candidates = useMembersPage({ page: 1, limit: 50, role: 'member', status: 'active', signup: 'completed', search: search || undefined, sort: 'name', order: 'asc' });

  useEffect(() => {
    if (open) {
      setSearch('');
      setTyped('');
      setMemberId('');
      setPermissions(DEFAULT_PERMISSIONS);
      setError('');
    }
  }, [open]);

  // Search after typing stops for a moment
  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), 400);
    return () => clearTimeout(timer);
  }, [typed]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Executive"
      description="Gives an active member executive access to the sections you choose. They log in again with the new role."
      submitLabel="Add Executive"
      pending={add.isPending}
      onSubmit={() => (memberId ? add.mutate({ id: Number(memberId), permissions }, { onSuccess: () => onOpenChange(false) }) : setError('Choose a member.'))}
    >
      <Field label="Member" error={error}>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, mobile or member code…" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
          <NativeSelect value={memberId} onChange={(e) => setMemberId(e.target.value)} disabled={candidates.isLoading}>
            <option value="">{candidates.isLoading ? 'Loading members…' : `Select a member (${candidates.data?.pagination.total ?? 0} found)…`}</option>
            {candidates.data?.members.map((m) => (
              <option key={m.id} value={m.id}>
                {memberName(m)} {m.member_code ? `(${m.member_code})` : ''} · {memberMobile(m)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </Field>
      <PermissionToggles value={permissions} onChange={setPermissions} />
    </FormDialog>
  );
}

function EditPermissionsDialog({ executive, onOpenChange }: { executive: AdminExecutive | null; onOpenChange: (open: boolean) => void }) {
  const save = useSetPermissions();
  const remove = useRemoveExecutive();
  const [permissions, setPermissions] = useState<ExecutivePermissions>(DEFAULT_PERMISSIONS);
  const [confirmRemove, setConfirmRemove] = useState(false);
  useEffect(() => {
    if (executive) setPermissions(executive.permissions);
  }, [executive]);
  const done = { onSuccess: () => onOpenChange(false) };

  return (
    <>
      <FormDialog
        open={!!executive}
        onOpenChange={onOpenChange}
        title={`Permissions: ${executive ? memberName(executive) : ''}`}
        description={executive?.member_code ?? undefined}
        submitLabel="Save Permissions"
        pending={save.isPending}
        onSubmit={() => executive && save.mutate({ id: executive.id, permissions }, done)}
      >
        <PermissionToggles value={permissions} onChange={setPermissions} />
        <div className="border-t border-border pt-3">
          <Button type="button" variant="outline" className="border-[#C62828] text-[#C62828]" onClick={() => setConfirmRemove(true)}>
            Remove executive access
          </Button>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${executive ? memberName(executive) : ''}'s executive access?`}
        description="All permissions are removed, they become a normal member and are logged out of the app."
        confirmLabel="Remove"
        destructive
        onConfirm={() => executive && remove.mutate(executive.id, done)}
      />
    </>
  );
}

function PermissionsView() {
  const url = useUrlState();
  const list = useExecutivesPage({ page: url.page, limit: DEFAULT_PAGE_SIZE, search: url.search || undefined });
  const save = useSetPermissions();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AdminExecutive | null>(null);

  const columns = useMemo<Column<AdminExecutive>[]>(
    () => [
      {
        key: 'name',
        header: 'Executive',
        render: (m) => (
          <Link href={`/members/${m.id}`} className="flex items-center gap-2 hover:text-maroon">
            <Avatar name={memberName(m)} src={m.photo_url} size={34} />
            <span>
              <span className="block font-medium">{memberName(m)}</span>
              <span className="block text-xs text-muted-foreground">{m.member_code ?? memberMobile(m)}</span>
            </span>
          </Link>
        ),
      },
      ...PERMISSION_SECTIONS.map(
        (section): Column<AdminExecutive> => ({
          key: section,
          header: SECTION_LABEL[section],
          render: (m) => (
            <Switch
              label={`${SECTION_LABEL[section]} for ${memberName(m)}`}
              checked={m.permissions.sections.includes(section)}
              disabled={save.isPending}
              onCheckedChange={(on) => save.mutate({ id: m.id, permissions: withSection(m.permissions, section, on) })}
            />
          ),
        }),
      ),
      {
        key: 'actions',
        header: 'Actions',
        render: (m) => (
          <Button size="sm" variant="outline" className="border-maroon text-maroon" onClick={() => setEditing(m)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ),
      },
    ],
    [save],
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-60 flex-1">
          <FilterBar searchPlaceholder="Search executives by name, mobile or member code..." keep={['tab']} />
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add Executive
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={list.data?.executives}
        total={list.data?.pagination.total ?? 0}
        page={url.page}
        pageSize={DEFAULT_PAGE_SIZE}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        errorMessage={list.error?.message}
        onRetry={() => list.refetch()}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="executives"
        emptyMessage="No executives yet. Add one, or approve an Executive Request."
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Changes save as soon as you flip a switch and apply to the executive at once. Events, Notices and Media are checked by the app today;
        Donations, Expenses, Reports and Settings apply when those sections open to executives.
      </p>
      <AddExecutiveDialog open={adding} onOpenChange={setAdding} />
      <EditPermissionsDialog executive={editing} onOpenChange={(open) => !open && setEditing(null)} />
    </>
  );
}

export default function ExecutivesPage() {
  const router = useRouter();
  const url = useUrlState();
  const tab = url.get('tab') === 'permissions' ? 'permissions' : 'requests';
  return (
    <>
      <PageHeader
        title={tab === 'requests' ? 'Executive Requests' : 'Executives & Permissions'}
        subtitle={tab === 'requests' ? 'Review and manage executive membership requests' : 'Executives and the sections they can manage'}
      />
      <Tabs
        variant="underline"
        tabs={[
          { value: 'requests', label: 'Requests' },
          { value: 'permissions', label: 'Executives & Permissions' },
        ]}
        value={tab}
        onChange={(value) => router.replace(value === 'permissions' ? '/executives?tab=permissions' : '/executives', { scroll: false })}
      />
      {tab === 'requests' ? <RequestsView /> : <PermissionsView />}
    </>
  );
}
