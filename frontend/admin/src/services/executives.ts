import type { ExecutivePermission, ExecutiveRequest, Id, NewRecord, PermissionKey } from '@/types';
import { createResource } from './core/resource';
import { membersService } from './members';

const requests = createResource<ExecutiveRequest>(
  'executiveRequests',
  'executive request',
  (r) => `${r.memberName} (${r.memberId})`,
);
const permissions = createResource<ExecutivePermission>('permissions', 'permissions', (r) => r.memberId);

export type PermissionFlags = Record<PermissionKey, boolean> & { eventsNeedApproval: boolean };

export const DEFAULT_PERMISSIONS: PermissionFlags = {
  events: true,
  notices: true,
  donations: false,
  expenses: false,
  reports: false,
  media: false,
  settings: false,
  eventsNeedApproval: true,
};

async function setMemberType(memberId: string, type: 'Executive' | 'Normal') {
  const { data } = await membersService.list({ filters: { memberId } });
  if (data[0] && data[0].type !== type) await membersService.update(data[0].id, { type });
}

/** Makes the member an Executive and gives them permissions, unless they already have some. */
async function grantExecutive(memberId: string, flags: PermissionFlags) {
  await setMemberType(memberId, 'Executive');
  const { data } = await permissions.list({ filters: { memberId } });
  if (data[0]) return permissions.update(data[0].id, flags, 'Updated executive permissions');
  return permissions.create({ memberId, ...flags });
}

export const executiveRequestsService = {
  ...requests,
  async approveExecutiveRequest(id: Id) {
    const request = await requests.update(id, { status: 'Approved' }, 'Approved executive request');
    const { total } = await permissions.list({ filters: { memberId: request.memberId } });
    if (total) await setMemberType(request.memberId, 'Executive');
    else await grantExecutive(request.memberId, DEFAULT_PERMISSIONS);
    return request;
  },
  rejectExecutiveRequest: (id: Id, reason: string) =>
    requests.update(id, { status: 'Rejected', rejectionReason: reason }, 'Rejected executive request'),
};

export const permissionsService = {
  ...permissions,
  updatePermissions: (id: Id, changes: Partial<NewRecord<ExecutivePermission>>) =>
    permissions.update(id, changes, 'Updated executive permissions'),
  addExecutive: ({ memberId, flags }: { memberId: string; flags: PermissionFlags }) => grantExecutive(memberId, flags),
  /** Takes away all admin access and turns the member back into a Normal member. */
  async removeExecutive(permission: ExecutivePermission) {
    await permissions.remove(permission.id);
    await setMemberType(permission.memberId, 'Normal');
  },
};
