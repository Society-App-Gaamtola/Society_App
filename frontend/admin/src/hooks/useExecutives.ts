import { executiveRequestsService, permissionsService } from '@/services/executives';
import type { ExecutivePermission, Id, NewRecord } from '@/types';
import { createResourceHooks, useAction } from './createResourceHooks';

export const executiveRequestsHooks = createResourceHooks('executiveRequests', executiveRequestsService, 'Request');
export const permissionsHooks = createResourceHooks('permissions', permissionsService, 'Permissions');

export const useApproveExecutiveRequest = () =>
  useAction(
    (id: Id) => executiveRequestsService.approveExecutiveRequest(id),
    ['executiveRequests', 'members', 'permissions'],
    'Request approved',
  );

export const useRejectExecutiveRequest = () =>
  useAction(
    ({ id, reason }: { id: Id; reason: string }) => executiveRequestsService.rejectExecutiveRequest(id, reason),
    ['executiveRequests'],
    'Request rejected',
  );

export const useUpdatePermissions = () =>
  useAction(
    ({ id, changes }: { id: Id; changes: Partial<NewRecord<ExecutivePermission>> }) =>
      permissionsService.updatePermissions(id, changes),
    ['permissions'],
    'Permissions updated',
  );
