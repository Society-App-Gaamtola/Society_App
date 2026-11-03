'use client';

import { useState } from 'react';
import { StatusBadge, PageHeader } from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { membersHooks } from '@/hooks/useMembers';
import { useUrlState } from '@/hooks/useUrlState';
import type { Id, Member } from '@/types';

const COLUMNS: Column<Member>[] = [
  { key: 'memberId', header: 'Member ID', sortable: true },
  { key: 'name', header: 'Name', sortable: true, className: 'px-4 py-3 font-medium' },
  { key: 'mobile', header: 'Mobile' },
  { key: 'email', header: 'Email' },
  { key: 'type', header: 'Type', sortable: true, render: (m) => <StatusBadge status={m.type} /> },
  { key: 'status', header: 'Status', sortable: true, render: (m) => <StatusBadge status={m.status} /> },
];

export default function MembersPage() {
  const url = useUrlState();
  const [selected, setSelected] = useState<Id[]>([]);
  const list = membersHooks.useList(url.toListParams(['type', 'status']));

  return (
    <>
      <PageHeader title="Members" subtitle="All registered society members." />
      <FilterBar
        searchPlaceholder="Search members..."
        selects={[
          { name: 'type', label: 'Types', options: ['Executive', 'Normal'] },
          { name: 'status', label: 'Statuses', options: ['Active', 'Inactive'] },
        ]}
      />
      <DataTable
        columns={COLUMNS}
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
      />
    </>
  );
}
