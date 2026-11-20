import { fromUtc } from '@/lib/utils';
import type { AdminExecutive, BackendExecutiveRequest, ExecutivePermissions, PermissionSection } from '@/types';
import { adminMembersApi } from './adminMembers';
import { api, type Pagination } from './core/backend';

/**
 * Executives for the panel: the list with permissions (GET /admin/executives), permissions
 * (PUT /admin/executives/:id/permissions), and making / removing an executive with the shared role API.
 * Requests: GET /executive/executive-requests (+ counts per status) and their review API.
 */

export const SECTION_LABEL: Record<PermissionSection, string> = {
  events: 'Events',
  notices: 'Notices',
  donations: 'Donations',
  expenses: 'Expenses',
  reports: 'Reports',
  media: 'Media',
  settings: 'Settings',
};

/** What a new executive gets (the backend's DEFAULT_EXECUTIVE_SECTIONS) */
export const DEFAULT_PERMISSIONS: ExecutivePermissions = { sections: ['events', 'notices'] };

export type ExecutiveQuery = { page: number; limit: number; search?: string; sort?: 'name' | 'joined' | 'member_code'; order?: 'asc' | 'desc' };

export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type RequestQuery = { page: number; limit: number; status: RequestStatus; search?: string };
type RequestPage = { requests: BackendExecutiveRequest[]; counts: Record<string, number>; pagination: Pagination };

export const executivesApi = {
  list: async (query: ExecutiveQuery) => {
    const { data } = await api<{ executives: AdminExecutive[]; pagination: Pagination }>('GET', '/admin/executives', { query });
    return { ...data, executives: data.executives.map((e) => ({ ...e, joined_on: fromUtc(e.joined_on) ?? e.joined_on })) };
  },
  setPermissions: (id: number, permissions: ExecutivePermissions) =>
    api<{ permissions: ExecutivePermissions }>('PUT', `/admin/executives/${id}/permissions`, { body: permissions }),

  /** Makes a member an executive (they get the default permissions), then saves the chosen ones if different */
  async add(id: number, permissions: ExecutivePermissions) {
    const promoted = await adminMembersApi.setRole(id, 'executive');
    const same = [...permissions.sections].sort().join() === [...DEFAULT_PERMISSIONS.sections].sort().join();
    return same ? promoted : executivesApi.setPermissions(id, permissions);
  },
  /** Back to a normal member: the backend removes every permission and logs them out */
  remove: (id: number) => adminMembersApi.setRole(id, 'member'),

  requests: async (query: RequestQuery) => {
    const { data } = await api<RequestPage>('GET', '/executive/executive-requests', { query });
    return { ...data, requests: data.requests.map((r) => ({ ...r, created_at: fromUtc(r.created_at) ?? r.created_at })) };
  },
  reviewRequest: (id: number, action: 'approve' | 'reject', reason?: string) =>
    api<undefined>('PUT', `/executive/executive-requests/${id}/review`, { body: { action, ...(reason ? { reason } : {}) } }),
};
