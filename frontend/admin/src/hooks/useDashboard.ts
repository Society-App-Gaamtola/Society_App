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
