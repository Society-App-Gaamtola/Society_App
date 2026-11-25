import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LIST_CACHE_MS } from '@/config';

/**
 * Shared hooks for every screen connected to the backend.
 *
 * Caching: each page of a list is kept by its exact query (page, filters, sort). Going back to a page you already
 * opened within LIST_CACHE_MS shows it from memory with no API call. Saving a change (useBackendAction) marks that
 * screen's cache old, so only the page on screen is fetched again; other pages reload when you open them.
 */

/** One page of a list. `key` names the screen (e.g. 'adminMembers'); `query` is page + filters + sort */
export function useBackendList<Q extends object, R>(key: string, query: Q, load: (query: Q) => Promise<R>) {
  return useQuery({
    queryKey: [key, 'list', query],
    queryFn: () => load(query),
    placeholderData: keepPreviousData, // the old page stays visible while the next one loads
    staleTime: LIST_CACHE_MS,
    gcTime: LIST_CACHE_MS * 2,
  });
}

/** One record, cached the same way */
export function useBackendOne<R>(key: string, id: string | number | undefined, load: (id: string | number) => Promise<R>) {
  return useQuery({
    queryKey: [key, 'one', String(id)],
    queryFn: () => load(id as string | number),
    enabled: id !== undefined,
    staleTime: LIST_CACHE_MS,
    gcTime: LIST_CACHE_MS * 2,
  });
}

/**
 * A change (edit, status, delete). `run` returns the backend's { message }, shown as a toast; errors show the
 * backend's message. On success every cached page of `keys` is marked old (plus the dashboard).
 */
export function useBackendAction<In, Out extends { message: string }>(keys: string[], run: (input: In) => Promise<Out>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: ({ message }) => {
      // The dashboard (cards, Recent Activities) changes with every save
      for (const key of [...keys, 'dashboard']) client.invalidateQueries({ queryKey: [key] });
      toast.success(message);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
