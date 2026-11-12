import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pagination } from '../api/user';

export type Page<T> = { items: T[]; pagination: Pagination };

/**
 * A list the API sends page by page: first page, more on scroll, pull-to-refresh.
 * `fetchPage` must be memoised with its filters: when it changes, the list starts again from page 1.
 */
export function usePagedList<T>(fetchPage: (page: number) => Promise<Page<T>>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the newest request may update the list, so a slow answer for old filters can't replace a newer one.
  const latestRequest = useRef(0);

  const load = useCallback(
    async (nextPage: number, mode: 'first' | 'more' | 'refresh') => {
      const requestId = ++latestRequest.current;
      if (mode === 'first') {
        setItems([]);
        setLoading(true);
      }
      if (mode === 'more') setLoadingMore(true);
      if (mode === 'refresh') setRefreshing(true);

      try {
        const { items: rows, pagination } = await fetchPage(nextPage);
        if (requestId !== latestRequest.current) return;
        setItems((previous) => (nextPage === 1 ? rows : [...previous, ...rows]));
        setPage(nextPage);
        setHasMore(pagination.has_more);
        setError(null);
      } catch (e) {
        if (requestId !== latestRequest.current) return;
        // The API client already handles expired logins.
        setError(e instanceof Error ? e.message : 'Could not load the list.');
      } finally {
        if (requestId === latestRequest.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    load(1, 'first');
  }, [load]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore && !refreshing) load(page + 1, 'more');
  }, [hasMore, loading, loadingMore, refreshing, load, page]);

  const refresh = useCallback(() => load(1, 'refresh'), [load]);

  return { items, loading, loadingMore, refreshing, error, loadMore, refresh };
}
