import type { Donation, Id, ReviewStatus } from '@/types';
import { createResource } from './core/resource';

const resource = createResource<Donation>('donations', 'donation', (r) => `${r.donorName} (${r.amount})`);

export const donationsService = {
  ...resource,
  setStatus: (id: Id, status: ReviewStatus) => resource.update(id, { status }, `Marked donation ${status.toLowerCase()}`),
};
