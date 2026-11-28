import { getSocietyInfo } from './appInfo';
import { logoDataUri, savePdf } from './reportExport';
import { A4, escapeHtml, longDay, pdfPage, queriesLine, societyRow, type BoxRow } from './pdfLayout';
import type { Notice, SocietyEvent } from '../types';

/**
 * An event or a notice as a one-page PDF in the receipt design (Event / Notice Details → PDF button), shared through
 * the phone's share sheet. The frame is in English like every PDF; the event's own text and dates are as the app
 * shows them. Returns the file URI
 */

/** EVT012, NOT005 (the admin panel's numbering) */
export const eventNo = (id: string) => `EVT${id.padStart(3, '0')}`;
export const noticeNo = (id: string) => `NOT${id.padStart(3, '0')}`;

/** The typed text: escaped, one <br /> per line */
const textHtml = (text: string) => escapeHtml(text.trim()).replace(/\n/g, '<br />');

/** The item part: "Title - category", grey lines, then the text */
const itemHtml = (title: string, what: string, lines: string[], text: string) => `<div class="item">
    <div><b>${escapeHtml(title)}</b> - ${escapeHtml(what)}</div>
    ${lines.map((line) => `<div class="sub">${escapeHtml(line)}</div>`).join('')}
    ${text.trim() ? `<div class="dash" style="margin-top: 8px"></div><p style="line-height: 1.6; margin: 12px 0 0">${textHtml(text)}</p>` : ''}
  </div>`;

const statusRow = (date: string, status: string, tone: 'ok' | 'wait'): BoxRow => [
  `<span class="grey">Date -</span> <b>${escapeHtml(date)}</b>`,
  `<span class="grey">Status - </span>&nbsp;<span class="${tone}">${escapeHtml(status)}</span>`,
];

/** One event as a PDF */
export async function eventPdf(event: SocietyEvent) {
  const no = eventNo(event.id);
  const name = escapeHtml(getSocietyInfo().society_name);
  const venue = event.venueName ?? event.venue;
  const where = [venue, event.address].filter(Boolean).join(', ');
  const html = pdfPage({
    logo: await logoDataUri(),
    title: 'Event Details',
    greeting: ['Dear Members ,', `${name} invites you and your family to the event below. The details are below.`],
    box: [
      societyRow('Event No', no),
      [`<b>Event -</b> ${escapeHtml(event.title)}`, `<span class="grey">Category - ${escapeHtml(event.category)}</span>`],
      statusRow(event.date, String(event.status), event.status === 'Completed' ? 'wait' : 'ok'),
    ],
    body: itemHtml(
      event.title,
      event.category,
      [
        event.time ? `Time - ${event.time}` : '',
        where ? `Venue - ${where}` : '',
        event.organizer ? `Organizer - ${event.organizer}` : '',
        event.contact ? `Contact - ${event.contact}` : '',
        event.mapLink ? `Map - ${event.mapLink}` : '',
      ].filter(Boolean),
      event.description,
    ),
    detailsLabel: 'Event Details',
    details: [
      ['Date', escapeHtml(event.date)],
      ['Time', escapeHtml(event.time || '-')],
      ['Venue', escapeHtml(venue || '-')],
      ['Category', escapeHtml(event.category)],
      ['Organizer', escapeHtml(event.organizer || '-')],
      ['Contact', escapeHtml(event.contact || '-')],
    ],
    note:
      `This is a computer-generated copy of the event issued by ${name}. Timings and venue may change; please check the ` +
      `society app for the latest details and quote the Event No. for any correspondence.${queriesLine()}`,
    thanks: 'We look forward to seeing you.',
  });
  return savePdf(html, no, A4);
}

/** One notice as a PDF; category = the notice's tag as the app shows it */
export async function noticePdf(notice: Notice, category: string) {
  const no = noticeNo(notice.id);
  const name = escapeHtml(getSocietyInfo().society_name);
  const html = pdfPage({
    logo: await logoDataUri(),
    title: 'Notice',
    greeting: ['Dear Members ,', 'Please read the notice below from the society.'],
    box: [
      societyRow('Notice No', no),
      [`<b>Notice -</b> ${escapeHtml(notice.title)}`, `<span class="grey">Category - ${escapeHtml(category)}</span>`],
      statusRow(notice.date || longDay(new Date()), 'Published', 'ok'),
    ],
    body: itemHtml(notice.title, category, [], notice.description),
    detailsLabel: 'Notice Details',
    details: [
      ['Category', escapeHtml(category)],
      ['Date', escapeHtml(notice.date)],
    ],
    note: `This is a computer-generated copy of the notice issued by ${name}. Please quote the Notice No. for any correspondence.${queriesLine()}`,
    thanks: 'Thank you for reading.',
  });
  return savePdf(html, no, A4);
}
