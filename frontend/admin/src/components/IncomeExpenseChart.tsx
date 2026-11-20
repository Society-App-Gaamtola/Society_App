'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { cn, formatDate, formatINR, monthLabelLong } from '@/lib/utils';
import type { MonthTotals } from '@/types';

export const CHART_COLORS = { donations: '#8E1426', expenses: '#E0901B' };

/** Width of one month (or day) on the chart. When they don't fit, the chart scrolls sideways. */
const MONTH_WIDTH = 76;
const BAR_WIDTH = 24;
const DAY_WIDTH = 30;
const DAY_BAR_WIDTH = 10;
/** A short period comes back per day: keys "YYYY-MM-DD" instead of "YYYY-MM" */
const isDaily = (data: MonthTotals[]) => data[0]?.key.length === 10;
const CHART_HEIGHT = 288;
// Bars area inside the chart: CHART_TOP from the top, X axis labels (recharts' default 30px) at the bottom
const CHART_TOP = 8;
const X_AXIS_HEIGHT = 30;
const Y_AXIS_WIDTH = 48;

/** ₹1,50,000 → "1.5L", ₹12,000 → "12K" (Indian units on the Y axis) */
const shortINR = (v: number) => {
  if (v >= 100000) return `${+(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${+(v / 1000).toFixed(1)}K`;
  return String(v);
};

/** Round steps for the ₹ axis (1, 2, 2.5, 5 × 10ⁿ), about 4 of them up to the biggest bar */
function axisTicks(max: number) {
  if (max <= 0) return [0];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

function Summary({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{formatINR(value)}</span>
    </div>
  );
}

/** Hover box: the full month name, both amounts and what is left (donations − expenses). */
function MonthTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload as MonthTotals;
  const net = m.donations - m.expenses;
  return (
    <div className="min-w-44 rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-1.5 font-semibold text-foreground">{m.key.length === 10 ? formatDate(m.key) : monthLabelLong(m.key)}</div>
      <div className="flex justify-between gap-4">
        <span style={{ color: CHART_COLORS.donations }}>Donations</span>
        <span className="font-medium">{formatINR(m.donations)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: CHART_COLORS.expenses }}>Expenses</span>
        <span className="font-medium">{formatINR(m.expenses)}</span>
      </div>
      <div className="mt-1.5 flex justify-between gap-4 border-t border-border pt-1.5">
        <span className="text-muted-foreground">Net</span>
        <span className={cn('font-semibold', net < 0 ? 'text-[#C62828]' : 'text-[#1B7F3B]')}>{formatINR(net)}</span>
      </div>
    </div>
  );
}

/**
 * Donations vs expenses per month, for exactly the months it is given; per day when the backend sent days
 * (a period of one month or less).
 * Many months scroll sideways; the chart opens on the newest month, so older months are to the left.
 */
export default function IncomeExpenseChart({ data }: { data: MonthTotals[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const daily = isDaily(data);
  const unit = daily ? 'day' : 'month';

  const donations = data.reduce((total, m) => total + m.donations, 0);
  const expenses = data.reduce((total, m) => total + m.expenses, 0);
  const hasData = donations > 0 || expenses > 0;
  const ticks = axisTicks(Math.max(0, ...data.flatMap((m) => [m.donations, m.expenses])));
  const top = ticks[ticks.length - 1];
  const plotHeight = CHART_HEIGHT - CHART_TOP - X_AXIS_HEIGHT;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth; // newest month in view
    setScrollable(el.scrollWidth > el.clientWidth + 1);
  }, [data]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <Summary color={CHART_COLORS.donations} label="Donations" value={donations} />
        <Summary color={CHART_COLORS.expenses} label="Expenses" value={expenses} />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Net</span>
          <span className={cn('font-semibold', donations - expenses < 0 ? 'text-[#C62828]' : 'text-[#1B7F3B]')}>
            {formatINR(donations - expenses)}
          </span>
        </div>
        <span className="ml-auto rounded-full bg-[#FBF5EC] px-2.5 py-0.5 text-xs text-muted-foreground">
          {data.length} {data.length === 1 ? unit : `${unit}s`}
        </span>
      </div>

      {hasData ? (
        <>
          <div className="flex">
            {/* ₹ axis: stays in place while the months scroll */}
            <div className="relative shrink-0 text-right text-xs text-muted-foreground" style={{ width: Y_AXIS_WIDTH, height: CHART_HEIGHT }}>
              {ticks.map((v) => (
                <span key={v} className="absolute right-2 -translate-y-1/2" style={{ top: CHART_TOP + (1 - v / top) * plotHeight }}>
                  {shortINR(v)}
                </span>
              ))}
            </div>
            <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
              <div style={{ minWidth: data.length * (daily ? DAY_WIDTH : MONTH_WIDTH), height: CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} barGap={daily ? 1 : 4} barSize={daily ? DAY_BAR_WIDTH : BAR_WIDTH} margin={{ top: CHART_TOP, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#F1E6DA" />
                    <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#EADFCF' }} fontSize={12} interval={0} height={X_AXIS_HEIGHT} />
                    <YAxis hide domain={[0, top]} ticks={ticks} />
                    <Tooltip content={<MonthTooltip />} cursor={{ fill: '#FBF5EC' }} />
                    <Bar dataKey="donations" name="Donations" fill={CHART_COLORS.donations} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.expenses} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {scrollable ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ChevronLeft className="h-3.5 w-3.5" /> Scroll left for earlier {unit}s
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex items-center justify-center rounded-lg bg-[#FBF5EC]" style={{ height: CHART_HEIGHT }}>
          <p className="text-sm text-muted-foreground">No verified donations or expenses in this period.</p>
        </div>
      )}
    </div>
  );
}
