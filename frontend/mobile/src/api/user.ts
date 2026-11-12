import { LOGO } from '../config';
import type { BadgeStatus, Notice, SocietyEvent } from '../types';
import { dayCount, formatDate, formatTime, fromIsoDay } from '../utils/date';
import type { IoniconName } from '../icons';
import { mediaUrl, request } from './client';

/** An event as the backend sends it (`listEvents` in backend/modules/v1/module/userModule.js). */
export type ApiEvent = {
  id: number;
  title: string;
  description: string | null;
  /** yyyy-mm-dd */
  event_date: string;
  end_date: string | null;
  /** HH:mm:ss */
  start_time: string;
  end_time: string | null;
  venue_name: string;
  venue_address: string | null;
  map_link: string | null;
  poster_url: string | null;
  event_status: 'upcoming' | 'ongoing' | 'completed';
  category: { id: number; code: string; name: string; color: string };
};

export type ApiNotice = {
  id: number;
  title: string;
  body: string;
  tag: 'important' | 'general' | 'event';
  event_id: number | null;
  /** ISO date-time */
  published_at: string;
};

export type HomeData = {
  hero_events: ApiEvent[];
  upcoming_events: ApiEvent[];
  latest_notices: ApiNotice[];
};

export type ApiCategory = { id: number; code: string; name: string; color: string };

export type Pagination = { page: number; limit: number; total: number; total_pages: number; has_more: boolean };

/** Shared by both lists. Dates are yyyy-mm-dd. */
type DateFilters = { search?: string; from_date?: string; to_date?: string; limit?: number };
/** upcoming leaves out finished events. */
export type EventFilters = DateFilters & { category_id?: number; upcoming?: boolean };
export type NoticeFilters = DateFilters & { tag?: ApiNotice['tag'] };

/** "?page=2&search=diwali", leaving out empty values. */
const toQuery = (params: Record<string, string | number | boolean | undefined>) =>
  '?' +
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

/** Hero slider, upcoming events and latest notices for the home screen, in one call. */
export const getHome = () => request<HomeData>('GET', '/user/home');

export const getEvents = (page: number, filters: EventFilters) =>
  request<{ events: ApiEvent[]; pagination: Pagination }>('GET', `/user/events${toQuery({ page, ...filters })}`);

export const getEvent = (id: string) => request<{ event: ApiEvent }>('GET', `/user/events/${id}`);

export const getNotices = (page: number, filters: NoticeFilters) =>
  request<{ notices: ApiNotice[]; pagination: Pagination }>('GET', `/user/notices${toQuery({ page, ...filters })}`);

export const getNotice = (id: string) => request<{ notice: ApiNotice }>('GET', `/user/notices/${id}`);

/** For the category chips on the events screen, named in the app's language. */
export const getEventCategories = () => request<{ categories: ApiCategory[] }>('GET', '/user/event-categories');

// --- Shapes used by the existing event and notice cards

const EVENT_BADGE: Record<ApiEvent['event_status'], BadgeStatus> = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
};

const NOTICE_TAG: Record<ApiNotice['tag'], { tag: BadgeStatus; icon: IoniconName }> = {
  important: { tag: 'Important', icon: 'alert-circle-outline' },
  general: { tag: 'General', icon: 'megaphone-outline' },
  event: { tag: 'Event', icon: 'calendar-outline' },
};

/** "19:00:00" → "7:00 PM" */
const timeLabel = (time: string | null) => {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  return formatTime(new Date(2000, 0, 1, h, m));
};

export const toSocietyEvent = (e: ApiEvent): SocietyEvent => {
  const start = formatDate(fromIsoDay(e.event_date));
  const end = e.end_date && e.end_date !== e.event_date ? formatDate(fromIsoDay(e.end_date)) : null;
  const from = timeLabel(e.start_time);
  const to = timeLabel(e.end_time);
  const days = end ? dayCount(start, end) : null;
  const poster = mediaUrl(e.poster_url);

  return {
    id: String(e.id),
    title: e.title,
    // Same style as before: a range for multi-day events, otherwise the date with its start time
    date: end ? `${start} - ${end}` : `${start}, ${from}`,
    days: days ? `${days} Days` : undefined,
    time: to ? `${from} - ${to}` : (from ?? undefined),
    venue: e.venue_address ? `${e.venue_name}, ${e.venue_address}` : e.venue_name,
    startDay: e.event_date,
    endDay: e.end_date ?? e.event_date,
    category: e.category.name,
    categoryColor: e.category.color,
    status: EVENT_BADGE[e.event_status],
    image: poster ? { uri: poster } : LOGO,
    description: e.description ?? '',
    mapLink: e.map_link,
  };
};

export const toNotice = (n: ApiNotice): Notice => ({
  id: String(n.id),
  title: n.title,
  date: formatDate(new Date(n.published_at)),
  description: n.body,
  ...NOTICE_TAG[n.tag],
});
