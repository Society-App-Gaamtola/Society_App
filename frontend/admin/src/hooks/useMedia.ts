import { mediaService } from '@/services/media';
import type { Id } from '@/types';
import { createResourceHooks, useAction } from './createResourceHooks';

export const mediaHooks = createResourceHooks('media', mediaService, 'Media');

export const useApproveMedia = () => useAction((id: Id) => mediaService.approveMedia(id), ['media'], 'Media approved');

export const useRejectMedia = () =>
  useAction(
    ({ id, reason }: { id: Id; reason: string }) => mediaService.rejectMedia(id, reason),
    ['media'],
    'Media rejected',
  );
