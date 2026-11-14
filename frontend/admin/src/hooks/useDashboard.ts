import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard';
import { financeService } from '@/services/finance';
import type { DateRange } from '@/types';

export const useDashboardStats = (range: DateRange = {}) =>
  useQuery({
    queryKey: ['dashboard', range],
    queryFn: () => dashboardService.getDashboardStats(range),
    placeholderData: keepPreviousData,
  });

export const useActivities = (page: number, pageSize: number, enabled = true) =>
  useQuery({
    queryKey: ['auditLogs', 'activities', page, pageSize],
    queryFn: () => dashboardService.listActivities(page, pageSize),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useFinanceSummary = (range: DateRange) =>
  useQuery({
    queryKey: ['finance', range],
    queryFn: () => financeService.getSummary(range),
    placeholderData: keepPreviousData,
  });
