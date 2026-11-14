'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, EyeOff, Megaphone, Plus, Send, Star, StarOff } from 'lucide-react';
import { DEFAULT_LOCATION } from '@/config';
import { ConfirmDialog, DetailList, Field, FileUpload, FormDialog, PageHeader, RowActions, StatusBadge, Tabs, ViewDialog } from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { Button, Input, NativeSelect, Switch, Textarea } from '@/components/ui/primitives';
import { eventsHooks } from '@/hooks/useEvents';
import { noticesHooks } from '@/hooks/useNotices';
import { useSettings } from '@/hooks/useSettings';
import { useUrlState } from '@/hooks/useUrlState';
import { formatDate, isImageUrl, todayISO } from '@/lib/utils';
import { PUBLISH_STATUSES, type Event, type NewRecord, type Notice } from '@/types';

type EventDraft = NewRecord<Event>;
type NoticeDraft = NewRecord<Notice>;

const emptyEvent = (category: string): EventDraft => ({
  title: '',
  date: todayISO(),
  endDate: null,
  time: '',
  venue: '',
  category,
  status: 'Draft',
  featured: false,
  organizer: 'Executive Committee',
  contact: '',
  latitude: DEFAULT_LOCATION.latitude,
  longitude: DEFAULT_LOCATION.longitude,
  description: '',
  image: null,
});

const emptyNotice = (tag: string): NoticeDraft => ({ title: '', date: todayISO(), description: '', tag, icon: 'megaphone', status: 'Draft' });

function EventForm({ open, onOpenChange, event }: { open: boolean; onOpenChange: (open: boolean) => void; event?: Event }) {
  const { data: settings } = useSettings();
  const categories = settings?.eventCategories ?? [];
  const create = eventsHooks.useCreate();
  const update = eventsHooks.useUpdate();
  const [draft, setDraft] = useState<EventDraft>(emptyEvent(''));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (event) {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = event;
      setDraft(rest);
    } else setDraft(emptyEvent(categories[0] ?? ''));
    // categories only matter for a new event's default
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event]);

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const found: Record<string, string> = {};
    if (!draft.title.trim()) found.title = 'Title is required.';
    if (!draft.date) found.date = 'Date is required.';
    if (draft.endDate && draft.endDate < draft.date) found.endDate = 'End date is before the start date.';
    if (!draft.venue.trim()) found.venue = 'Venue is required.';
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { ...draft, title: draft.title.trim(), endDate: draft.endDate || null };
    const done = { onSuccess: () => onOpenChange(false) };
    if (event) update.mutate({ id: event.id, changes: body }, done);
    else create.mutate(body, done);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={event ? 'Edit Event' : 'Create Event'}
      submitLabel={event ? 'Save Changes' : 'Create Event'}
      pending={create.isPending || update.isPending}
      onSubmit={submit}
      className="max-w-2xl"
    >
      <Field label="Title" error={errors.title}>
        <Input value={draft.title} onChange={(e) => set('title', e.target.value)} autoFocus />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category">
          <NativeSelect value={draft.category} onChange={(e) => set('category', e.target.value)}>
            {[...new Set([...categories, draft.category])].filter(Boolean).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Time">
          <Input value={draft.time} onChange={(e) => set('time', e.target.value)} placeholder="7:00 PM - 10:00 PM" />
        </Field>
        <Field label="Start Date" error={errors.date}>
          <Input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="End Date (optional)" error={errors.endDate}>
          <Input type="date" value={draft.endDate ?? ''} min={draft.date} onChange={(e) => set('endDate', e.target.value || null)} />
        </Field>
        <Field label="Venue" error={errors.venue}>
          <Input value={draft.venue} onChange={(e) => set('venue', e.target.value)} />
        </Field>
        <Field label="Organizer">
          <Input value={draft.organizer} onChange={(e) => set('organizer', e.target.value)} />
        </Field>
        <Field label="Contact Number">
          <Input value={draft.contact} onChange={(e) => set('contact', e.target.value)} inputMode="tel" />
        </Field>
        <Field label="Status">
          <NativeSelect value={draft.status} onChange={(e) => set('status', e.target.value as EventDraft['status'])}>
            {PUBLISH_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Description">
        <Textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={3} />
      </Field>
      <Field label="Event Image">
        <FileUpload value={draft.image} onChange={(url) => set('image', url)} accept="image/*" label="Upload image" />
      </Field>
      <div className="flex items-center justify-between text-sm">
        Show as featured on the app home screen
        <Switch label="Featured" checked={!!draft.featured} onCheckedChange={(v) => set('featured', v)} />
      </div>
    </FormDialog>
  );
}

function NoticeForm({ open, onOpenChange, notice }: { open: boolean; onOpenChange: (open: boolean) => void; notice?: Notice }) {
  const { data: settings } = useSettings();
  const tags = settings?.noticeTags ?? [];
  const create = noticesHooks.useCreate();
  const update = noticesHooks.useUpdate();
  const [draft, setDraft] = useState<NoticeDraft>(emptyNotice(''));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (notice) {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = notice;
      setDraft(rest);
    } else setDraft(emptyNotice(tags[0] ?? 'General'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notice]);

  const set = <K extends keyof NoticeDraft>(key: K, value: NoticeDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const found: Record<string, string> = {};
    if (!draft.title.trim()) found.title = 'Title is required.';
    if (!draft.description.trim()) found.description = 'Write the notice text.';
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { ...draft, title: draft.title.trim() };
    const done = { onSuccess: () => onOpenChange(false) };
    if (notice) update.mutate({ id: notice.id, changes: body }, done);
    else create.mutate(body, done);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={notice ? 'Edit Notice' : 'Create Notice'}
      submitLabel={notice ? 'Save Changes' : 'Create Notice'}
      pending={create.isPending || update.isPending}
      onSubmit={submit}
    >
      <Field label="Title" error={errors.title}>
        <Input value={draft.title} onChange={(e) => set('title', e.target.value)} autoFocus />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date">
          <Input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Category">
          <NativeSelect value={draft.tag} onChange={(e) => set('tag', e.target.value)}>
            {[...new Set([...tags, draft.tag])].filter(Boolean).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Status">
          <NativeSelect value={draft.status} onChange={(e) => set('status', e.target.value as NoticeDraft['status'])}>
            {PUBLISH_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Notice" error={errors.description}>
        <Textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={5} />
      </Field>
    </FormDialog>
  );
}

type Kind = 'events' | 'notices';

function EventsTable({ onCreate }: { onCreate: boolean }) {
  const url = useUrlState();
  const { data: settings } = useSettings();
  const list = eventsHooks.useList(url.toListParams(['status', 'category'], 'date'));
  const update = eventsHooks.useUpdate();
  const remove = eventsHooks.useRemove();
  const [form, setForm] = useState<{ open: boolean; event?: Event }>({ open: false });
  const [viewing, setViewing] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState<Event | null>(null);

  useEffect(() => {
    if (onCreate) setForm({ open: true });
  }, [onCreate]);

  const columns = useMemo<Column<Event>[]>(
    () => [
      { key: 'type', header: 'Type', render: () => <CalendarDays className="h-4 w-4 text-maroon" aria-label="Event" /> },
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (e) => (
          <button type="button" className="text-left font-medium text-[#1E3A8A] hover:underline" onClick={() => setViewing(e)}>
            {e.title}
            {e.featured ? <Star className="ml-1 inline h-3.5 w-3.5 fill-[#D9A21B] text-[#D9A21B]" aria-label="Featured" /> : null}
          </button>
        ),
      },
      { key: 'date', header: 'Date', sortable: true, className: 'whitespace-nowrap px-4 py-3', render: (e) => formatDate(e.date) },
      { key: 'time', header: 'Time', className: 'whitespace-nowrap px-4 py-3', render: (e) => e.time || '—' },
      { key: 'venue', header: 'Venue', render: (e) => e.venue || '—' },
      { key: 'status', header: 'Status', sortable: true, render: (e) => <StatusBadge status={e.status} /> },
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
              e.status === 'Published'
                ? { label: 'Move to Draft', icon: EyeOff, onSelect: () => update.mutate({ id: e.id, changes: { status: 'Draft' } }) }
                : { label: 'Publish', icon: Send, onSelect: () => update.mutate({ id: e.id, changes: { status: 'Published' } }) },
              e.featured
                ? { label: 'Remove from featured', icon: StarOff, onSelect: () => update.mutate({ id: e.id, changes: { featured: false } }) }
                : { label: 'Mark as featured', icon: Star, onSelect: () => update.mutate({ id: e.id, changes: { featured: true } }) },
            ]}
          />
        ),
      },
    ],
    [update],
  );

  return (
    <>
      <FilterBar
        searchPlaceholder="Search by title..."
        dateRange
        selects={[
          { name: 'status', label: 'Status', options: PUBLISH_STATUSES },
          { name: 'category', label: 'Categories', options: settings?.eventCategories ?? [] },
        ]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.data}
        total={list.data?.total ?? 0}
        page={url.page}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        sort={url.sort}
        onSortChange={({ field, order }) => url.setParams({ sort: field, order })}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="events"
      />
      <EventForm open={form.open} event={form.event} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ViewDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? ''}
        className="max-w-2xl"
        footer={
          viewing ? (
            <Button
              variant="outline"
              onClick={() => {
                setForm({ open: true, event: viewing });
                setViewing(null);
              }}
            >
              Edit
            </Button>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-4">
            {viewing.image && isImageUrl(viewing.image) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.image} alt="" className="max-h-64 w-full rounded-lg object-cover" />
            ) : null}
            <DetailList
              items={[
                ['Date', viewing.endDate ? `${formatDate(viewing.date)} – ${formatDate(viewing.endDate)}` : formatDate(viewing.date)],
                ['Time', viewing.time],
                ['Venue', viewing.venue],
                ['Category', viewing.category],
                ['Organizer', viewing.organizer],
                ['Contact', viewing.contact],
                ['Status', <StatusBadge key="s" status={viewing.status} />],
                ['Featured', viewing.featured ? 'Yes' : 'No'],
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
        description="The event is removed from the app. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}

function NoticesTable({ onCreate }: { onCreate: boolean }) {
  const url = useUrlState();
  const { data: settings } = useSettings();
  const list = noticesHooks.useList(url.toListParams(['status', 'tag'], 'date'));
  const update = noticesHooks.useUpdate();
  const remove = noticesHooks.useRemove();
  const [form, setForm] = useState<{ open: boolean; notice?: Notice }>({ open: false });
  const [viewing, setViewing] = useState<Notice | null>(null);
  const [deleting, setDeleting] = useState<Notice | null>(null);

  useEffect(() => {
    if (onCreate) setForm({ open: true });
  }, [onCreate]);

  const columns = useMemo<Column<Notice>[]>(
    () => [
      { key: 'type', header: 'Type', render: () => <Megaphone className="h-4 w-4 text-[#C62828]" aria-label="Notice" /> },
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (n) => (
          <button type="button" className="text-left font-medium text-[#1E3A8A] hover:underline" onClick={() => setViewing(n)}>
            {n.title}
          </button>
        ),
      },
      { key: 'date', header: 'Date', sortable: true, className: 'whitespace-nowrap px-4 py-3', render: (n) => formatDate(n.date) },
      { key: 'tag', header: 'Category', sortable: true },
      { key: 'status', header: 'Status', sortable: true, render: (n) => <StatusBadge status={n.status} /> },
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
              n.status === 'Published'
                ? { label: 'Move to Draft', icon: EyeOff, onSelect: () => update.mutate({ id: n.id, changes: { status: 'Draft' } }) }
                : { label: 'Publish', icon: Send, onSelect: () => update.mutate({ id: n.id, changes: { status: 'Published' } }) },
            ]}
          />
        ),
      },
    ],
    [update],
  );

  return (
    <>
      <FilterBar
        searchPlaceholder="Search by title..."
        dateRange
        selects={[
          { name: 'status', label: 'Status', options: PUBLISH_STATUSES },
          { name: 'tag', label: 'Categories', options: settings?.noticeTags ?? [] },
        ]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.data}
        total={list.data?.total ?? 0}
        page={url.page}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        sort={url.sort}
        onSortChange={({ field, order }) => url.setParams({ sort: field, order })}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel="notices"
      />
      <NoticeForm open={form.open} notice={form.notice} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <ViewDialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)} title={viewing?.title ?? ''}>
        {viewing ? (
          <div className="space-y-4">
            <DetailList
              items={[
                ['Date', formatDate(viewing.date)],
                ['Category', viewing.tag],
                ['Status', <StatusBadge key="s" status={viewing.status} />],
              ]}
            />
            <p className="whitespace-pre-line text-sm">{viewing.description}</p>
          </div>
        ) : null}
      </ViewDialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.title}"?`}
        description="The notice is removed from the app. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}

/** Screen 27. Events and Notices share one screen; each sidebar link opens its own tab. */
export function EventsNoticesPage({ kind }: { kind: Kind }) {
  const router = useRouter();
  const url = useUrlState();
  // ?new=1 opens the create form, so "Create Notice" works from the Events tab too.
  const creating = url.get('new') === '1';

  const create = (target: Kind) => router.push(`/${target}?new=1`);

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
        onChange={(value) => router.push(`/${value}`)}
      />
      {kind === 'events' ? <EventsTable onCreate={creating} /> : <NoticesTable onCreate={creating} />}
    </>
  );
}
