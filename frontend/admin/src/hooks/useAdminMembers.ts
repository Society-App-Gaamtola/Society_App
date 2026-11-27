import { adminMembersApi, type MemberChanges, type MemberQuery, type NewMember } from '@/services/adminMembers';
import type { AdminMember, MemberRole } from '@/types';
import { useBackendAction, useBackendList, useBackendOne } from './useBackend';

/** Cache name for every Members screen: a change anywhere refreshes the list and the detail */
const KEY = 'adminMembers';
/** The Executives tab lists executives too: a role, status or delete change must refresh it as well */
const EXECUTIVES = 'adminExecutives';

export const useMembersPage = (query: MemberQuery) => useBackendList(KEY, query, adminMembersApi.list);

export const useMemberDetails = (id: string | number | undefined) => useBackendOne(KEY, id, adminMembersApi.get);

export const useAddMember = () => useBackendAction([KEY, EXECUTIVES], (member: NewMember) => adminMembersApi.create(member));

export const useEditMember = () =>
  // Saves the changed fields, then the role if it changed (the role has its own API). Shows the first message
  useBackendAction([KEY, EXECUTIVES], async ({ id, changes, role }: { id: number; changes: MemberChanges; role?: Exclude<MemberRole, 'super_admin'> }) => {
    const messages: string[] = [];
    if (Object.keys(changes).length) messages.push((await adminMembersApi.edit(id, changes)).message);
    if (role) messages.push((await adminMembersApi.setRole(id, role)).message);
    return { message: messages[0] ?? 'No changes to save' };
  });

export const useMemberStatus = () =>
  useBackendAction([KEY, EXECUTIVES], ({ id, status }: { id: number; status: AdminMember['status'] }) => adminMembersApi.setStatus(id, status));

/** Member ↔ executive (PUT /executive/members/:id/role): the member is notified and logged out of every device */
export const useMemberRole = () =>
  useBackendAction([KEY, EXECUTIVES], ({ id, role }: { id: number; role: Exclude<MemberRole, 'super_admin'> }) => adminMembersApi.setRole(id, role));

export const useDeleteMember =() => useBackendAction([KEY, EXECUTIVES], (id: number) => adminMembersApi.remove(id));
