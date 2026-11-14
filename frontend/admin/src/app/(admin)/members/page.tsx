'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, UserCheck, UserX } from 'lucide-react';
import { Avatar, ConfirmDialog, ExportButton, PageHeader, RowActions, StatusBadge } from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { MemberForm } from '@/components/forms/MemberForm';
import { Button } from '@/components/ui/primitives';
import { membersHooks } from '@/hooks/useMembers';
import { useUrlState } from '@/hooks/useUrlState';
import { exportExcel } from '@/lib/exporters';
import { formatDate } from '@/lib/utils';
import { membersService } from '@/services/members';
import type { Id, Member } from '@/types';

const FILTERS = ['type', 'status'];

export default function MembersPage() {
  const router = useRouter();
  const url = useUrlState();
  const [selected, setSelected] = useState<Id[]>([]);
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const params = url.toListParams(FILTERS);
  const list = membersHooks.useList(params);
  const update = membersHooks.useUpdate();
  const remove = membersHooks.useRemove();

  const columns = useMemo<Column<Member>[]>(
    () => [
      { key: 'memberId', header: 'Member ID', sortable: true },
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        render: (m) => (
          <Link href={`/members/${m.id}`} className="flex items-center gap-2 font-medium hover:text-maroon">
            <Avatar name={m.name} src={m.photo} />
            {m.name}
          </Link>
        ),
      },
      { key: 'mobile', header: 'Mobile Number', className: 'whitespace-nowrap px-4 py-3' },
      { key: 'type', header: 'Member Type', sortable: true, render: (m) => <StatusBadge status={m.type} /> },
      { key: 'joinedOn', header: 'Join Date', sortable: true, className: 'whitespace-nowrap px-4 py-3', render: (m) => formatDate(m.joinedOn) },
      { key: 'status', header: 'Status', sortable: true, render: (m) => <StatusBadge status={m.status} /> },
      {
        key: 'actions',
        header: 'Actions',
        render: (m) => (
          <RowActions
            label={m.name}
            onEdit={() => setEditing(m)}
            onView={() => router.push(`/members/${m.id}`)}
            more={[
              m.status === 'Active'
                ? { label: 'Deactivate', icon: UserX, onSelect: () => update.mutate({ id: m.id, changes: { status: 'Inactive' } }) }
                : { label: 'Activate', icon: UserCheck, onSelect: () => update.mutate({ id: m.id, changes: { status: 'Active' } }) },
              { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => setDeleting(m) },
            ]}
          />
        ),
      },
    ],
    [router, update],
  );

  /** Exports the selected rows, or every row that matches the filters. */
  const onExport = async () => {
    const { data } = await membersService.list({ search: params.search, filters: params.filters, sort: params.sort });
    const rows = selected.length ? data.filter((m) => selected.includes(m.id)) : data;
    await exportExcel(
      {
        title: 'Members',
        subtitle: `${rows.length} members`,
        columns: ['Member ID', 'Name', 'Mobile', 'Email', 'Type', 'Join Date', 'Status'],
        rows: rows.map((m) => [m.memberId, m.name, m.mobile, m.email, m.type, formatDate(m.joinedOn), m.status]),
      },
      'members',
    );
  };

  return (
    <>
      <PageHeader
        title="Manage Members"
        subtitle="View, search and manage all society members"
        actions={
          <>
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add Member
            </Button>
            <ExportButton onExport={onExport} />
          </>
        }
      />
      <FilterBar
        searchPlaceholder="Search by name, mobile number or member ID..."
        selects={[
          { name: 'type', label: 'Members', options: [{ value: 'Executive', label: 'Executive Members' }, { value: 'Normal', label: 'Normal Members' }] },
          { name: 'status', label: 'Status', options: ['Active', 'Inactive'] },
        ]}
      />
      {selected.length ? (
        <p className="mb-2 text-xs text-muted-foreground">
          {selected.length} selected. Export will include only these.{' '}
          <button type="button" className="font-semibold text-maroon" onClick={() => setSelected([])}>
            Clear
          </button>
        </p>
      ) : null}
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
        selectedIds={selected}
        onSelectionChange={setSelected}
        itemLabel="members"
      />
      <MemberForm open={adding} onOpenChange={setAdding} />
      <MemberForm open={!!editing} onOpenChange={(open) => !open && setEditing(null)} member={editing ?? undefined} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="The member is removed from the society list. Their donations stay in the records."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
