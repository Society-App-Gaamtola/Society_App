import { assignmentsService, dutiesService, membersService } from '@/services/members';
import type { Member, NewRecord } from '@/types';
import { createResourceHooks, useAction } from './createResourceHooks';

export const membersHooks = createResourceHooks('members', membersService, 'Member');
export const dutiesHooks = createResourceHooks('volunteerDuties', dutiesService, 'Duty');
export const assignmentsHooks = createResourceHooks('assignments', assignmentsService, 'Assignment');

export const useCreateMember = () =>
  useAction(
    (body: Omit<NewRecord<Member>, 'memberId'>) => membersService.createMember(body),
    ['members'],
    'Member added',
  );
