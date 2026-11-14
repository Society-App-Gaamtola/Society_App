'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, ImageIcon, PlayCircle, Video, XCircle } from 'lucide-react';
import { DetailList, EmptyState, ErrorState, PageHeader, ReasonDialog, StatusBadge, Tabs, ViewDialog } from '@/components/common';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';
import { Button, Skeleton } from '@/components/ui/primitives';
import { MEDIA_PAGE_SIZE } from '@/config';
import { mediaHooks, useApproveMedia, useRejectMedia } from '@/hooks/useMedia';
import { useUrlState } from '@/hooks/useUrlState';
import { cn, formatDate } from '@/lib/utils';
import type { MediaItem } from '@/types';

const TABS = {
  all: { label: 'All Media', icon: undefined, filters: {} },
  photos: { label: 'Photos', icon: ImageIcon, filters: { type: 'image' } },
  videos: { label: 'Videos', icon: Video, filters: { type: 'video' } },
  pending: { label: 'Pending', icon: Clock, filters: { status: 'Pending' } },
  approved: { label: 'Approved', icon: CheckCircle2, filters: { status: 'Approved' } },
  rejected: { label: 'Rejected', icon: XCircle, filters: { status: 'Rejected' } },
} as const;
type TabKey = keyof typeof TABS;

function Preview({ item, large }: { item: MediaItem; large?: boolean }) {
  if (item.url && item.type === 'video' && large) {
    return <video src={item.url} controls className="max-h-[60vh] w-full rounded-lg bg-black" />;
  }
  if (item.url && item.type === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt={item.title} className={cn('w-full object-cover', large ? 'max-h-[60vh] rounded-lg object-contain' : 'h-full')} />;
  }
  const Icon = item.type === 'video' ? PlayCircle : ImageIcon;
  return (
    <div className={cn('flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#7A1020] to-[#C9A24A] text-white', large && 'aspect-video rounded-lg')}>
      <Icon className={large ? 'h-14 w-14' : 'h-10 w-10'} />
      <span className="px-2 text-center text-xs opacity-90">{item.album}</span>
    </div>
  );
}

function MediaCard({ item, onView, onApprove, onReject }: { item: MediaItem; onView: () => void; onApprove: () => void; onReject: () => void }) {
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-white">
      <button type="button" onClick={onView} className="relative block aspect-video w-full" aria-label={`View ${item.title}`}>
        <Preview item={item} />
        <span className="absolute right-2 top-2 rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-[#1E63C6] shadow">
          {item.type === 'video' ? 'Video' : 'Photo'}
        </span>
        {item.status !== 'Pending' ? <StatusBadge status={item.status} className="absolute left-2 top-2 shadow" /> : null}
      </button>
      <div className="p-3">
        <div className="truncate text-sm font-semibold">{item.uploaderName ?? item.uploadedBy}</div>
        <div className="truncate text-xs text-muted-foreground">
          {item.title} · {formatDate(item.uploadedOn)}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <Button size="sm" variant="outline" onClick={onView}>
            View
          </Button>
          <Button size="sm" className="bg-[#1E8E4E] hover:bg-[#187540]" disabled={item.status === 'Approved'} onClick={onApprove}>
            Approve
          </Button>
          <Button size="sm" variant="outline" className="border-[#C62828] text-[#C62828]" disabled={item.status === 'Rejected'} onClick={onReject}>
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
  const base = url.toListParams([], 'uploadedOn', MEDIA_PAGE_SIZE);
  const list = mediaHooks.useList({ ...base, filters: { ...base.filters, ...TABS[tab].filters }, sort: { field: 'uploadedOn', order: 'desc' } });
  const all = mediaHooks.useList({});
  const approve = useApproveMedia();
  const reject = useRejectMedia();
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  const [rejecting, setRejecting] = useState<MediaItem | null>(null);

  const counts = useMemo(() => {
    const rows = all.data?.data ?? [];
    return Object.fromEntries(
      (Object.keys(TABS) as TabKey[]).map((key) => [
        key,
        rows.filter((r) => Object.entries(TABS[key].filters).every(([field, value]) => String(r[field as keyof MediaItem]) === value)).length,
      ]),
    ) as Record<TabKey, number>;
  }, [all.data]);

  const onApprove = (item: MediaItem) => approve.mutate(item.id, { onSuccess: () => setViewing(null) });

  return (
    <>
      <PageHeader title="Media Approval" subtitle="Review and approve photos and videos uploaded by members" />
      <Tabs
        tabs={(Object.keys(TABS) as TabKey[]).map((key) => ({ value: key, label: TABS[key].label, icon: TABS[key].icon, count: all.data ? counts[key] : undefined }))}
        value={tab}
        onChange={(value) => url.setParams({ tab: value === 'all' ? undefined : value })}
      />
      <FilterBar searchPlaceholder="Search by member name or album..." dateRange keep={['tab']} />

      {list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isLoading && !list.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-60 rounded-xl" />
          ))}
        </div>
      ) : list.data?.data.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.data.data.map((item) => (
            <MediaCard key={item.id} item={item} onView={() => setViewing(item)} onApprove={() => onApprove(item)} onReject={() => setRejecting(item)} />
          ))}
        </ul>
      ) : (
        <EmptyState message="No photos or videos here." />
      )}
      <Pagination page={url.page} total={list.data?.total ?? 0} pageSize={MEDIA_PAGE_SIZE} onPageChange={(page) => url.setParams({ page })} itemLabel="items" className="px-0" />

      <ViewDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? ''}
        className="max-w-3xl"
        footer={
          viewing ? (
            <>
              <Button variant="outline" className="border-[#C62828] text-[#C62828]" disabled={viewing.status === 'Rejected'} onClick={() => setRejecting(viewing)}>
                Reject
              </Button>
              <Button className="bg-[#1E8E4E] hover:bg-[#187540]" disabled={viewing.status === 'Approved' || approve.isPending} onClick={() => onApprove(viewing)}>
                Approve
              </Button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-4">
            <Preview item={viewing} large />
            {!viewing.url ? <p className="text-xs text-muted-foreground">No file is attached to this upload, so a placeholder is shown.</p> : null}
            <DetailList
              items={[
                ['Uploaded By', `${viewing.uploaderName ?? ''} (${viewing.uploadedBy})`],
                ['Uploaded On', formatDate(viewing.uploadedOn)],
                ['Album', viewing.album],
                ['Type', viewing.type === 'video' ? 'Video' : 'Photo'],
                ['Status', <StatusBadge key="s" status={viewing.status} />],
                ['Rejection Reason', viewing.rejectionReason],
              ]}
            />
          </div>
        ) : null}
      </ViewDialog>
      <ReasonDialog
        open={!!rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={`Reject "${rejecting?.title}"`}
        pending={reject.isPending}
        onSubmit={(reason) =>
          rejecting &&
          reject.mutate(
            { id: rejecting.id, reason },
            {
              onSuccess: () => {
                setRejecting(null);
                setViewing(null);
              },
            },
          )
        }
      />
    </>
  );
}
