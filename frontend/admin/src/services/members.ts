import type { Assignment, Member, NewRecord, VolunteerDuty } from '@/types';
import { createResource } from './core/resource';

const resource = createResource<Member>('members', 'member', (r) => r.name);

export const membersService = {
  ...resource,
  /** Gives the new member the next free GM number. */
  async createMember(body: Omit<NewRecord<Member>, 'memberId'>) {
    const { data } = await resource.list();
    const last = Math.max(0, ...data.map((m) => Number(m.memberId.replace(/\D/g, '')) || 0));
    return resource.create({ ...body, memberId: `GM${String(last + 1).padStart(3, '0')}` });
  },
};

export const dutiesService = createResource<VolunteerDuty>('volunteerDuties', 'duty', (r) => r.title);
export const assignmentsService = createResource<Assignment>('assignments', 'assignment', (r) => r.memberId);
