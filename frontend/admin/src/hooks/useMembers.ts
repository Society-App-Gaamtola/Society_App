import { membersService } from '@/services/members';
import { createResourceHooks } from './createResourceHooks';

export const membersHooks = createResourceHooks('members', membersService, 'Member');
