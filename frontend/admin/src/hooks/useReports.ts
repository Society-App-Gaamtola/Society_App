import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reportsService, type ReportInput } from '@/services/reports';
import type { Report } from '@/types';
import { createResourceHooks, useAction } from './createResourceHooks';

export const reportsHooks = createResourceHooks('reports', reportsService, 'Report');

export const useGenerateReport = () =>
  useAction((input: ReportInput) => reportsService.generateReport(input), ['reports'], 'Report generated');

export const useDownloadReport = () =>
  useMutation({
    mutationFn: (report: Report) => reportsService.downloadReport(report),
    onError: (error: Error) => toast.error(error.message),
  });
