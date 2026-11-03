import type { Id, MediaItem } from '@/types';
import { createResource } from './core/resource';

const resource = createResource<MediaItem>('media', 'media', (r) => r.title);

export const mediaService = {
  ...resource,
  approveMedia: (id: Id) => resource.update(id, { status: 'Approved' }, 'Approved media'),
  rejectMedia: (id: Id, reason: string) =>
    resource.update(id, { status: 'Rejected', rejectionReason: reason }, 'Rejected media'),
};
