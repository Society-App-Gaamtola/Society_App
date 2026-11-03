import type { Expense } from '@/types';
import { createResource } from './core/resource';

export const expensesService = createResource<Expense>('expenses', 'expense', (r) => r.note);
