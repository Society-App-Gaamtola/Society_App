import type { AdminMember, AdminMemberDetails, MemberRole } from '@/types';
import { formatDate, fromUtc } from '@/lib/utils';
import type { ExportTable } from '@/lib/exporters';
import { api, fetchAllPages, type Pagination } from './core/backend';

/** Filters, sort and page of GET /admin/members (all optional except page / limit) */
export type MemberQuery = {
  page: number;
  limit: number;
  search?: string;
  role?: MemberRole;
  status?: AdminMember['status'];
  signup?: 'completed' | 'pending';
  from_date?: string;
  to_date?: string;
  sort?: 'name' | 'joined' | 'member_code';
  order?: 'asc' | 'desc';
};

export type MemberChanges = Partial<{
  username: string;
  email: string;
  country_code: string;
  mobile_number: string;
  address: string;
  member_code: string;
}>;

type MemberPage = { members: AdminMember[]; pagination: Pagination };

/** Join and last-login times come as UTC: show them in local time */
const local = (m: AdminMember): AdminMember => ({ ...m, joined_on: fromUtc(m.joined_on) ?? m.joined_on, last_login_at: fromUtc(m.last_login_at) });

// ---------- Labels shared by the list, the detail page and the exports ----------

export const ROLE_LABEL: Record<MemberRole, string> = { super_admin: 'Super Admin', executive: 'Executive', member: 'Member' };
export const statusLabel = (m: AdminMember) => (m.status === 'active' ? 'Active' : 'Inactive');
export const signupLabel = (m: AdminMember) => (m.signup === 'completed' ? 'Completed' : 'Sign-up pending');
export const memberName = (m: AdminMember) => m.name || m.email;
export const memberMobile = (m: AdminMember) => `${m.country_code} ${m.mobile}`;

/** Backend calls for the Members screens (Super Admin only) */
export const adminMembersApi = {
  list: async (query: MemberQuery) => {
    const { data } = await api<MemberPage>('GET', '/admin/members', { query });
    return { ...data, members: data.members.map(local) };
  },
  get: async (id: string | number) => {
    const { data } = await api<AdminMemberDetails>('GET', `/admin/members/${id}`);
    return { ...data, member: local(data.member) };
  },
  edit: (id: number, changes: MemberChanges) => api<{ member: AdminMember }>('PUT', `/admin/members/${id}`, { body: changes }),
  setStatus: (id: number, status: AdminMember['status']) =>
    api<{ member: AdminMember }>('PUT', `/admin/members/${id}/status`, { body: { status } }),
  remove: (id: number) => api<undefined>('DELETE', `/admin/members/${id}`),
  /** The role has its own API (it notifies the member) */
  setRole: (id: number, role: Exclude<MemberRole, 'super_admin'>) => api<unknown>('PUT', `/executive/members/${id}/role`, { body: { role } }),

  /** Every member matching the filters, read page by page (for exports) */
  listAll: (query: Omit<MemberQuery, 'page' | 'limit'>) =>
    fetchAllPages(async (page, limit) => {
      const { members, pagination } = await adminMembersApi.list({ ...query, page, limit });
      return { rows: members, pagination };
    }),
};

/** The members table for Excel / PDF */
export const membersExportTable = (members: AdminMember[], subtitle: string): ExportTable => ({
  title: 'Members',
  subtitle: `${subtitle} · ${members.length} members`,
  columns: ['Member Code', 'Name', 'Mobile', 'Email', 'Role', 'Status', 'Sign-up', 'Joined', 'Address'],
  rows: members.map((m) => [
    m.member_code ?? '',
    memberName(m),
    memberMobile(m),
    m.email,
    ROLE_LABEL[m.role],
    statusLabel(m),
    signupLabel(m),
    formatDate(m.joined_on),
    m.address ?? '',
  ]),
});
