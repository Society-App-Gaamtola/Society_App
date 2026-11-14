import { donationsService } from '@/services/donations';
import type { Id, ReviewStatus } from '@/types';
import { createResourceHooks, useAction } from './createResourceHooks';

export const donationsHooks = createResourceHooks('donations', donationsService, 'Donation');

export const useSetDonationStatus = () =>
  useAction(
    ({ id, status }: { id: Id; status: ReviewStatus }) => donationsService.setStatus(id, status),
    ['donations'],
    'Donation status updated',
  );
