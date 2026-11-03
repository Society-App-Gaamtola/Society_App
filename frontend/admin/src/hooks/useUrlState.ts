'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_PAGE_SIZE } from '@/config';
import type { Filters, ListParams } from '@/services/core/adapter';

/** Keeps page, search, sort and filters in the URL so they survive reloads and can be shared. */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  /** Changing anything except the page goes back to page 1. */
  const setParams = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(params.toString());
      if (!('page' in patch)) next.delete('page');
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('search') ?? '';
  const sortField = params.get('sort');
  const sort = useMemo(
    () => (sortField ? { field: sortField, order: params.get('order') === 'desc' ? 'desc' as const : 'asc' as const } : undefined),
    [sortField, params],
  );

  /** Builds service list params. `dateField` turns the from/to URL params into a range filter. */
  const toListParams = useCallback(
    (filterNames: string[] = [], dateField?: string): ListParams => {
      const filters: Filters = {};
      for (const name of filterNames) filters[name] = params.get(name) ?? undefined;
      if (dateField) {
        filters[`${dateField}_gte`] = params.get('from') ?? undefined;
        const to = params.get('to');
        // Dates may carry a time, so the last day must include all of it.
        filters[`${dateField}_lte`] = to ? `${to}T23:59:59` : undefined;
      }
      return { page, pageSize: DEFAULT_PAGE_SIZE, search: search || undefined, filters, sort };
    },
    [page, params, search, sort],
  );

  return { get: (name: string) => params.get(name) ?? '', page, search, sort, setParams, reset, toListParams };
}
