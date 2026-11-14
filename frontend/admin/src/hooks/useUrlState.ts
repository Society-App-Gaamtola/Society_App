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

  /** Clears filters, search and page. Params named in `keep` (such as the open tab) stay. */
  const reset = useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams();
      for (const key of keep) {
        const value = params.get(key);
        if (value) next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('search') ?? '';
  const sortField = params.get('sort');
  const sort = useMemo(
    () => (sortField ? { field: sortField, order: params.get('order') === 'desc' ? 'desc' as const : 'asc' as const } : undefined),
    [sortField, params],
  );

  /** Builds service list params. `dateField` turns the from/to URL params into a range filter. */
  const toListParams = useCallback(
    (filterNames: string[] = [], dateField?: string, pageSize = DEFAULT_PAGE_SIZE): ListParams => {
      const filters: Filters = {};
      for (const name of filterNames) filters[name] = params.get(name) ?? undefined;
      if (dateField) {
        filters[`${dateField}_gte`] = params.get('from') ?? undefined;
        const to = params.get('to');
        // Dates may carry a time, so the last day must include all of it.
        filters[`${dateField}_lte`] = to ? `${to}T23:59:59` : undefined;
      }
      return { page, pageSize, search: search || undefined, filters, sort };
    },
    [page, params, search, sort],
  );

  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;
  const range = useMemo(() => ({ from, to }), [from, to]);

  return { get: (name: string) => params.get(name) ?? '', page, search, sort, range, setParams, reset, toListParams };
}
