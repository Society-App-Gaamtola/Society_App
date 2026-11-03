import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ListParams } from '@/services/core/adapter';
import type { Resource } from '@/services/core/resource';
import type { BaseRecord, Id, NewRecord } from '@/types';

/** Runs a mutation, refreshes the given modules plus dashboard and audit log, and shows a toast. */
export function useAction<In, Out>(fn: (input: In) => Promise<Out>, keys: string[], successMessage: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of [...keys, 'dashboard', 'auditLogs']) client.invalidateQueries({ queryKey: [key] });
      toast.success(successMessage);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function createResourceHooks<T extends BaseRecord>(key: string, service: Resource<T>, label: string) {
  return {
    useList: (params: ListParams) =>
      useQuery({
        queryKey: [key, 'list', params],
        queryFn: () => service.list(params),
        placeholderData: keepPreviousData,
      }),
    useOne: (id: Id | undefined) =>
      useQuery({ queryKey: [key, 'one', id], queryFn: () => service.getById(id as Id), enabled: id !== undefined }),
    useCreate: () => useAction((body: NewRecord<T>) => service.create(body), [key], `${label} created`),
    useUpdate: () =>
      useAction(
        ({ id, changes }: { id: Id; changes: Partial<NewRecord<T>> }) => service.update(id, changes),
        [key],
        `${label} updated`,
      ),
    useRemove: () => useAction((id: Id) => service.remove(id), [key], `${label} deleted`),
  };
}
