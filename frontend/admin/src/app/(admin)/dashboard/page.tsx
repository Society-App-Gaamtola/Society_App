'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Crown,
  FileText,
  HandCoins,
  ImageIcon,
  Megaphone,
  ReceiptText,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card, EmptyState, ErrorState, PageHeader, StatCard, StatCardsSkeleton, ViewDialog } from '@/components/common';
import { PeriodFilter, usePeriodLabel } from '@/components/PeriodFilter';
import { Skeleton } from '@/components/ui/primitives';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useUrlState } from '@/hooks/useUrlState';
import { formatDateTime, formatINR } from '@/lib/utils';
import type { RecentActivity } from '@/types';

const IncomeExpenseChart = dynamic(() => import('@/components/IncomeExpenseChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-72" />,
});

/** The icon of each kind of activity (the backend's ACTIVITY codes) */
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  event_created: CalendarDays,
  notice_created: Megaphone,
  member_joined: UserPlus,
  media_uploaded: ImageIcon,
  executive_request_sent: ShieldCheck,
  donation_recorded: HandCoins,
  expense_created: ReceiptText,
};

function ActivityRow({ activity }: { activity: RecentActivity }) {
  const Icon = ACTIVITY_ICONS[activity.action] ?? FileText;
  const detail = [activity.target, activity.actor && `by ${activity.actor}`].filter(Boolean).join(' · ');
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FDECEC] text-maroon">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{activity.text}</div>
        {detail ? <div className="truncate text-xs text-muted-foreground">{detail}</div> : null}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(activity.at)}</span>
    </li>
  );
}

/** The dashboard's period as list filters (from / to), so a money card opens the same dates */
function withRange(path: string, params: Record<string, string>, range: { from?: string; to?: string }) {
  const query = new URLSearchParams(params);
  if (range.from) query.set('from', range.from);
  if (range.to) query.set('to', range.to);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

type PendingCounts = { donations: number; expenses: number; requests: number; media: number };

/** "Pending Approvals" card: what is waiting, each row opening its approval queue (the rows add up to the card) */
function PendingDialog({ open, onOpenChange, counts }: { open: boolean; onOpenChange: (open: boolean) => void; counts: PendingCounts }) {
  const rows: { label: string; count: number; href: string; icon: LucideIcon }[] = [
    { label: 'Donations to verify', count: counts.donations, href: '/donations?status=pending', icon: HandCoins },
    { label: 'Expenses / cash entries to verify', count: counts.expenses, href: '/expenses?status=pending', icon: ReceiptText },
    { label: 'Executive requests', count: counts.requests, href: '/executives?status=pending', icon: Crown },
    { label: 'Photos / videos to approve', count: counts.media, href: '/media?tab=pending', icon: ImageIcon },
  ];
  return (
    <ViewDialog open={open} onOpenChange={onOpenChange} title="Pending Approvals" className="max-w-md">
      <ul className="divide-y divide-border">
        {rows.map(({ label, count, href, icon: Icon }) => (
          <li key={href}>
            <Link href={href} onClick={() => onOpenChange(false)} className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm hover:bg-muted">
              <Icon className="h-5 w-5 shrink-0 text-maroon" />
              <span className="flex-1 font-medium">{label}</span>
              <span className="rounded-full bg-[#FFF1E0] px-2.5 py-0.5 text-xs font-bold text-[#E0700B]">{count}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </ViewDialog>
  );
}

export default function DashboardPage() {
  const { range } = useUrlState();
  const { data, isLoading, isError, refetch } = useDashboardStats(range);
  const [showPending, setShowPending] = useState(false);
  const periodLabel = usePeriodLabel();

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Manage, support and grow our society" actions={<PeriodFilter />} />
      {isError ? <ErrorState onRetry={() => refetch()} /> : null}
      {isLoading ? <StatCardsSkeleton count={8} /> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} value={data.totalMembers} label="Total Members" tone="red" href="/members?status=active&signup=completed" />
            <StatCard icon={Crown} value={data.executives} label="Executive Members" tone="amber" href="/executives?tab=permissions" />
            <StatCard icon={CalendarDays} value={data.activeEvents} label="Active Events" tone="blue" href="/events?status=posted" />
            <StatCard icon={FileText} value={data.totalNotices} label="Total Notices" tone="red" href="/notices?status=published" />
            <StatCard icon={HandCoins} value={formatINR(data.totalDonations)} label="Total Donations" trend={data.donationTrend} tone="green" href={withRange('/donations', { status: 'success' }, range)} />
            <StatCard icon={ReceiptText} value={formatINR(data.totalExpenses)} label="Total Expenses" trend={data.expenseTrend} trendGoodWhenUp={false} tone="red" href={withRange('/expenses', { status: 'verified' }, range)} />
            <StatCard icon={Wallet} value={formatINR(data.balance)} label="Current Balance" tone="blue" href={withRange('/reports', {}, range)} />
            <StatCard icon={Clock} value={data.pendingApprovals} label="Pending Approvals" tone="orange" onClick={() => setShowPending(true)} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <Card
              title="Donation vs Expense Overview"
              className="min-w-0 lg:col-span-3"
              action={<span className="rounded-full bg-[#FDECEC] px-3 py-1 text-xs font-semibold text-maroon">{periodLabel}</span>}
            >
              <IncomeExpenseChart data={data.monthly} />
            </Card>
            <Card title="Recent Activities" className="lg:col-span-2">
              {data.activities.length ? (
                <ul className="divide-y divide-border">
                  {data.activities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                  ))}
                </ul>
              ) : (
                <EmptyState message="No activity yet." />
              )}
            </Card>
          </div>
          <PendingDialog
            open={showPending}
            onOpenChange={setShowPending}
            counts={{ donations: data.pendingDonations, expenses: data.pendingExpenses, requests: data.pendingRequests, media: data.pendingMedia }}
          />
        </>
      ) : null}
    </>
  );
}
