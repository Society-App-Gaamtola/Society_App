import type { Notice } from '@/types';
import { createResource } from './core/resource';

export const noticesService = createResource<Notice>('notices', 'notice', (r) => r.title);
