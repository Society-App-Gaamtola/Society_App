import type { Member } from '@/types';
import { createResource } from './core/resource';

export const membersService = createResource<Member>('members', 'member', (r) => r.name);
