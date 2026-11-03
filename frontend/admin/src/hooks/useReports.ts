import { reportsService } from '@/services/reports';
import type { Report } from '@/types';
import { createResourceHooks, useAction } from './createResourceHooks';

export const reportsHooks = createResourceHooks('reports', reportsService, 'Report');

export const useGenerateReport = () =>
  useAction(
    (input: { title: string; period: string; format: Report['format'] }) => reportsService.generateReport(input),
    ['reports'],
    'Report generated',
  );
