'use client';

import dynamic from 'next/dynamic';
import { Clock, HandCoins, ReceiptText, Users, Wallet } from 'lucide-react';
import { ErrorState, PageHeader, StatCard, StatCardsSkeleton } from '@/components/common';
import { Skeleton } from '@/components/ui/primitives';
import { useDashboardStats } from '@/hooks/useDashboard';
import { formatINR } from '@/lib/utils';

const DonationTrendChart = dynamic(() => import('@/components/DonationTrendChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-72" />,
});

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardStats();

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of society activity." />
      {isError ? <ErrorState onRetry={() => refetch()} /> : null}
      {isLoading ? <StatCardsSkeleton /> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} value={data.totalMembers} label="Total Members" iconClassName="bg-[#E8F0FC] text-[#1E63C6]" />
            <StatCard icon={HandCoins} value={formatINR(data.totalDonations)} label="Verified Donations" iconClassName="bg-[#E6F6EC] text-[#1E8E4E]" />
            <StatCard icon={ReceiptText} value={formatINR(data.totalExpenses)} label="Total Expenses" iconClassName="bg-[#FDECEC] text-[#C62828]" />
            <StatCard icon={Wallet} value={formatINR(data.balance)} label="Balance" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-border bg-white p-4 lg:col-span-2">
              <h2 className="mb-3 text-sm font-bold">Donation Trend</h2>
              <DonationTrendChart data={data.donationTrend} />
            </section>
            <section className="rounded-xl border border-border bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Clock className="h-4 w-4 text-[#E0700B]" /> Pending
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt>Donations to verify</dt><dd className="font-semibold">{data.pendingDonations}</dd></div>
                <div className="flex justify-between"><dt>Executive requests</dt><dd className="font-semibold">{data.pendingRequests}</dd></div>
                <div className="flex justify-between"><dt>Media to approve</dt><dd className="font-semibold">{data.pendingMedia}</dd></div>
              </dl>
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}
