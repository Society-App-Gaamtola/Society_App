'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateRangePicker } from '@/components/common';
import { NativeSelect } from '@/components/ui/primitives';
import { useUrlState } from '@/hooks/useUrlState';
import { cn, monthBounds, monthLabelLong, monthName, periodLabel, todayISO } from '@/lib/utils';

/** How many years back the Year / Month lists go. */
const YEARS_BACK = 6;

type Mode = 'all' | 'year' | 'month' | 'range';

const MODES: { value: Mode; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'year', label: 'Year' },
  { value: 'month', label: 'Month' },
  { value: 'range', label: 'Custom' },
];

/**
 * Period filter for the dashboard, reports and every list with dates (FilterBar `dateRange`): All time, one year, one month, or a custom date range.
 * Every choice is written to the URL as from / to (plus `period` for the chosen mode), so the totals,
 * the chart and a reload all follow the same period.
 */
export function PeriodFilter({ className }: { className?: string }) {
  const { get, setParams } = useUrlState();
  const from = get('from');
  const to = get('to');
  const mode: Mode = (get('period') as Mode) || (from || to ? 'range' : 'all');

  const today = todayISO();
  const thisYear = Number(today.slice(0, 4));
  const years = Array.from({ length: YEARS_BACK }, (_, i) => thisYear - i);
  // The year / month shown in the lists: from the picked period, or today
  const year = Number((from || today).slice(0, 4));
  const month = Number((from || today).slice(5, 7));

  const pickYear = (y: number) => setParams({ period: 'year', from: `${y}-01-01`, to: `${y}-12-31` });
  const pickMonth = (y: number, m: number) => setParams({ period: 'month', ...monthBounds(y, m) });
  /** ‹ / › in Month mode: the previous or next month (across the year boundary) */
  const stepMonth = (by: -1 | 1) => {
    const index = year * 12 + (month - 1) + by;
    pickMonth(Math.floor(index / 12), (index % 12) + 1);
  };
  const stepButton = 'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-white text-muted-foreground hover:bg-[#F5EEE4] hover:text-foreground';

  const changeMode = (next: Mode) => {
    if (next === 'all') setParams({ period: undefined, from: undefined, to: undefined });
    if (next === 'year') pickYear(year);
    if (next === 'month') pickMonth(year, month);
    if (next === 'range') setParams({ period: 'range' });
  };

  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      <div role="tablist" aria-label="Period" className="inline-flex h-10 items-center rounded-lg border border-input bg-white p-1">
        {MODES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => changeMode(value)}
            className={cn(
              'h-full rounded-md px-3 text-sm font-medium transition-colors',
              mode === value ? 'bg-maroon text-white shadow-sm' : 'text-muted-foreground hover:bg-[#F5EEE4] hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'month' ? (
        <button type="button" aria-label="Previous month" className={stepButton} onClick={() => stepMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      ) : null}

      {mode === 'month' ? (
        <NativeSelect aria-label="Month" className="w-32" value={month} onChange={(e) => pickMonth(year, Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {monthName(i)}
            </option>
          ))}
        </NativeSelect>
      ) : null}

      {mode === 'year' || mode === 'month' ? (
        <NativeSelect
          aria-label="Year"
          className="w-28"
          value={year}
          onChange={(e) => (mode === 'year' ? pickYear(Number(e.target.value)) : pickMonth(Number(e.target.value), month))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </NativeSelect>
      ) : null}

      {mode === 'month' ? (
        <button type="button" aria-label="Next month" className={stepButton} onClick={() => stepMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}

      {mode === 'range' ? <DateRangePicker /> : null}

      {mode === 'all' ? (
        <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#FBF5EC] px-3 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {periodLabel()}
        </span>
      ) : null}
    </div>
  );
}

/** The picked period in words, for card subtitles: "All time", "Year 2026", "November 2026" or "01 Nov 2026 - 20 Nov 2026". */
export function usePeriodLabel() {
  const { get } = useUrlState();
  const from = get('from');
  const to = get('to');
  const period = get('period');
  if (period === 'year' && from) return `Year ${from.slice(0, 4)}`;
  if (period === 'month' && from) return monthLabelLong(from.slice(0, 7));
  return periodLabel(from || null, to || null);
}
