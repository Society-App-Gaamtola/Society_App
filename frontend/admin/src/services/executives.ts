import type { ExecutivePermission, ExecutiveRequest, Id, NewRecord } from '@/types';
import { createResource } from './core/resource';
import { membersService } from './members';

const requests = createResource<ExecutiveRequest>(
  'executiveRequests',
  'executive request',
  (r) => `${r.memberName} (${r.memberId})`,
);
const permissions = createResource<ExecutivePermission>('permissions', 'permissions', (r) => r.memberId);

const DEFAULT_PERMISSIONS = {
  events: true,
  notices: true,
  donations: false,
  expenses: false,
  reports: false,
  media: false,
  eventsNeedApproval: true,
};

export const executiveRequestsService = {
  ...requests,
  /** Approves the request, makes the member an Executive and gives default permissions. */
  async approveExecutiveRequest(id: Id) {
    const request = await requests.update(id, { status: 'Approved' }, 'Approved executive request');
    const { data: members } = await membersService.list({ filters: { memberId: request.memberId } });
    if (members[0]) await membersService.update(members[0].id, { type: 'Executive' });
    const { total } = await permissions.list({ filters: { memberId: request.memberId } });
    if (!total) await permissions.create({ memberId: request.memberId, ...DEFAULT_PERMISSIONS });
    return request;
  },
  rejectExecutiveRequest: (id: Id, reason: string) =>
    requests.update(id, { status: 'Rejected', rejectionReason: reason }, 'Rejected executive request'),
};

export const permissionsService = {
  ...permissions,
  updatePermissions: (id: Id, changes: Partial<NewRecord<ExecutivePermission>>) =>
    permissions.update(id, changes, 'Updated executive permissions'),
};
