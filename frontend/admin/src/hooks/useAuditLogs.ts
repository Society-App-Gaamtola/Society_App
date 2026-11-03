import { auditLogsService } from '@/services/auditLogs';
import { createResourceHooks } from './createResourceHooks';

export const auditLogsHooks = createResourceHooks('auditLogs', auditLogsService, 'Audit log');
