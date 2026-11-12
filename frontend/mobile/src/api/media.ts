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

export const getMedia = (page: number, filters: { category_id?: number }) =>
  request<{ media: ApiMedia[]; pagination: Pagination }>(
    'GET',
    `/user/media?page=${page}${filters.category_id ? `&category_id=${filters.category_id}` : ''}`,
  );

export const saveMedia = (body: NewMedia) =>
  request<{ media: Pick<ApiMedia, 'id' | 'media_url' | 'status'> }>('POST', '/user/media', { body });
