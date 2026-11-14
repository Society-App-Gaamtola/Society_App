import { expensesService } from '@/services/expenses';
import type { Id, ReviewStatus } from '@/types';
import { createResourceHooks, useAction } from './createResourceHooks';

export const expensesHooks = createResourceHooks('expenses', expensesService, 'Expense');

export const useSetExpenseStatus = () =>
  useAction(
    ({ id, status }: { id: Id; status: ReviewStatus }) => expensesService.setStatus(id, status),
    ['expenses'],
    'Expense status updated',
  );
