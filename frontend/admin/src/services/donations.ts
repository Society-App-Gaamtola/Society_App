import type { Donation, Id } from '@/types';
import { createResource } from './core/resource';

const resource = createResource<Donation>('donations', 'donation', (r) => `${r.donorName} (${r.amount})`);

export const donationsService = {
  ...resource,
  verifyDonation: (id: Id) => resource.update(id, { status: 'Verified' }, 'Verified donation'),
};
