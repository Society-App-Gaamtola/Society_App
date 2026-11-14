'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '@/lib/utils';
import type { MonthTotals } from '@/types';

export const CHART_COLORS = { donations: '#8E1426', expenses: '#E0901B' };

export default function IncomeExpenseChart({ data }: { data: MonthTotals[] }) {
  if (!data.some((m) => m.donations || m.expenses)) {
    return <p className="py-24 text-center text-sm text-muted-foreground">No verified donations or expenses in these months.</p>;
  }
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} barSize={16}>
          <CartesianGrid vertical={false} stroke="#F1E6DA" />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#EADFCF' }} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: number) => (v ? `${v / 1000}K` : '0')} />
          <Tooltip formatter={(v, name) => [formatINR(Number(v)), name]} cursor={{ fill: '#FBF5EC' }} />
          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
          <Bar dataKey="donations" name="Donations" fill={CHART_COLORS.donations} radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.expenses} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
