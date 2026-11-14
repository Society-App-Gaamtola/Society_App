import type { Expense, Id, ReviewStatus } from '@/types';
import { createResource } from './core/resource';

const resource = createResource<Expense>('expenses', 'expense', (r) => `${r.description} (${r.amount})`);

export const expensesService = {
  ...resource,
  setStatus: (id: Id, status: ReviewStatus) => resource.update(id, { status }, `Marked expense ${status.toLowerCase()}`),
};
