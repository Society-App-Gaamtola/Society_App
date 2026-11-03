'use client';

import { memo, useCallback, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_PAGE_SIZE } from '@/config';
import type { Id } from '@/types';
import { ErrorState, SortIcon, TableRowsSkeleton } from './common';
import { Button, Checkbox } from './ui/primitives';

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => ReactNode;
};

type Sort = { field: string; order: 'asc' | 'desc' };

type Props<T extends { id: Id }> = {
  columns: Column<T>[];
  rows: T[] | undefined;
  total: number;
  page: number;
  pageSize?: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  sort?: Sort;
  onSortChange?: (sort: Sort) => void;
  onPageChange: (page: number) => void;
  selectedIds?: Id[];
  onSelectionChange?: (ids: Id[]) => void;
  emptyMessage?: string;
};

type RowProps<T extends { id: Id }> = {
  row: T;
  columns: Column<T>[];
  selectable: boolean;
  selected: boolean;
  onToggle: (id: Id, checked: boolean) => void;
};

function RowInner<T extends { id: Id }>({ row, columns, selectable, selected, onToggle }: RowProps<T>) {
  return (
    <tr className="border-t border-border hover:bg-[#FFFBF5]">
      {selectable ? (
        <td className="w-10 px-4 py-3">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onToggle(row.id, checked === true)}
            aria-label="Select row"
          />
        </td>
      ) : null}
      {columns.map((column) => (
        <td key={column.key} className={column.className ?? 'px-4 py-3'}>
          {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '—')}
        </td>
      ))}
    </tr>
  );
}

const Row = memo(RowInner) as typeof RowInner;

export function DataTable<T extends { id: Id }>({
  columns,
  rows,
  total,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  isLoading,
  isError,
  onRetry,
  sort,
  onSortChange,
  onPageChange,
  selectedIds,
  onSelectionChange,
  emptyMessage = 'No records found.',
}: Props<T>) {
  const selectable = !!onSelectionChange;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  const pageIds = rows?.map((r) => r.id) ?? [];
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds?.includes(id));

  const onToggle = useCallback(
    (id: Id, checked: boolean) => {
      const current = selectedIds ?? [];
      onSelectionChange?.(checked ? [...current, id] : current.filter((x) => x !== id));
    },
    [onSelectionChange, selectedIds],
  );

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-white">
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      {isLoading && !rows ? (
        <TableRowsSkeleton />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FBF5EC] text-xs font-semibold text-muted-foreground">
              <tr>
                {selectable ? (
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      aria-label="Select all rows"
                      onCheckedChange={(checked) =>
                        onSelectionChange?.(
                          checked === true
                            ? [...new Set([...(selectedIds ?? []), ...pageIds])]
                            : (selectedIds ?? []).filter((id) => !pageIds.includes(id)),
                        )
                      }
                    />
                  </th>
                ) : null}
                {columns.map((column) => {
                  const active = sort?.field === column.key;
                  return (
                    <th key={column.key} className="whitespace-nowrap px-4 py-3" aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {column.sortable && onSortChange ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() =>
                            onSortChange({ field: column.key, order: active && sort.order === 'asc' ? 'desc' : 'asc' })
                          }
                        >
                          {column.header}
                          <SortIcon order={active ? sort.order : undefined} />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows?.length ? (
                rows.map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    columns={columns}
                    selectable={selectable}
                    selected={!!selectedIds?.includes(row.id)}
                    onToggle={onToggle}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>
          Showing {from} to {to} of {total}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            Page {page} of {lastPage}
          </span>
          <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
