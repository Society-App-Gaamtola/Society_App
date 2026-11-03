import { noticesService } from '@/services/notices';
import { createResourceHooks } from './createResourceHooks';

export const noticesHooks = createResourceHooks('notices', noticesService, 'Notice');
