import { eventsService } from '@/services/events';
import { createResourceHooks } from './createResourceHooks';

export const eventsHooks = createResourceHooks('events', eventsService, 'Event');
