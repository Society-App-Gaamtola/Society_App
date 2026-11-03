import type { AuditLog } from '@/types';
import { createResource } from './core/resource';

export const auditLogsService = createResource<AuditLog>('auditLogs', 'audit log', (r) => r.action);
