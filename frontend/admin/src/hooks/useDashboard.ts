import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LIST_CACHE_MS } from '@/config';
import { dashboardService, type AuditLogQuery } from '@/services/dashboard';
import { useBackendList } from './useBackend';
import type { DateRange } from '@/types';

export const useDashboardStats = (range: DateRange = {}) =>
  useQuery({
    queryKey: ['dashboard', range],
    queryFn: () => dashboardService.getDashboardStats(range),
    placeholderData: keepPreviousData,
    staleTime: LIST_CACHE_MS,
    gcTime: LIST_CACHE_MS * 2,
  });

/** The Audit Logs screen: one page of changes or logins (refreshed by every save, like the dashboard) */
export const useAuditLogs = (query: AuditLogQuery) => useBackendList('auditLogs', query, dashboardService.auditLogs);

export const useActivities =(page: number, pageSize: number, enabled = true) =>
  useQuery({
    queryKey: ['auditLogs', 'activities', page, pageSize],
    queryFn: () => dashboardService.listActivities(page, pageSize),
    placeholderData: keepPreviousData,
    staleTime: LIST_CACHE_MS, // same page cache as every other list (see useBackendList)
    gcTime: LIST_CACHE_MS * 2,
    enabled,
  });
