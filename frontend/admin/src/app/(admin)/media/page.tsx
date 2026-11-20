'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, ImageIcon, Loader2, PlayCircle, Trash2, Video, XCircle } from 'lucide-react';
import { ConfirmDialog, DetailList, EmptyState, ErrorState, PageHeader, ReasonDialog, StatusBadge, Tabs, ViewDialog } from '@/components/common';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';
import { Button, Skeleton } from '@/components/ui/primitives';
import { DEFAULT_PAGE_SIZE } from '@/config';
import { useDeleteMedia, useMediaPage, useReviewMedia } from '@/hooks/useAdminContent';
import { useUrlState } from '@/hooks/useUrlState';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { MEDIA_STATUS_LABEL, type AdminMediaItem, type MediaCounts, type MediaQuery } from '@/services/adminMedia';

/** Each tab is a query on GET /user/media (manage = every status); counts come back with every page */
const TABS = {
  all: { label: 'All Media', icon: undefined, query: { manage: true } },
  photos: { label: 'Photos', icon: ImageIcon, query: { manage: true, media_type: 'photo' } },
  videos: { label: 'Videos', icon: Video, query: { manage: true, media_type: 'video' } },
  pending: { label: 'Pending', icon: Clock, query: { status: 'pending' } },
  approved: { label: 'Approved', icon: CheckCircle2, query: { status: 'approved' } },
  rejected: { label: 'Rejected', icon: XCircle, query: { status: 'rejected' } },
} as const satisfies Record<keyof MediaCounts, { label: string; icon: unknown; query: Partial<MediaQuery> }>;
type TabKey = keyof typeof TABS;

const sizeLabel = (bytes: number | null) => (bytes ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : '—');

function Preview({ item, large }: { item: AdminMediaItem; large?: boolean }) {
  if (item.media_type === 'video' && large) {
    return <video src={item.media_url} poster={item.thumbnail_url ?? undefined} controls className="max-h-[60vh] w-full rounded-lg bg-black" />;
  }
  const src = item.media_type === 'video' ? item.thumbnail_url : item.media_url;
  if (src) {
    return (
      <span className="relative block h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={item.caption ?? ''} loading="lazy" className={cn('h-full w-full object-cover', large && 'max-h-[60vh] rounded-lg object-contain')} />
        {item.media_type === 'video' ? <PlayCircle className="absolute inset-0 m-auto h-10 w-10 text-white drop-shadow" /> : null}
      </span>
    );
  }
  return (
    <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7A1020] to-[#C9A24A] text-white', large && 'aspect-video rounded-lg')}>
      <PlayCircle className={large ? 'h-14 w-14' : 'h-10 w-10'} />
    </div>
  );
}

function MediaCard({ item, busy, onView, onApprove, onReject }: { item: AdminMediaItem; busy: boolean; onView: () => void; onApprove: () => void; onReject: () => void }) {
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-white">
      <button type="button" onClick={onView} className="relative block aspect-video w-full overflow-hidden bg-[#F5EEE4]" aria-label={`View ${item.caption || 'upload'}`}>
        <Preview item={item} />
        <span className="absolute right-2 top-2 rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-[#1E63C6] shadow">
          {item.media_type === 'video' ? 'Video' : 'Photo'}
        </span>
        <StatusBadge status={MEDIA_STATUS_LABEL[item.status]} className="absolute left-2 top-2 shadow" />
      </button>
      <div className="p-3">
        <div className="truncate text-sm font-semibold">{item.uploaded_by_name ?? 'Member'}</div>
        <div className="truncate text-xs text-muted-foreground">
          {item.caption || item.category.name} · {formatDate(item.created_at)}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <Button size="sm" variant="outline" onClick={onView}>
            View
          </Button>
          <Button size="sm" className="bg-[#1E8E4E] hover:bg-[#187540]" disabled={item.status === 'approved' || busy} onClick={onApprove}>
            Approve
          </Button>
          <Button size="sm" variant="outline" className="border-[#C62828] text-[#C62828]" disabled={item.status === 'rejected' || busy} onClick={onReject}>
            Reject
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function MediaPage() {
  const url = useUrlState();
  const tab: TabKey = (url.get('tab') as TabKey) in TABS ? (url.get('tab') as TabKey) : 'all';
  const list = useMediaPage({
    page: url.page,
    limit: DEFAULT_PAGE_SIZE,
    search: url.search || undefined,
    from_date: url.range.from,
    to_date: url.range.to,
    ...TABS[tab].query,
  });
  const review = useReviewMedia();
  const remove = useDeleteMedia();
  const [viewing, setViewing] = useState<AdminMediaItem | null>(null);
  const [rejecting, setRejecting] = useState<AdminMediaItem | null>(null);
  const [deleting, setDeleting] = useState<AdminMediaItem | null>(null);
  const counts = list.data?.counts;

  const approve = (item: AdminMediaItem) => review.mutate({ id: item.id, action: 'approve' }, { onSuccess: () => setViewing(null) });

  return (
    <>
      <PageHeader title="Media Approval" subtitle="Review and approve photos and videos uploaded by members" />
      <Tabs
        tabs={(Object.keys(TABS) as TabKey[]).map((key) => ({ value: key, label: TABS[key].label, icon: TABS[key].icon, count: counts?.[key] }))}
        value={tab}
        onChange={(value) => url.setParams({ tab: value === 'all' ? undefined : value })}
      />
      <FilterBar searchPlaceholder="Search by member name, caption or category..." dateRange keep={['tab']} />

      {list.isError ? (
        <ErrorState message={list.error?.message} onRetry={() => list.refetch()} />
      ) : list.isLoading && !list.data ? (
        <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : list.data?.media.length ? (
        <div className="relative">
          <ul className={cn('grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4', list.isFetching && 'pointer-events-none opacity-50')}>
            {list.data.media.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                busy={review.isPending}
                onView={() => setViewing(item)}
                onApprove={() => approve(item)}
                onReject={() => setRejecting(item)}
              />
            ))}
          </ul>
          {list.isFetching ? (
            <span className="pointer-events-none absolute inset-x-0 top-6 mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-maroon shadow-md">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </span>
          ) : null}
        </div>
      ) : (
        <EmptyState message={tab === 'pending' ? 'Nothing waiting for approval.' : 'No photos or videos here.'} />
      )}
      {list.data ? (
        <Pagination page={url.page} total={list.data.pagination.total} pageSize={DEFAULT_PAGE_SIZE} onPageChange={(page) => url.setParams({ page })} itemLabel="items" className="px-0" />
      ) : null}

      <ViewDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.caption || (viewing?.media_type === 'video' ? 'Video' : 'Photo')}
        className="max-w-3xl"
        footer={
          viewing ? (
            <>
              <Button variant="ghost" className="mr-auto text-[#C62828]" onClick={() => setDeleting(viewing)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <Button variant="outline" className="border-[#C62828] text-[#C62828]" disabled={viewing.status === 'rejected'} onClick={() => setRejecting(viewing)}>
                Reject
              </Button>
              <Button className="bg-[#1E8E4E] hover:bg-[#187540]" disabled={viewing.status === 'approved' || review.isPending} onClick={() => approve(viewing)}>
                {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Approve
              </Button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-4">
            <Preview item={viewing} large />
            <DetailList
              items={[
                ['Uploaded By', viewing.uploaded_by_name ?? '—'],
                ['Uploaded On', formatDateTime(viewing.created_at)],
                ['Category', viewing.category.name],
                ['Type', viewing.media_type === 'video' ? 'Video' : 'Photo'],
                ['Size', sizeLabel(viewing.file_size_bytes)],
                ['Status', <StatusBadge key="s" status={MEDIA_STATUS_LABEL[viewing.status]} />],
                ...(viewing.moderated_at ? [['Reviewed On', formatDateTime(viewing.moderated_at)] as [string, string]] : []),
                ...(viewing.rejection_reason ? [['Rejection Reason', viewing.rejection_reason] as [string, string]] : []),
              ]}
            />
          </div>
        ) : null}
      </ViewDialog>
      <ReasonDialog
        open={!!rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={`Reject ${rejecting?.caption ? `"${rejecting.caption}"` : 'this upload'}`}
        pending={review.isPending}
        onSubmit={(reason) =>
          rejecting &&
          review.mutate(
            { id: rejecting.id, action: 'reject', reason },
            {
              onSuccess: () => {
                setRejecting(null);
                setViewing(null);
              },
            },
          )
        }
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this upload?"
        description="It is removed from the gallery. The member who uploaded it can no longer see it either."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setViewing(null) })}
      />
    </>
  );
}
