import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settings';
import type { AppSettings, NewRecord } from '@/types';
import { useAction } from './createResourceHooks';

export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: settingsService.getSettings });

export const useUpdateSettings = () =>
  useAction(
    (changes: Partial<NewRecord<AppSettings>>) => settingsService.updateSettings(changes),
    ['settings'],
    'Settings saved',
  );
