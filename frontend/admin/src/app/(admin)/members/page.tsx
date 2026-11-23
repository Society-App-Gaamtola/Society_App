'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Trash2, UserCheck, UserPlus, UserX } from 'lucide-react';
import { Avatar, ConfirmDialog, ExportButton, PageHeader, RowActions, StatusBadge } from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar, type FilterSelect } from '@/components/FilterBar';
import { AddMemberForm } from '@/components/forms/AddMemberForm';
import { MemberForm } from '@/components/forms/MemberForm';
import { Button } from '@/components/ui/primitives';
import { DEFAULT_PAGE_SIZE } from '@/config';
import { useDeleteMember, useMemberStatus, useMembersPage } from '@/hooks/useAdminMembers';
import { useUrlState } from '@/hooks/useUrlState';
import { exportTable, type ExportFormat } from '@/lib/exporters';
import { useNavigate } from '@/lib/navigation';
import { formatDate, periodLabel } from '@/lib/utils';
import {
  adminMembersApi,
  memberMobile,
  memberName,
  membersExportTable,
  ROLE_LABEL,
  signupLabel,
  statusLabel,
  type MemberQuery,
} from '@/services/adminMembers';
import type { AdminMember, Id } from '@/types';

const FILTERS: FilterSelect[] = [
  { name: 'role', label: 'Roles', options: [{ value: 'member', label: 'Members' }, { value: 'executive', label: 'Executives' }] },
  { name: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Inactive' }] },
  { name: 'signup', label: 'Sign-ups', options: [{ value: 'completed', label: 'Completed' }, { value: 'pending', label: 'Pending' }] },
];

/** The URL (page, search, filters, join dates, sort) → the GET /admin/members query. Same URL = same cached page */
function useMemberQuery(): MemberQuery {
  const url = useUrlState();
  return {
    page: url.page,
    limit: DEFAULT_PAGE_SIZE,
    search: url.search || undefined,
    role: (url.get('role') || undefined) as MemberQuery['role'],
    status: (url.get('status') || undefined) as MemberQuery['status'],
    signup: (url.get('signup') || undefined) as MemberQuery['signup'],
    from_date: url.range.from,
    to_date: url.range.to,
    sort: url.sort?.field as MemberQuery['sort'],
    order: url.sort?.order,
  };
}

export default function MembersPage() {
  const navigate = useNavigate();
  const url = useUrlState();
  const query = useMemberQuery();
  const list = useMembersPage(query);
  const setStatus = useMemberStatus();
  const remove = useDeleteMember();

  // Picked rows are remembered with their data, so exporting them needs no extra API call
  const [picked, setPicked] = useState<Map<Id, AdminMember>>(new Map());
  const [editing, setEditing] = useState<AdminMember | null>(null);
  const [adding, setAdding] = useState(false);
  const [deactivating, setDeactivating] = useState<AdminMember | null>(null);
  const [deleting, setDeleting] = useState<AdminMember | null>(null);

  const onSelectionChange = (ids: Id[]) => {
    const onPage = new Map((list.data?.members ?? []).map((m) => [m.id as Id, m]));
    setPicked(new Map(ids.map((id) => [id, picked.get(id) ?? (onPage.get(id) as AdminMember)])));
  };

  const columns = useMemo<Column<AdminMember>[]>(
    () => [
      { key: 'member_code', header: 'Member Code', sortable: true, render: (m) => m.member_code ?? '—' },
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        render: (m) => (
          <Link href={`/members/${m.id}`} className="flex items-center gap-2 font-medium hover:text-maroon">
            <Avatar name={memberName(m)} src={m.photo_url} />
            <span className="min-w-0">
              <span className="block truncate">{memberName(m)}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">{m.email}</span>
            </span>
          </Link>
        ),
      },
      { key: 'mobile', header: 'Mobile Number', className: 'whitespace-nowrap px-4 py-3', render: memberMobile },
      { key: 'role', header: 'Role', render: (m) => <StatusBadge status={ROLE_LABEL[m.role]} /> },
      { key: 'joined', header: 'Joined', sortable: true, className: 'whitespace-nowrap px-4 py-3', render: (m) => formatDate(m.joined_on) },
      {
        key: 'status',
        header: 'Status',
        render: (m) => (
          <div className="flex flex-wrap gap-1">
            <StatusBadge status={statusLabel(m)} />
            {m.signup !== 'completed' ? <StatusBadge status={signupLabel(m)} /> : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (m) =>
          m.role === 'super_admin' ? (
            <RowActions label={memberName(m)} onView={() => navigate(`/members/${m.id}`)} />
          ) : (
            <RowActions
              label={memberName(m)}
              onEdit={() => setEditing(m)}
              onView={() => navigate(`/members/${m.id}`)}
              more={[
                m.status === 'active'
                  ? { label: 'Deactivate', icon: UserX, onSelect: () => setDeactivating(m) }
                  : { label: 'Activate', icon: UserCheck, onSelect: () => setStatus.mutate({ id: m.id, status: 'active' }) },
                { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => setDeleting(m) },
              ]}
            />
          ),
      },
    ],
    [navigate, setStatus],
  );

  /** The picked rows, or every member matching the filters (read page by page), as Excel or PDF */
  const onExport = async (format: ExportFormat) => {
    const { page, limit, ...filters } = query;
    const rows = picked.size ? [...picked.values()] : await adminMembersApi.listAll(filters);
    // The filters in words, printed under the title, e.g. 'Search "patel" · Executive · Joined: All time'
    const subtitle = picked.size
      ? 'Selected members'
      : [
          query.search && `Search "${query.search}"`,
          query.role && ROLE_LABEL[query.role],
          query.status && (query.status === 'active' ? 'Active' : 'Inactive'),
          query.signup && `Sign-up ${query.signup}`,
          `Joined: ${periodLabel(query.from_date, query.to_date)}`,
        ]
          .filter(Boolean)
          .join(' · ');
    await exportTable(membersExportTable(rows, subtitle), 'members', format);
  };

  return (
    <>
      <PageHeader
        title="Manage Members"
        subtitle="Members join through the app, or are added here. Search, view and manage them"
        actions={
          <>
            <Button onClick={() => setAdding(true)}>
              <UserPlus className="h-4 w-4" /> Add Member
            </Button>
            <ExportButton onExport={onExport} disabled={!list.data?.pagination.total} />
          </>
        }
      />
      <FilterBar searchPlaceholder="Search by name, mobile, email or member code..." selects={FILTERS} dateRange />
      {picked.size ? (
        <p className="mb-2 text-xs text-muted-foreground">
          {picked.size} selected. Export will include only these.{' '}
          <button type="button" className="font-semibold text-maroon" onClick={() => setPicked(new Map())}>
            Clear
          </button>
        </p>
      ) : null}
      <DataTable
        columns={columns}
        rows={list.data?.members}
        total={list.data?.pagination.total ?? 0}
        page={url.page}
        pageSize={DEFAULT_PAGE_SIZE}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        errorMessage={list.error?.message}
        onRetry={() => list.refetch()}
        sort={url.sort}
        onSortChange={({ field, order }) => url.setParams({ sort: field, order })}
        onPageChange={(page) => url.setParams({ page })}
        selectedIds={[...picked.keys()]}
        onSelectionChange={onSelectionChange}
        itemLabel="members"
      />

      <MemberForm open={!!editing} onOpenChange={(open) => !open && setEditing(null)} member={editing ?? undefined} />
      <AddMemberForm open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title={`Deactivate ${deactivating ? memberName(deactivating) : ''}?`}
        description="They are logged out of the app at once and can't log in until you activate them again."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => deactivating && setStatus.mutate({ id: deactivating.id, status: 'suspended' })}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting ? memberName(deleting) : ''}?`}
        description="The member is removed from the society list and logged out. Their donations stay in the records."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
