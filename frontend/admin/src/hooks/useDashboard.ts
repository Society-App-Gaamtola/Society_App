import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard';

export const useDashboardStats = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: dashboardService.getDashboardStats });
