'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Pencil, Plus } from 'lucide-react';
import { Avatar, FileLink, ConfirmDialog, Field, FormDialog, PageHeader, ReasonDialog, StatusBadge, Tabs } from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { Button, NativeSelect, Switch } from '@/components/ui/primitives';
import {
  executiveRequestsHooks,
  permissionsHooks,
  useAddExecutive,
  useApproveExecutiveRequest,
  useRejectExecutiveRequest,
  useRemoveExecutive,
  useUpdatePermissions,
} from '@/hooks/useExecutives';
import { membersHooks } from '@/hooks/useMembers';
import { useUrlState } from '@/hooks/useUrlState';
import { formatDate } from '@/lib/utils';
import { DEFAULT_PERMISSIONS, type PermissionFlags } from '@/services/executives';
import { PERMISSION_KEYS, type ExecutivePermission, type ExecutiveRequest, type Member, type PermissionKey } from '@/types';

const PERMISSION_TITLES: Record<PermissionKey, string> = {
  events: 'Events',
  notices: 'Notices',
  donations: 'Donations',
  expenses: 'Expenses',
  reports: 'Reports',
  media: 'Media',
  settings: 'Settings',
};

const REQUEST_STATUSES = [
  { value: 'Pending review', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
] as const;

/** Member photos by member ID, for avatars in both tables. */
function useMemberLookup() {
  const { data } = membersHooks.useList({});
  return useMemo(() => new Map((data?.data ?? []).map((m) => [m.memberId, m])), [data]);
}

function RequestsView() {
  const url = useUrlState();
  const members = useMemberLookup();
  const status = url.get('status') || 'Pending review';
  const list = executiveRequestsHooks.useList({ ...url.toListParams(), filters: { status }, sort: url.sort ?? { field: 'submittedOn', order: 'desc' } });
  const counts = {
    'Pending review': executiveRequestsHooks.useList({ filters: { status: 'Pending review' }, page: 1, pageSize: 1 }).data?.total,
    Approved: executiveRequestsHooks.useList({ filters: { status: 'Approved' }, page: 1, pageSize: 1 }).data?.total,
    Rejected: executiveRequestsHooks.useList({ filters: { status: 'Rejected' }, page: 1, pageSize: 1 }).data?.total,
  };
  const approve = useApproveExecutiveRequest();
  const reject = useRejectExecutiveRequest();
  const [approving, setApproving] = useState<ExecutiveRequest | null>(null);
  const [rejecting, setRejecting] = useState<ExecutiveRequest | null>(null);

  const columns = useMemo<Column<ExecutiveRequest>[]>(
    () => [
      {
        key: 'memberName',
        header: 'Applicant',
        render: (r) => {
          const member = members.get(r.memberId);
          return (
            <div className="flex items-center gap-2">
              <Avatar name={r.memberName} src={member?.photo} size={36} />
              <div>
                {member ? (
                  <Link href={`/members/${member.id}`} className="font-medium hover:text-maroon">
                    {r.memberName}
                  </Link>
                ) : (
                  <span className="font-medium">{r.memberName}</span>
                )}
                <div className="text-xs text-muted-foreground">{r.contact}</div>
              </div>
            </div>
          );
        },
      },
      { key: 'memberId', header: 'Member ID' },
      { key: 'submittedOn', header: 'Request Date', sortable: true, className: 'whitespace-nowrap px-4 py-3', render: (r) => formatDate(r.submittedOn) },
      {
        key: 'reason',
        header: 'Message',
        className: 'max-w-xs px-4 py-3 text-xs',
        render: (r) => (
          <>
            {r.reason}
            {r.donationReference ? <div className="mt-1 text-muted-foreground">Donation ref: {r.donationReference}</div> : null}
            {r.rejectionReason ? <div className="mt-1 text-[#C62828]">Rejected: {r.rejectionReason}</div> : null}
          </>
        ),
      },
      {
        key: 'documents',
        header: 'Supporting Documents',
        render: (r) => {
          const docs = [...(r.documents ?? []), ...(r.paymentProof ? [{ name: 'Payment Proof', url: r.paymentProof }] : [])];
          if (!docs.length) return <span className="text-xs text-muted-foreground">None</span>;
          return (
            <ul className="space-y-1 text-xs">
              {docs.map((d) => (
                <li key={d.name} className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  {d.url ? (
                    <FileLink href={d.url} className="text-maroon underline">
                      {d.name}
                    </FileLink>
                  ) : (
                    <span title="File not uploaded">{d.name}</span>
                  )}
                </li>
              ))}
            </ul>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r) =>
          r.status === 'Pending review' ? (
            <div className="flex flex-col gap-1.5">
              <Button size="sm" className="bg-[#1E8E4E] hover:bg-[#187540]" onClick={() => setApproving(r)}>
                Approve
              </Button>
              <Button size="sm" variant="outline" className="border-[#C62828] text-[#C62828]" onClick={() => setRejecting(r)}>
                Reject
              </Button>
            </div>
          ) : (
            <StatusBadge status={r.status} />
          ),
      },
    ],
    [members],
  );

  return (
    <>
      <Tabs
        tabs={REQUEST_STATUSES.map((s) => ({ value: s.value, label: s.label, count: counts[s.value] }))}
        value={status}
        onChange={(value) => url.setParams({ status: value === 'Pending review' ? undefined : value })}
      />
      <FilterBar searchPlaceholder="Search by name or mobile number..." keep={['tab', 'status']} />
      <DataTable
        columns={columns}
        rows={list.data?.data}
        total={list.data?.total ?? 0}
        page={url.page}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        sort={url.sort}
        onSortChange={({ field, order }) => url.setParams({ sort: field, order })}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="requests"
        emptyMessage="No requests here."
      />
      <ConfirmDialog
        open={!!approving}
        onOpenChange={(open) => !open && setApproving(null)}
        title={`Approve ${approving?.memberName}?`}
        description="They become an Executive Member with default permissions (Events and Notices). You can change these on the Permissions tab."
        confirmLabel="Approve"
        onConfirm={() => approving && approve.mutate(approving.id)}
      />
      <ReasonDialog
        open={!!rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={`Reject ${rejecting?.memberName}'s request`}
        pending={reject.isPending}
        onSubmit={(reason) => rejecting && reject.mutate({ id: rejecting.id, reason }, { onSuccess: () => setRejecting(null) })}
      />
    </>
  );
}

const flagsOf = (p?: ExecutivePermission): PermissionFlags =>
  p
    ? { ...Object.fromEntries(PERMISSION_KEYS.map((k) => [k, !!p[k]])), eventsNeedApproval: !!p.eventsNeedApproval } as PermissionFlags
    : { ...Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])), eventsNeedApproval: true } as PermissionFlags;

function PermissionToggles({ flags, onChange }: { flags: PermissionFlags; onChange: (flags: PermissionFlags) => void }) {
  return (
    <div className="space-y-3">
      {PERMISSION_KEYS.map((key) => (
        <div key={key} className="flex items-center justify-between text-sm">
          {PERMISSION_TITLES[key]}
          <Switch label={PERMISSION_TITLES[key]} checked={flags[key]} onCheckedChange={(v) => onChange({ ...flags, [key]: v })} />
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span>
          Their events need admin approval
          <span className="block text-xs text-muted-foreground">New events stay as Draft until you publish them.</span>
        </span>
        <Switch label="Events need approval" checked={flags.eventsNeedApproval} onCheckedChange={(v) => onChange({ ...flags, eventsNeedApproval: v })} />
      </div>
    </div>
  );
}

function AddExecutiveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const candidates = membersHooks.useList({ filters: { type: 'Normal', status: 'Active' }, sort: { field: 'name', order: 'asc' } });
  const add = useAddExecutive();
  const [memberId, setMemberId] = useState('');
  const [flags, setFlags] = useState<PermissionFlags>(DEFAULT_PERMISSIONS);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setMemberId('');
      setFlags(DEFAULT_PERMISSIONS);
      setError('');
    }
  }, [open]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Executive"
      description="Gives an active member admin access to the sections you choose."
      submitLabel="Add Executive"
      pending={add.isPending}
      onSubmit={() => (memberId ? add.mutate({ memberId, flags }, { onSuccess: () => onOpenChange(false) }) : setError('Choose a member.'))}
    >
      <Field label="Member" error={error}>
        <NativeSelect value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">Select a member…</option>
          {candidates.data?.data.map((m) => (
            <option key={m.id} value={m.memberId}>
              {m.name} ({m.memberId})
            </option>
          ))}
        </NativeSelect>
      </Field>
      <PermissionToggles flags={flags} onChange={setFlags} />
    </FormDialog>
  );
}

function EditPermissionsDialog({
  member,
  permission,
  onOpenChange,
}: {
  member: Member | null;
  permission?: ExecutivePermission;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdatePermissions();
  const add = useAddExecutive();
  const remove = useRemoveExecutive();
  const [flags, setFlags] = useState<PermissionFlags>(flagsOf(permission));
  const [confirmRemove, setConfirmRemove] = useState(false);
  useEffect(() => setFlags(flagsOf(permission)), [permission, member]);
  const done = { onSuccess: () => onOpenChange(false) };

  return (
    <>
      <FormDialog
        open={!!member}
        onOpenChange={onOpenChange}
        title={`Permissions: ${member?.name ?? ''}`}
        description={member?.memberId}
        submitLabel="Save Permissions"
        pending={update.isPending || add.isPending}
        onSubmit={() =>
          permission ? update.mutate({ id: permission.id, changes: flags }, done) : member && add.mutate({ memberId: member.memberId, flags }, done)
        }
      >
        <PermissionToggles flags={flags} onChange={setFlags} />
        <div className="border-t border-border pt-3">
          <Button type="button" variant="outline" className="border-[#C62828] text-[#C62828]" onClick={() => setConfirmRemove(true)} disabled={!permission}>
            Remove executive access
          </Button>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${member?.name}'s executive access?`}
        description="All permissions are removed and they become a Normal member."
        confirmLabel="Remove"
        destructive
        onConfirm={() => permission && remove.mutate(permission, done)}
      />
    </>
  );
}

function PermissionsView() {
  const url = useUrlState();
  const executives = membersHooks.useList({ ...url.toListParams(), filters: { type: 'Executive' } });
  const permissions = permissionsHooks.useList({});
  const update = useUpdatePermissions();
  const add = useAddExecutive();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const byMember = useMemo(() => new Map((permissions.data?.data ?? []).map((p) => [p.memberId, p])), [permissions.data]);

  const columns = useMemo<Column<Member>[]>(() => {
    const toggle = (m: Member, key: PermissionKey, value: boolean) => {
      const p = byMember.get(m.memberId);
      if (p) update.mutate({ id: p.id, changes: { [key]: value } });
      else add.mutate({ memberId: m.memberId, flags: { ...flagsOf(), [key]: value } });
    };
    return [
      {
        key: 'name',
        header: 'Member',
        sortable: true,
        render: (m) => (
          <Link href={`/members/${m.id}`} className="flex items-center gap-2 hover:text-maroon">
            <Avatar name={m.name} src={m.photo} size={34} />
            <span>
              <span className="block font-medium">{m.name}</span>
              <span className="block text-xs text-muted-foreground">{m.memberId}</span>
            </span>
          </Link>
        ),
      },
      { key: 'type', header: 'Role', render: (m) => <StatusBadge status={m.type} /> },
      ...PERMISSION_KEYS.map(
        (key): Column<Member> => ({
          key,
          header: PERMISSION_TITLES[key],
          render: (m) => (
            <Switch
              label={`${PERMISSION_TITLES[key]} for ${m.name}`}
              checked={!!byMember.get(m.memberId)?.[key]}
              onCheckedChange={(v) => toggle(m, key, v)}
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
    ];
  }, [add, byMember, update]);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add Executive
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={executives.data?.data}
        total={executives.data?.total ?? 0}
        page={url.page}
        isLoading={executives.isLoading}
        isError={executives.isError}
        onRetry={() => executives.refetch()}
        sort={url.sort}
        onSortChange={({ field, order }) => url.setParams({ sort: field, order })}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="executives"
        emptyMessage="No executive members yet."
      />
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Switch label="Allowed example" checked onCheckedChange={() => undefined} disabled /> Allowed
        </span>
        <span className="flex items-center gap-1.5">
          <Switch label="Not allowed example" checked={false} onCheckedChange={() => undefined} disabled /> Not allowed
        </span>
        <span>Changes save as soon as you flip a switch.</span>
      </div>
      <AddExecutiveDialog open={adding} onOpenChange={setAdding} />
      <EditPermissionsDialog member={editing} permission={editing ? byMember.get(editing.memberId) : undefined} onOpenChange={(open) => !open && setEditing(null)} />
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
        title={tab === 'requests' ? 'Executive Requests' : 'Executive Permissions'}
        subtitle={tab === 'requests' ? 'Review and manage executive membership requests' : 'Grant or manage access for executive members'}
      />
      <Tabs
        variant="underline"
        tabs={[
          { value: 'requests', label: 'Requests' },
          { value: 'permissions', label: 'Permissions' },
        ]}
        value={tab}
        onChange={(value) => router.replace(value === 'permissions' ? '/executives?tab=permissions' : '/executives', { scroll: false })}
      />
      {tab === 'requests' ? <RequestsView /> : <PermissionsView />}
    </>
  );
}
