import { fromUtc } from '@/lib/utils';
import { api, type Pagination } from './core/backend';

/**
 * Media Approval for the panel. The shared gallery API with its moderation view: GET /user/media with manage=true
 * (every status) or status=…, plus counts per tab; review and delete are the shared APIs.
 */

export type MediaStatus = 'pending' | 'approved' | 'rejected';

/** A gallery item in the moderation view */
export type AdminMediaItem = {
  id: number;
  media_type: 'photo' | 'video';
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  status: MediaStatus;
  rejection_reason: string | null;
  event_id: number | null;
  created_at: string;
  uploaded_by: number;
  uploaded_by_name: string | null;
  privacy: string;
  file_size_bytes: number | null;
  moderated_at: string | null;
  category: { id: number; name: string; color: string };
};

export type MediaCounts = { all: number; photos: number; videos: number; pending: number; approved: number; rejected: number };

export type MediaQuery = {
  page: number;
  limit: number;
  manage?: boolean;
  status?: MediaStatus;
  media_type?: 'photo' | 'video';
  search?: string;
  from_date?: string;
  to_date?: string;
};

export const MEDIA_STATUS_LABEL: Record<MediaStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

const local = (m: AdminMediaItem): AdminMediaItem => ({
  ...m,
  created_at: fromUtc(m.created_at) ?? m.created_at,
  moderated_at: fromUtc(m.moderated_at),
});

export const mediaApi = {
  list: async (query: MediaQuery) => {
    const { data } = await api<{ media: AdminMediaItem[]; counts: MediaCounts; pagination: Pagination }>('GET', '/user/media', { query });
    return { ...data, media: data.media.map(local) };
  },
  review: (id: number, action: 'approve' | 'reject', reason?: string) =>
    api<{ media: AdminMediaItem }>('PUT', `/user/media/${id}/review`, { body: { action, ...(reason ? { reason } : {}) } }),
  /** Removes it from the gallery (the file stays in Cloudinary) */
  remove: (id: number) => api<undefined>('DELETE', `/user/media/${id}`),
};
