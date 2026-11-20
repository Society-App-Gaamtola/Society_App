import { eventsApi, noticesApi, type EventBody, type EventQuery, type NoticeBody, type NoticeQuery } from '@/services/adminEvents';
import { executivesApi, type ExecutiveQuery, type RequestQuery } from '@/services/adminExecutives';
import { mediaApi, type MediaQuery } from '@/services/adminMedia';
import type { BackendNotice, ExecutivePermissions, NoticeStatusCode } from '@/types';
import { useBackendAction, useBackendList, useBackendOne } from './useBackend';

/** Cache names: a change refreshes its own list (and the dashboard), cached pages elsewhere stay */
const EVENTS = 'adminEvents';
const NOTICES = 'adminNotices';
const EXECUTIVES = 'adminExecutives';
const REQUESTS = 'adminExecutiveRequests';
const MEMBERS = 'adminMembers';

// ---------- Events ----------
export const useEventsPage = (query: EventQuery) => useBackendList(EVENTS, query, eventsApi.list);
export const useEventCategories = () => useBackendOne('eventCategories', 'all', () => eventsApi.categories());
export const useSaveEvent = () =>
  useBackendAction([EVENTS], ({ id, body }: { id?: number; body: EventBody }) => (id ? eventsApi.update(id, body) : eventsApi.create(body)));
export const useDeleteEvent = () => useBackendAction([EVENTS], (id: number) => eventsApi.remove(id));
export const useEventStatus = () =>
  useBackendAction([EVENTS], ({ id, status }: { id: number; status: 'posted' | 'draft' | 'cancelled' }) => eventsApi.setStatus(id, status));
export const useEventFeatured = () =>
  useBackendAction([EVENTS], ({ id, featured }: { id: number; featured: boolean }) => eventsApi.setFeatured(id, featured));

// ---------- Notices ----------
export const useNoticesPage = (query: NoticeQuery) => useBackendList(NOTICES, query, noticesApi.list);
export const useSaveNotice = () =>
  useBackendAction([NOTICES], ({ notice, body }: { notice?: BackendNotice; body: NoticeBody }) =>
    notice ? noticesApi.update(notice, body) : noticesApi.create(body),
  );
export const useDeleteNotice = () => useBackendAction([NOTICES], (id: number) => noticesApi.remove(id));
export const useNoticeStatus = () =>
  useBackendAction([NOTICES], ({ id, status }: { id: number; status: NoticeStatusCode }) => noticesApi.setStatus(id, status));

// ---------- Executives ----------
export const useExecutivesPage = (query: ExecutiveQuery) => useBackendList(EXECUTIVES, query, executivesApi.list);
export const useSetPermissions = () =>
  useBackendAction([EXECUTIVES], ({ id, permissions }: { id: number; permissions: ExecutivePermissions }) =>
    executivesApi.setPermissions(id, permissions),
  );
export const useAddExecutive = () =>
  useBackendAction([EXECUTIVES, MEMBERS], ({ id, permissions }: { id: number; permissions: ExecutivePermissions }) =>
    executivesApi.add(id, permissions),
  );
export const useRemoveExecutive = () => useBackendAction([EXECUTIVES, MEMBERS], (id: number) => executivesApi.remove(id));

export const useRequestsPage = (query: RequestQuery) => useBackendList(REQUESTS, query, executivesApi.requests);
export const useReviewRequest = () =>
  useBackendAction([REQUESTS, EXECUTIVES, MEMBERS], ({ id, action, reason }: { id: number; action: 'approve' | 'reject'; reason?: string }) =>
    executivesApi.reviewRequest(id, action, reason),
  );

// ---------- Media Approval ----------
const MEDIA = 'adminMedia';
export const useMediaPage = (query: MediaQuery) => useBackendList(MEDIA, query, mediaApi.list);
export const useReviewMedia = () =>
  useBackendAction([MEDIA], ({ id, action, reason }: { id: number; action: 'approve' | 'reject'; reason?: string }) => mediaApi.review(id, action, reason));
export const useDeleteMedia = () => useBackendAction([MEDIA], (id: number) => mediaApi.remove(id));
