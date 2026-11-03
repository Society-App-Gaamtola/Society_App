'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '@/lib/utils';

export default function DonationTrendChart({ data }: { data: { month: string; amount: number }[] }) {
  if (!data.length) {
    return <p className="py-24 text-center text-sm text-muted-foreground">No verified donations yet.</p>;
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="#F1E6DA" />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#EADFCF' }} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: number) => `${v / 1000}k`} />
          <Tooltip formatter={(v) => [formatINR(Number(v)), 'Donations']} />
          <Bar dataKey="amount" fill="#8E1426" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
