import { donationsService } from '@/services/donations';
import type { Id } from '@/types';
import { createResourceHooks, useAction } from './createResourceHooks';

export const donationsHooks = createResourceHooks('donations', donationsService, 'Donation');

export const useVerifyDonation = () =>
  useAction((id: Id) => donationsService.verifyDonation(id), ['donations'], 'Donation verified');
