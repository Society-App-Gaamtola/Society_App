import type { Event } from '@/types';
import { createResource } from './core/resource';

export const eventsService = createResource<Event>('events', 'event', (r) => r.title);
