import { createEvent, updateEvent, type ApiExecEvent, type EventBody } from '../api/executive';
import type { EventDraft } from '../types';
import { mediaFolder, uploadMedia } from './media';

/** An event from the API as a form draft (edit / duplicate) */
export const toEventDraft = (e: ApiExecEvent): EventDraft => ({
  title: e.title,
  categoryId: e.category.id,
  categoryName: e.category.name,
  day: e.event_date,
  endDay: e.end_date && e.end_date !== e.event_date ? e.end_date : undefined,
  time: e.start_time.slice(0, 5),
  venue: e.venue_name,
  organizer: e.organizer_name ?? '',
  contact: e.contact_number ?? '',
  description: e.description ?? '',
  imageUri: e.poster_url ?? e.images[0] ?? undefined,
});

/**
 * Saves the event: a photo picked on the phone is uploaded to Cloudinary first (events/<yyyy>/<mm>), then the event
 * goes to POST /user/events (or PUT for an edit). There is no approval: post = live now, schedule = live later.
 */
export async function submitEvent(
  draft: EventDraft,
  action: EventBody['action'],
  options: { editId?: number; publishAt?: Date; emailMembers?: boolean } = {},
) {
  let poster: string | null = null;
  if (draft.imageUri) {
    poster = /^https?:\/\//.test(draft.imageUri)
      ? draft.imageUri
      : (await uploadMedia({ uri: draft.imageUri, kind: 'image' }, mediaFolder('event'))).url;
  }
  const body: EventBody = {
    category_id: draft.categoryId,
    title: draft.title,
    description: draft.description,
    event_date: draft.day,
    end_date: draft.endDay ?? null,
    start_time: draft.time,
    venue_name: draft.venue,
    organizer_name: draft.organizer,
    contact_number: draft.contact,
    poster_url: poster,
    images: poster ? [poster] : [],
    action,
    publish_at: options.publishAt?.toISOString(),
    // Publish and Share: the members are emailed when it goes live (now, or at the scheduled time)
    email_members: action !== 'draft' && !!options.emailMembers,
    // A new event made from an Event Planning plan
    plan_id: options.editId ? undefined : draft.planId,
  };
  return options.editId ? updateEvent(options.editId, body) : createEvent(body);
}
