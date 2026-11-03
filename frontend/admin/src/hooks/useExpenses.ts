import { expensesService } from '@/services/expenses';
import { createResourceHooks } from './createResourceHooks';

export const expensesHooks = createResourceHooks('expenses', expensesService, 'Expense');
