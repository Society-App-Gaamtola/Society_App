import { getSession } from '@/lib/session';
import type { BaseRecord, Id, NewRecord } from '@/types';
import { adapter, type ListParams, type ListResult } from './adapter';

/** Audit failures must not undo the change the user just made. */
export async function writeAudit(action: string, target: string) {
  const now = new Date().toISOString();
  try {
    await adapter.create('auditLogs', {
      actor: getSession()?.email ?? 'Super Admin',
      action,
      target,
      at: now,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error('Could not write audit log', error);
  }
}

export type Resource<T extends BaseRecord> = {
  list(params?: ListParams): Promise<ListResult<T>>;
  getById(id: Id): Promise<T>;
  create(body: NewRecord<T>): Promise<T>;
  update(id: Id, changes: Partial<NewRecord<T>>, auditAction?: string): Promise<T>;
  remove(id: Id): Promise<void>;
};

/** CRUD for one collection. `label` and `nameOf` make the audit log readable. */
export function createResource<T extends BaseRecord>(
  collection: string,
  label: string,
  nameOf: (row: T) => string,
): Resource<T> {
  return {
    list: async (params = {}) => (await adapter.list(collection, params)) as unknown as ListResult<T>,
    getById: async (id) => (await adapter.get(collection, id)) as unknown as T,
    async create(body) {
      const now = new Date().toISOString();
      const row = (await adapter.create(collection, { ...body, created_at: now, updated_at: now })) as unknown as T;
      await writeAudit(`Created ${label}`, nameOf(row));
      return row;
    },
    async update(id, changes, auditAction) {
      const row = (await adapter.update(collection, id, {
        ...changes,
        updated_at: new Date().toISOString(),
      })) as unknown as T;
      await writeAudit(auditAction ?? `Updated ${label}`, nameOf(row));
      return row;
    },
    async remove(id) {
      const row = (await adapter.get(collection, id)) as unknown as T;
      await adapter.remove(collection, id);
      await writeAudit(`Deleted ${label}`, nameOf(row));
    },
  };
}
