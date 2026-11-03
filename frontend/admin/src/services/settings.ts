import type { AppSettings, NewRecord } from '@/types';
import { adapter } from './core/adapter';
import { writeAudit } from './core/resource';

export const settingsService = {
  getSettings: async () => (await adapter.getObject('settings')) as unknown as AppSettings,
  async updateSettings(changes: Partial<NewRecord<AppSettings>>) {
    const row = await adapter.patchObject('settings', { ...changes, updated_at: new Date().toISOString() });
    await writeAudit('Updated settings', 'App Settings');
    return row as unknown as AppSettings;
  },
};
