import { request } from './client';
import type { Pagination } from './user';

/** A gallery item as the backend sends it (`listMedia` in backend/modules/v1/module/userModule.js). */
export type ApiMedia = {
  id: number;
  media_type: 'photo' | 'video';
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  status: 'pending' | 'approved' | 'rejected';
  /** Why the Super Admin rejected it; only the uploader sees their own rejected items. */
  rejection_reason: string | null;
  event_id: number | null;
  created_at: string;
  uploaded_by_name: string;
  is_mine: 0 | 1;
  category: { id: number; name: string; color: string };
};

/** What the backend stores for a file the app already uploaded to Cloudinary. */
export type NewMedia = {
  media_url: string;
  media_type: 'photo' | 'video';
  thumbnail_url?: string;
  public_id: string;
  file_size_bytes?: number;
  category_id: number;
  event_id?: number;
  caption?: string;
};

export type MediaFilters = { category_id?: number; event_id?: number; limit?: number };

export const getMedia = (page: number, filters: MediaFilters) =>
  request<{ media: ApiMedia[]; pagination: Pagination }>(
    'GET',
    `/user/media?page=${page}` +
      (filters.category_id ? `&category_id=${filters.category_id}` : '') +
      (filters.event_id ? `&event_id=${filters.event_id}` : '') +
      (filters.limit ? `&limit=${filters.limit}` : ''),
  );

export const saveMedia = (body: NewMedia) =>
  request<{ media: Pick<ApiMedia, 'id' | 'media_url' | 'status'> }>('POST', '/user/media', { body });

/** One item the user may see: approved, or their own. */
export const getMediaItem = (id: number) => request<{ media: ApiMedia }>('GET', `/user/media/${id}`);

/** The uploader's own items only. A member's edited item goes back to "pending" (the message says so). */
export const editMedia = (id: number, body: { caption?: string; category_id?: number; event_id?: number | null }) =>
  request<{ media: ApiMedia }>('PUT', `/user/media/${id}`, { body });

/** Own items only (the Super Admin can remove any). */
export const deleteMedia = (id: number) => request('DELETE', `/user/media/${id}`);

/** The moderation view (Media permission): everyone's items in one status, newest first */
export const getMediaQueue = (page: number, status: ApiMedia['status']) =>
  request<{ media: ApiMedia[]; pagination: Pagination }>('GET', `/user/media?page=${page}&status=${status}`);

/** Approve, or reject with a reason the uploader sees */
export const reviewMedia = (id: number, action: 'approve' | 'reject', reason?: string) =>
  request<{ media: ApiMedia }>('PUT', `/user/media/${id}/review`, { body: { action, reason } });
