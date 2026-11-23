import { fromUtc } from '@/lib/utils';
import type { BackendEvent, BackendNotice, EventCategory, EventStatusCode, NoticeStatusCode, NoticeTag } from '@/types';
import { api, type Pagination } from './core/backend';

/**
 * Events and notices for the panel. Listing uses the shared GET /user/events and /user/notices with manage=true
 * (every status); create / edit / delete are the shared APIs; status and featured are the panel's own.
 */

// ---------- Labels ----------

export const EVENT_STATUS_LABEL: Record<EventStatusCode, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  posted: 'Posted',
  cancelled: 'Cancelled',
};
export const NOTICE_STATUS_LABEL: Record<NoticeStatusCode, string> = { draft: 'Draft', published: 'Published' };
/** A notice category (App Settings' notice_tags, stored lowercase) as shown: "garba prasad" → "Garba Prasad" */
export const noticeTagLabel = (tag: NoticeTag) => tag.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** "18:30:00" → "6:30 PM" */
export function timeLabel(time: string | null) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

const localEvent = (e: BackendEvent): BackendEvent => ({
  ...e,
  publish_at: fromUtc(e.publish_at),
  posted_at: fromUtc(e.posted_at),
  created_at: fromUtc(e.created_at) ?? e.created_at,
  updated_at: fromUtc(e.updated_at) ?? e.updated_at,
});
const localNotice = (n: BackendNotice): BackendNotice => ({
  ...n,
  published_at: fromUtc(n.published_at),
  created_at: fromUtc(n.created_at) ?? n.created_at,
  updated_at: fromUtc(n.updated_at) ?? n.updated_at,
});

// ---------- Events ----------

export type EventQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: EventStatusCode;
  category_id?: number;
  from_date?: string;
  to_date?: string;
};

/** The body of POST / PUT /user/events (an edit replaces every field, images included) */
export type EventBody = {
  category_id: number;
  title: string;
  description: string;
  event_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  venue_name: string;
  venue_address: string;
  organizer_name: string;
  contact_number: string;
  poster_url: string | null;
  images: string[];
  latitude: number | null;
  longitude: number | null;
  action: 'draft' | 'post' | 'schedule';
  publish_at?: string;
  /** Publish and Share: also email it to every member when it goes live */
  email_members?: boolean;
};

export const eventsApi = {
  list: async (query: EventQuery) => {
    const { data } = await api<{ events: BackendEvent[]; pagination: Pagination }>('GET', '/user/events', { query: { ...query, manage: true } });
    return { ...data, events: data.events.map(localEvent) };
  },
  categories: async () => (await api<{ categories: EventCategory[] }>('GET', '/user/event-categories')).data.categories,
  create: (body: EventBody) => api<{ event: BackendEvent }>('POST', '/user/events', { body }),
  update: (id: number, body: EventBody) => api<{ event: BackendEvent }>('PUT', `/user/events/${id}`, { body }),
  remove: (id: number) => api<undefined>('DELETE', `/user/events/${id}`),
  setStatus: (id: number, status: 'posted' | 'draft' | 'cancelled') =>
    api<{ event: BackendEvent }>('PUT', `/user/events/${id}/status`, { body: { status } }),
  setFeatured: (id: number, is_featured: boolean) =>
    api<{ event: BackendEvent }>('PUT', `/user/events/${id}/featured`, { body: { is_featured } }),
};

// ---------- Notices ----------

export type NoticeQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: NoticeStatusCode;
  tag?: NoticeTag;
  from_date?: string;
  to_date?: string;
};

/** email_members: Publish and Share, also email it to the members when it goes live */
export type NoticeBody = { title: string; body: string; tag: NoticeTag; action: 'draft' | 'publish'; email_members?: boolean };

export const noticesApi = {
  list: async (query: NoticeQuery) => {
    const { data } = await api<{ notices: BackendNotice[]; pagination: Pagination }>('GET', '/user/notices', { query: { ...query, manage: true } });
    return { ...data, notices: data.notices.map(localNotice) };
  },
  create: (body: NoticeBody) => api<{ notice: BackendNotice }>('POST', '/user/notices', { body }),
  /** An edit replaces everything: a notice for selected members keeps its recipient list */
  async update(notice: BackendNotice, body: NoticeBody) {
    let audience: Record<string, unknown> = {};
    if (notice.audience === 'selected') {
      const { data } = await api<{ notice: BackendNotice }>('GET', `/user/notices/${notice.id}`);
      audience = { audience: 'selected', recipient_ids: data.notice.recipient_ids ?? [] };
    }
    return api<{ notice: BackendNotice }>('PUT', `/user/notices/${notice.id}`, { body: { ...body, ...audience } });
  },
  remove: (id: number) => api<undefined>('DELETE', `/user/notices/${id}`),
  setStatus: (id: number, status: NoticeStatusCode) => api<{ notice: BackendNotice }>('PUT', `/user/notices/${id}/status`, { body: { status } }),
};
