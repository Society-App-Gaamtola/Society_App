import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LIST_CACHE_MS } from '@/config';
import { dashboardService } from '@/services/dashboard';
import type { DateRange } from '@/types';

export const useDashboardStats = (range: DateRange = {}) =>
  useQuery({
    queryKey: ['dashboard', range],
    queryFn: () => dashboardService.getDashboardStats(range),
    placeholderData: keepPreviousData,
    staleTime: LIST_CACHE_MS,
    gcTime: LIST_CACHE_MS * 2,
  });

export const useActivities = (page: number, pageSize: number, enabled = true) =>
  useQuery({
    queryKey: ['auditLogs', 'activities', page, pageSize],
    queryFn: () => dashboardService.listActivities(page, pageSize),
    placeholderData: keepPreviousData,
    staleTime: LIST_CACHE_MS, // same page cache as every other list (see useBackendList)
    gcTime: LIST_CACHE_MS * 2,
    enabled,
  });
