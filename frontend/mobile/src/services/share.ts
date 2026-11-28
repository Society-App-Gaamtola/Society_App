import { Linking, Share } from 'react-native';
import { getSocietyInfo } from './appInfo';
import { googleMapsUrl } from '../components/events/EventMapCard';
import { t } from '../i18n';
import type { Notice, SocietyEvent } from '../types';

// Long descriptions are cut so the WhatsApp message stays readable
const MAX_TEXT = 400;
const clip = (text: string) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT).trim()}…` : text);

/**
 * Opens WhatsApp with the message ready to send (the person picks the chat). wa.me works with or without the
 * WhatsApp app (it opens WhatsApp Web when the app is missing), so no canOpenURL / manifest query is needed.
 */
export const shareOnWhatsApp = (message: string) =>
  Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(() => Share.share({ message }));

/** The phone's share sheet (any app), with the same text */
export const shareAnywhere = (message: string) => Share.share({ message }).catch(() => {});

/**
 * Where a shared event points. Its own map pin or map link comes first; otherwise the society's location from App
 * Settings (Society Map Link, with the society address when the event has none); without that, a Maps search for
 * the venue.
 */
function eventLocation(event: SocietyEvent) {
  const society = getSocietyInfo();
  const venueName = event.venueName ?? event.venue;
  const societyLink = !event.coords && !event.mapLink ? society.map_link : '';
  const venue = [venueName, event.address || (societyLink ? society.address : '')].filter(Boolean).join(', ');
  const link = societyLink || googleMapsUrl({ coords: event.coords, venueName, address: event.address, mapLink: event.mapLink });
  return { venue, link };
}

/** Event details + a Google Maps link (the pin, the pasted map link, the society's location, or a venue search) */
export function eventShareText(event: SocietyEvent) {
  const { venue, link } = eventLocation(event);
  const lines = [
    `*${event.title}*`,
    '',
    `📅 ${t('Date')}: ${event.days ? `${event.date} (${event.days})` : event.date}`,
    event.time ? `⏰ ${t('Time')}: ${event.time}` : null,
    venue ? `📍 ${t('Venue')}: ${venue}` : null,
    `🗺️ ${t('Location')}: ${link}`,
    event.contact ? `📞 ${t('Contact')}: ${event.contact}` : null,
    event.description ? `\n${clip(event.description)}` : null,
    '',
    `— ${getSocietyInfo().society_name}`,
  ];
  return lines.filter((line) => line !== null).join('\n');
}

/** The notice, and when it is about an event, that event's date, venue and map link */
export function noticeShareText(notice: Notice, event?: SocietyEvent | null) {
  const lines = [`📢 *${notice.title}*`, `${notice.date}`, '', clip(notice.description)];
  if (event) {
    const { venue, link } = eventLocation(event);
    lines.push(
      '',
      `🎉 ${event.title}`,
      `📅 ${event.date}${event.time ? `, ${event.time}` : ''}`,
      venue ? `📍 ${venue}` : '',
      `🗺️ ${link}`,
    );
  }
  lines.push('', `— ${getSocietyInfo().society_name}`);
  return lines.filter((line, i, all) => !(line === '' && all[i - 1] === '')).join('\n');
}
