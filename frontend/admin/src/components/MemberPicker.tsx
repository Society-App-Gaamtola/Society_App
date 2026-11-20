'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input, NativeSelect } from '@/components/ui/primitives';
import { useMembersPage } from '@/hooks/useAdminMembers';
import { memberMobile, memberName, type MemberQuery } from '@/services/adminMembers';

/**
 * Choose a member: a search box (on the backend, after typing stops) and a list of up to 50 matches.
 * `filters` narrows the list (e.g. role: 'member', status: 'active'). `emptyLabel` adds a "nobody" choice
 * (value null), e.g. "Not a member" for a donation.
 */
export function MemberPicker({
  value,
  onChange,
  filters = {},
  emptyLabel,
}: {
  value: number | null;
  onChange: (id: number | null, name: string) => void;
  filters?: Partial<MemberQuery>;
  emptyLabel?: string;
}) {
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const list = useMembersPage({ page: 1, limit: 50, signup: 'completed', sort: 'name', order: 'asc', ...filters, search: search || undefined });

  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), 400);
    return () => clearTimeout(timer);
  }, [typed]);

  const members = list.data?.members ?? [];
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name, mobile or member code…" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </div>
      <NativeSelect
        value={value ?? ''}
        disabled={list.isLoading}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : null;
          const member = members.find((m) => m.id === id);
          onChange(id, member ? memberName(member) : '');
        }}
      >
        {emptyLabel ? <option value="">{emptyLabel}</option> : <option value="">{list.isLoading ? 'Loading members…' : `Select a member (${list.data?.pagination.total ?? 0} found)…`}</option>}
        {/* Keep the chosen member visible even when the search no longer finds them */}
        {value && !members.some((m) => m.id === value) ? <option value={value}>Selected member</option> : null}
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {memberName(m)} {m.member_code ? `(${m.member_code})` : ''} · {memberMobile(m)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
