'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Page numbers to show: always the first and last, the current one and its neighbours, "…" for gaps. */
function pageList(page: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set([1, last, page - 1, page, page + 1].filter((p) => p >= 1 && p <= last));
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= last - 2) [last - 3, last - 2, last - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['…' as const, p] : [p]));
}

export function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
  itemLabel = 'entries',
  className,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  const box = 'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs';

  return (
    <nav aria-label="Pagination" className={cn('flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground', className)}>
      <span>
        Showing {from} to {to} of {total} {itemLabel}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" className={cn(box, 'hover:bg-accent disabled:opacity-40')} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageList(page, last).map((p, i) =>
          p === '…' ? (
            <span key={`gap${i}`} className={box}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p)}
              className={cn(box, p === page ? 'bg-maroon font-semibold text-white' : 'text-foreground hover:bg-accent')}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" className={cn(box, 'hover:bg-accent disabled:opacity-40')} disabled={page >= last} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
