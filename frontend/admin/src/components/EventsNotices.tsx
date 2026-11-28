'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ban, CalendarDays, EyeOff, FileText, Megaphone, Plus, Send, Star, StarOff } from 'lucide-react';
import { ConfirmDialog, DetailList, Field, FileUpload, FormDialog, PageHeader, RowActions, StatusBadge, Tabs, ViewDialog } from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { Button, Input, NativeSelect, Switch, Textarea } from '@/components/ui/primitives';
import { DEFAULT_PAGE_SIZE } from '@/config';
import {
  useDeleteEvent,
  useDeleteNotice,
  useEventCategories,
  useEventFeatured,
  useEventsPage,
  useEventStatus,
  useNoticeStatus,
  useNoticesPage,
  useSaveEvent,
  useSaveNotice,
} from '@/hooks/useAdminContent';
import { useAppSettings } from '@/hooks/useFinance';
import { useUrlState } from '@/hooks/useUrlState';
import { exportEventPdf, exportNoticePdf } from '@/lib/exporters';
import { useNavigate } from '@/lib/navigation';
import { formatDate, formatDateTime, isImageUrl, todayISO } from '@/lib/utils';
import {
  EVENT_STATUS_LABEL,
  NOTICE_STATUS_LABEL,
  noticeTagLabel,
  timeLabel,
  type EventBody,
  type EventQuery,
  type NoticeBody,
  type NoticeQuery,
} from '@/services/adminEvents';
import { uploadEventImage } from '@/services/cloudinary';
import type { BackendEvent, BackendNotice, EventStatusCode, NoticeStatusCode, NoticeTag } from '@/types';

type Kind = 'events' | 'notices';
const EVENT_STATUSES = Object.entries(EVENT_STATUS_LABEL).map(([value, label]) => ({ value, label }));
const NOTICE_STATUSES = Object.entries(NOTICE_STATUS_LABEL).map(([value, label]) => ({ value, label }));

/** The notice categories of App Settings as select options (+ `keep`: a notice's category that was removed since) */
function useNoticeTags(keep?: NoticeTag) {
  const tags = useAppSettings().data?.settings.notice_tags ?? ['important', 'general', 'event'];
  return [...tags, ...(keep && !tags.includes(keep) ? [keep] : [])].map((value) => ({ value, label: noticeTagLabel(value) }));
}

/** "Publish and Share (email)": a switch under the form; the members get an email when the item goes live */
function EmailShareSwitch({ checked, onChange, what }: { checked: boolean; onChange: (checked: boolean) => void; what: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-[#FBF5EC] px-3 py-2">
      <Switch label="Share by email" checked={checked} onCheckedChange={onChange} />
      <span className="text-sm">
        Share by email
        <span className="block text-xs text-muted-foreground">Members also get this {what} by email when it goes live.</span>
      </span>
    </div>
  );
}

/** "2026-11-20" + optional end → "20 Nov 2026" or "20 Nov 2026 – 22 Nov 2026" */
const eventDates = (e: BackendEvent) => (e.end_date && e.end_date !== e.event_date ? `${formatDate(e.event_date)} – ${formatDate(e.end_date)}` : formatDate(e.event_date));
const eventTimes = (e: BackendEvent) => [timeLabel(e.start_time), timeLabel(e.end_time)].filter(Boolean).join(' – ');
const noticeAudience = (n: BackendNotice) => (n.audience === 'selected' ? `${n.recipient_count} selected members` : 'All members');

/** The event / notice as a PDF in the receipt design (lib/exporters) */
const eventPdf = (e: BackendEvent) =>
  exportEventPdf({
    id: e.id,
    title: e.title,
    category: e.category.name,
    dates: eventDates(e),
    times: eventTimes(e),
    venue: e.venue_name,
    address: e.venue_address,
    organizer: e.organizer_name,
    contact: e.contact_number,
    mapLink: e.map_link || (e.latitude != null && e.longitude != null ? `https://www.google.com/maps?q=${e.latitude},${e.longitude}` : null),
    description: e.description,
    status: e.status,
    statusLabel: EVENT_STATUS_LABEL[e.status],
  });
const noticePdf = (n: BackendNotice) =>
  exportNoticePdf({
    id: n.id,
    title: n.title,
    body: n.body,
    category: noticeTagLabel(n.tag),
    date: formatDate(n.published_at ?? n.created_at),
    audience: noticeAudience(n),
    issuedBy: n.created_by_name,
    status: n.status,
    statusLabel: NOTICE_STATUS_LABEL[n.status],
  });

// ---------- Event form (POST / PUT /user/events) ----------

type EventDraft = Omit<EventBody, 'latitude' | 'longitude' | 'images' | 'category_id' | 'email_members'> & {
  category_id: string;
  publish_at: string;
  email_members: boolean;
};

const emptyEvent = (categoryId: string): EventDraft => ({
  title: '',
  category_id: categoryId,
  description: '',
  event_date: todayISO(),
  end_date: null,
  start_time: '',
  end_time: '',
  venue_name: '',
  venue_address: '',
  organizer_name: '',
  contact_number: '',
  poster_url: null,
  action: 'draft',
  publish_at: '',
  email_members: false,
});

const eventToDraft = (e: BackendEvent): EventDraft => ({
  title: e.title,
  category_id: String(e.category.id),
  description: e.description ?? '',
  event_date: e.event_date,
  end_date: e.end_date,
  start_time: e.start_time.slice(0, 5),
  end_time: e.end_time?.slice(0, 5) ?? '',
  venue_name: e.venue_name,
  venue_address: e.venue_address ?? '',
  organizer_name: e.organizer_name ?? '',
  contact_number: e.contact_number ?? '',
  poster_url: e.poster_url,
  // Keep it live / scheduled when it already is; otherwise saving keeps it a draft
  action: e.status === 'posted' ? 'post' : e.status === 'scheduled' ? 'schedule' : 'draft',
  publish_at: e.status === 'scheduled' && e.publish_at ? e.publish_at.slice(0, 16) : '',
  email_members: e.email_members === 1,
});

function EventForm({ open, onOpenChange, event }: { open: boolean; onOpenChange: (open: boolean) => void; event?: BackendEvent }) {
  const { data: categories } = useEventCategories();
  const save = useSaveEvent();
  const [draft, setDraft] = useState<EventDraft>(emptyEvent(''));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDraft(event ? eventToDraft(event) : emptyEvent(String(categories?.[0]?.id ?? '')));
    // categories only matter for a new event's default
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event]);

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const found: Record<string, string> = {};
    if (!draft.title.trim()) found.title = 'Title is required.';
    if (!draft.category_id) found.category_id = 'Choose a category.';
    if (!draft.event_date) found.event_date = 'Date is required.';
    if (draft.end_date && draft.end_date < draft.event_date) found.end_date = 'End date is before the start date.';
    if (!draft.start_time) found.start_time = 'Start time is required.';
    if (!draft.venue_name.trim()) found.venue_name = 'Venue is required.';
    if (draft.contact_number && !/^\+?[\d\s-]{7,20}$/.test(draft.contact_number)) found.contact_number = 'Enter a valid phone number.';
    if (draft.action === 'schedule' && (!draft.publish_at || new Date(draft.publish_at) <= new Date())) found.publish_at = 'Pick a future date and time.';
    setErrors(found);
    if (Object.keys(found).length) return;

    const body: EventBody = {
      ...draft,
      title: draft.title.trim(),
      venue_name: draft.venue_name.trim(),
      category_id: Number(draft.category_id),
      end_date: draft.end_date || null,
      images: event?.images ?? [], // an edit replaces the image list: keep the event's images
      latitude: event?.latitude ?? null,
      longitude: event?.longitude ?? null,
      ...(draft.action === 'schedule' ? { publish_at: new Date(draft.publish_at).toISOString() } : { publish_at: undefined }),
      email_members: draft.action !== 'draft' && draft.email_members,
    };
    save.mutate({ id: event?.id, body }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={event ? 'Edit Event' : 'Create Event'}
      submitLabel={draft.action !== 'draft' && draft.email_members && !event?.posted_at ? 'Publish & Share' : event ? 'Save Changes' : 'Create Event'}
      pending={save.isPending}
      onSubmit={submit}
      className="max-w-2xl"
    >
      <Field label="Title" error={errors.title}>
        <Input value={draft.title} onChange={(e) => set('title', e.target.value)} autoFocus />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category" error={errors.category_id}>
          <NativeSelect value={draft.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">Choose…</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Venue" error={errors.venue_name}>
          <Input value={draft.venue_name} onChange={(e) => set('venue_name', e.target.value)} />
        </Field>
        <Field label="Start Date" error={errors.event_date}>
          <Input type="date" value={draft.event_date} onChange={(e) => set('event_date', e.target.value)} />
        </Field>
        <Field label="End Date (optional)" error={errors.end_date}>
          <Input type="date" value={draft.end_date ?? ''} min={draft.event_date} onChange={(e) => set('end_date', e.target.value || null)} />
        </Field>
        <Field label="Start Time" error={errors.start_time}>
          <Input type="time" value={draft.start_time} onChange={(e) => set('start_time', e.target.value)} />
        </Field>
        <Field label="End Time (optional)">
          <Input type="time" value={draft.end_time} onChange={(e) => set('end_time', e.target.value)} />
        </Field>
        <Field label="Organizer">
          <Input value={draft.organizer_name} onChange={(e) => set('organizer_name', e.target.value)} />
        </Field>
        <Field label="Contact Number" error={errors.contact_number}>
          <Input value={draft.contact_number} onChange={(e) => set('contact_number', e.target.value)} inputMode="tel" />
        </Field>
      </div>
      <Field label="Venue Address (optional)">
        <Input value={draft.venue_address} onChange={(e) => set('venue_address', e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={3} />
      </Field>
      <Field label="Poster">
        <FileUpload value={draft.poster_url} onChange={(url) => set('poster_url', url)} accept="image/*" maxMb={10} label="Upload poster" upload={uploadEventImage} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="When">
          <NativeSelect value={draft.action} onChange={(e) => set('action', e.target.value as EventDraft['action'])}>
            <option value="draft">Save as draft</option>
            <option value="post">Post now</option>
            <option value="schedule">Schedule</option>
          </NativeSelect>
        </Field>
        {draft.action === 'schedule' ? (
          <Field label="Goes live at" error={errors.publish_at}>
            <Input type="datetime-local" value={draft.publish_at} onChange={(e) => set('publish_at', e.target.value)} />
          </Field>
        ) : null}
      </div>
      {/* Only before it first goes live: a posted event was already announced */}
      {draft.action !== 'draft' && !event?.posted_at ? (
        <EmailShareSwitch checked={draft.email_members} onChange={(v) => set('email_members', v)} what="event" />
      ) : null}
    </FormDialog>
  );
}

// ---------- Events table ----------

function useEventQuery(): EventQuery {
  const url = useUrlState();
  return {
    page: url.page,
    limit: DEFAULT_PAGE_SIZE,
    search: url.search || undefined,
    status: (url.get('status') || undefined) as EventStatusCode | undefined,
    category_id: url.get('category') ? Number(url.get('category')) : undefined,
    from_date: url.range.from,
    to_date: url.range.to,
  };
}

function EventsTable({ onCreate }: { onCreate: boolean }) {
  const url = useUrlState();
  const { data: categories } = useEventCategories();
  const list = useEventsPage(useEventQuery());
  const setStatus = useEventStatus();
  const setFeatured = useEventFeatured();
  const remove = useDeleteEvent();
  const [form, setForm] = useState<{ open: boolean; event?: BackendEvent }>({ open: false });
  const [viewing, setViewing] = useState<BackendEvent | null>(null);
  const [deleting, setDeleting] = useState<BackendEvent | null>(null);

  useEffect(() => {
    if (onCreate) setForm({ open: true });
  }, [onCreate]);

  const columns = useMemo<Column<BackendEvent>[]>(
    () => [
      { key: 'type', header: 'Type', render: () => <CalendarDays className="h-4 w-4 text-maroon" aria-label="Event" /> },
      {
        key: 'title',
        header: 'Title',
        render: (e) => (
          <button type="button" className="text-left hover:underline" onClick={() => setViewing(e)}>
            <span className="font-medium text-[#1E3A8A]">
              {e.title}
              {e.is_featured ? <Star className="ml-1 inline h-3.5 w-3.5 fill-[#D9A21B] text-[#D9A21B]" aria-label="Featured" /> : null}
            </span>
            <span className="block text-xs text-muted-foreground">
              {e.category.name}
              {e.created_by_name ? ` · by ${e.created_by_name}` : ''}
            </span>
          </button>
        ),
      },
      { key: 'date', header: 'Date', className: 'whitespace-nowrap px-4 py-3', render: eventDates },
      { key: 'time', header: 'Time', className: 'whitespace-nowrap px-4 py-3', render: (e) => eventTimes(e) || '—' },
      { key: 'venue', header: 'Venue', render: (e) => e.venue_name || '—' },
      { key: 'status', header: 'Status', render: (e) => <StatusBadge status={EVENT_STATUS_LABEL[e.status]} /> },
      {
        key: 'actions',
        header: 'Actions',
        render: (e) => (
          <RowActions
            label={e.title}
            onEdit={() => setForm({ open: true, event: e })}
            onView={() => setViewing(e)}
            onDelete={() => setDeleting(e)}
            more={[
              { label: 'Download PDF', icon: FileText, onSelect: () => eventPdf(e) },
              { label: 'Post now', icon: Send, hidden: e.status === 'posted', onSelect: () => setStatus.mutate({ id: e.id, status: 'posted' }) },
              { label: 'Move to draft', icon: EyeOff, hidden: e.status === 'draft', onSelect: () => setStatus.mutate({ id: e.id, status: 'draft' }) },
              { label: 'Cancel event', icon: Ban, hidden: ['cancelled', 'draft'].includes(e.status), destructive: true, onSelect: () => setStatus.mutate({ id: e.id, status: 'cancelled' }) },
              e.is_featured
                ? { label: 'Remove from featured', icon: StarOff, onSelect: () => setFeatured.mutate({ id: e.id, featured: false }) }
                : { label: 'Mark as featured', icon: Star, onSelect: () => setFeatured.mutate({ id: e.id, featured: true }) },
            ]}
          />
        ),
      },
    ],
    [setFeatured, setStatus],
  );

  return (
    <>
      <FilterBar
        searchPlaceholder="Search by title..."
        dateRange
        selects={[
          { name: 'status', label: 'Status', options: EVENT_STATUSES },
          { name: 'category', label: 'Categories', options: (categories ?? []).map((c) => ({ value: String(c.id), label: c.name })) },
        ]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.events}
        total={list.data?.pagination.total ?? 0}
        page={url.page}
        pageSize={DEFAULT_PAGE_SIZE}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        errorMessage={list.error?.message}
        onRetry={() => list.refetch()}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="events"
        emptyMessage="No events found."
      />
      <EventForm open={form.open} event={form.event} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ViewDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? ''}
        className="max-w-2xl"
        footer={
          viewing ? (
            <>
              <Button variant="outline" onClick={() => eventPdf(viewing)}>
                <FileText className="h-4 w-4" /> Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setForm({ open: true, event: viewing });
                  setViewing(null);
                }}
              >
                Edit
              </Button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-4">
            {viewing.poster_url && isImageUrl(viewing.poster_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.poster_url} alt="" className="max-h-64 w-full rounded-lg object-cover" />
            ) : null}
            <DetailList
              items={[
                ['Date', eventDates(viewing)],
                ['Time', eventTimes(viewing) || '—'],
                ['Venue', [viewing.venue_name, viewing.venue_address].filter(Boolean).join(', ')],
                ['Category', viewing.category.name],
                ['Organizer', viewing.organizer_name || '—'],
                ['Contact', viewing.contact_number || '—'],
                ['Status', <StatusBadge key="s" status={EVENT_STATUS_LABEL[viewing.status]} />],
                ['Featured', viewing.is_featured ? 'Yes' : 'No'],
                ['Created by', viewing.created_by_name || '—'],
                ...(viewing.status === 'scheduled' ? [['Goes live', formatDateTime(viewing.publish_at)] as [string, string]] : []),
              ]}
            />
            {viewing.description ? <p className="whitespace-pre-line text-sm">{viewing.description}</p> : null}
          </div>
        ) : null}
      </ViewDialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.title}"?`}
        description="The event is removed from the app."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}

// ---------- Notice form (POST / PUT /user/notices) ----------

type NoticeDraft = NoticeBody;
const emptyNotice: NoticeDraft = { title: '', body: '', tag: 'general', action: 'draft', email_members: false };

function NoticeForm({ open, onOpenChange, notice }: { open: boolean; onOpenChange: (open: boolean) => void; notice?: BackendNotice }) {
  const save = useSaveNotice();
  const [draft, setDraft] = useState<NoticeDraft>(emptyNotice);
  const tags = useNoticeTags(notice?.tag);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDraft(
      notice
        ? { title: notice.title, body: notice.body, tag: notice.tag, action: notice.status === 'published' ? 'publish' : 'draft', email_members: notice.email_members === 1 }
        : { ...emptyNotice, tag: tags.some((t) => t.value === 'general') ? 'general' : (tags[0]?.value ?? 'general') },
    );
    // the category list only matters for a new notice's default
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notice]);

  const set = <K extends keyof NoticeDraft>(key: K, value: NoticeDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const found: Record<string, string> = {};
    if (!draft.title.trim()) found.title = 'Title is required.';
    if (!draft.body.trim()) found.body = 'Write the notice text.';
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { ...draft, title: draft.title.trim(), body: draft.body.trim(), email_members: draft.action === 'publish' && draft.email_members };
    save.mutate({ notice, body }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={notice ? 'Edit Notice' : 'Create Notice'}
      description={notice?.audience === 'selected' ? `Sent to ${notice.recipient_count} selected members` : undefined}
      submitLabel={draft.action === 'publish' && draft.email_members && notice?.status !== 'published' ? 'Publish & Share' : notice ? 'Save Changes' : 'Create Notice'}
      pending={save.isPending}
      onSubmit={submit}
    >
      <Field label="Title" error={errors.title}>
        <Input value={draft.title} onChange={(e) => set('title', e.target.value)} autoFocus />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category">
          <NativeSelect value={draft.tag} onChange={(e) => set('tag', e.target.value as NoticeTag)}>
            {tags.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Status">
          <NativeSelect value={draft.action} onChange={(e) => set('action', e.target.value as NoticeDraft['action'])}>
            <option value="draft">Draft</option>
            <option value="publish">Publish now</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Notice" error={errors.body}>
        <Textarea value={draft.body} onChange={(e) => set('body', e.target.value)} rows={5} />
      </Field>
      {/* Only before it is first published: a published notice was already announced */}
      {draft.action === 'publish' && notice?.status !== 'published' ? (
        <EmailShareSwitch checked={!!draft.email_members} onChange={(v) => set('email_members', v)} what="notice" />
      ) : null}
    </FormDialog>
  );
}

// ---------- Notices table ----------

function useNoticeQuery(): NoticeQuery {
  const url = useUrlState();
  return {
    page: url.page,
    limit: DEFAULT_PAGE_SIZE,
    search: url.search || undefined,
    status: (url.get('status') || undefined) as NoticeStatusCode | undefined,
    tag: (url.get('tag') || undefined) as NoticeTag | undefined,
    from_date: url.range.from,
    to_date: url.range.to,
  };
}

function NoticesTable({ onCreate }: { onCreate: boolean }) {
  const url = useUrlState();
  const list = useNoticesPage(useNoticeQuery());
  const tags = useNoticeTags();
  const setStatus = useNoticeStatus();
  const remove = useDeleteNotice();
  const [form, setForm] = useState<{ open: boolean; notice?: BackendNotice }>({ open: false });
  const [viewing, setViewing] = useState<BackendNotice | null>(null);
  const [deleting, setDeleting] = useState<BackendNotice | null>(null);

  useEffect(() => {
    if (onCreate) setForm({ open: true });
  }, [onCreate]);

  const columns = useMemo<Column<BackendNotice>[]>(
    () => [
      { key: 'type', header: 'Type', render: () => <Megaphone className="h-4 w-4 text-[#C62828]" aria-label="Notice" /> },
      {
        key: 'title',
        header: 'Title',
        render: (n) => (
          <button type="button" className="text-left hover:underline" onClick={() => setViewing(n)}>
            <span className="font-medium text-[#1E3A8A]">{n.title}</span>
            <span className="block text-xs text-muted-foreground">
              {noticeAudience(n)}
              {n.created_by_name ? ` · by ${n.created_by_name}` : ''}
            </span>
          </button>
        ),
      },
      { key: 'date', header: 'Date', className: 'whitespace-nowrap px-4 py-3', render: (n) => formatDate(n.published_at ?? n.created_at) },
      { key: 'tag', header: 'Category', render: (n) => <StatusBadge status={noticeTagLabel(n.tag)} /> },
      { key: 'status', header: 'Status', render: (n) => <StatusBadge status={NOTICE_STATUS_LABEL[n.status]} /> },
      {
        key: 'actions',
        header: 'Actions',
        render: (n) => (
          <RowActions
            label={n.title}
            onEdit={() => setForm({ open: true, notice: n })}
            onView={() => setViewing(n)}
            onDelete={() => setDeleting(n)}
            more={[
              { label: 'Download PDF', icon: FileText, onSelect: () => noticePdf(n) },
              n.status === 'published'
                ? { label: 'Move to draft', icon: EyeOff, onSelect: () => setStatus.mutate({ id: n.id, status: 'draft' }) }
                : { label: 'Publish now', icon: Send, onSelect: () => setStatus.mutate({ id: n.id, status: 'published' }) },
            ]}
          />
        ),
      },
    ],
    [setStatus],
  );

  return (
    <>
      <FilterBar
        searchPlaceholder="Search by title or text..."
        dateRange
        selects={[
          { name: 'status', label: 'Status', options: NOTICE_STATUSES },
          { name: 'tag', label: 'Categories', options: tags },
        ]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.notices}
        total={list.data?.pagination.total ?? 0}
        page={url.page}
        pageSize={DEFAULT_PAGE_SIZE}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        errorMessage={list.error?.message}
        onRetry={() => list.refetch()}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="notices"
        emptyMessage="No notices found."
      />
      <NoticeForm open={form.open} notice={form.notice} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ViewDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? ''}
        footer={
          viewing ? (
            <>
              <Button variant="outline" onClick={() => noticePdf(viewing)}>
                <FileText className="h-4 w-4" /> Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setForm({ open: true, notice: viewing });
                  setViewing(null);
                }}
              >
                Edit
              </Button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-4">
            <DetailList
              items={[
                ['Date', formatDateTime(viewing.published_at ?? viewing.created_at)],
                ['Category', noticeTagLabel(viewing.tag)],
                ['Status', <StatusBadge key="s" status={NOTICE_STATUS_LABEL[viewing.status]} />],
                ['Sent to', viewing.audience === 'selected' ? `${viewing.recipient_count} selected members` : 'All members'],
                ['Created by', viewing.created_by_name || '—'],
              ]}
            />
            <p className="whitespace-pre-line text-sm">{viewing.body}</p>
          </div>
        ) : null}
      </ViewDialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.title}"?`}
        description="The notice is removed from the app."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}

/** Screen 27. Events and Notices share one screen; each sidebar link opens its own tab. */
export function EventsNoticesPage({ kind }: { kind: Kind }) {
  const navigate = useNavigate();
  const url = useUrlState();
  // ?new=1 opens the create form, so "Create Notice" works from the Events tab too.
  const creating = url.get('new') === '1';

  // Same page with ?new=1 opens the form at once; the other tab shows the loading state while it opens
  const create = (target: Kind) => navigate(`/${target}?new=1`);

  useEffect(() => {
    if (creating) url.setParams({ new: undefined });
    // run once per ?new=1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating]);

  return (
    <>
      <PageHeader
        title="Manage Events & Notices"
        subtitle="Create, edit, publish and manage society events and notices"
        actions={
          <>
            <Button onClick={() => create('events')}>
              <Plus className="h-4 w-4" /> Create Event
            </Button>
            <Button variant="outline" className="border-maroon text-maroon" onClick={() => create('notices')}>
              <Plus className="h-4 w-4" /> Create Notice
            </Button>
          </>
        }
      />
      <Tabs
        tabs={[
          { value: 'events', label: 'Events' },
          { value: 'notices', label: 'Notices' },
        ]}
        value={kind}
        onChange={(value) => navigate(`/${value}`)}
      />
      {kind === 'events' ? <EventsTable onCreate={creating} /> : <NoticesTable onCreate={creating} />}
    </>
  );
}
