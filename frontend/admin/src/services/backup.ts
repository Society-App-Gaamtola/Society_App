import { todayISO } from '@/lib/utils';
import { adapter } from './core/adapter';

const COLLECTIONS = [
  'members',
  'events',
  'notices',
  'donations',
  'expenses',
  'executiveRequests',
  'permissions',
  'media',
  'reports',
  'volunteerDuties',
  'assignments',
  'auditLogs',
];

export const backupService = {
  /** Downloads every collection plus settings as one JSON file. */
  async downloadBackup() {
    const entries = await Promise.all(COLLECTIONS.map(async (name) => [name, (await adapter.list(name, {})).data] as const));
    const backup = { exportedAt: new Date().toISOString(), ...Object.fromEntries(entries), settings: await adapter.getObject('settings') };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `society-backup-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },
};
