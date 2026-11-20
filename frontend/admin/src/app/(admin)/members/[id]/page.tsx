'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Loader2, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { Avatar, Card, ConfirmDialog, DetailList, EmptyState, ErrorState, ExportButton, PageHeader, StatusBadge } from '@/components/common';
import { MemberForm } from '@/components/forms/MemberForm';
import { Button, Skeleton } from '@/components/ui/primitives';
import { useDeleteMember, useMemberDetails, useMemberStatus } from '@/hooks/useAdminMembers';
import { exportTable, type ExportFormat } from '@/lib/exporters';
import { cn, formatDate, formatDateTime, formatINR, formatNumber, fromUtc, recordNo } from '@/lib/utils';
import { memberMobile, memberName, ROLE_LABEL, signupLabel, statusLabel } from '@/services/adminMembers';
import { donationsApi, donationStatusLabel, methodLabel } from '@/services/finance';
import type { MemberDonation } from '@/types';

const yearsSince = (date: string) => Math.max(0, new Date().getFullYear() - Number(date.slice(0, 4)));
const DONATION_STATUS: Record<string, string> = { success: 'Verified', pending: 'Pending', failed: 'Rejected', cancelled: 'Rejected' };
const METHOD: Record<string, string> = { upi_app: 'UPI app', upi_qr: 'UPI QR', cash: 'Cash', gateway: 'Online' };

function RecentDonations({ rows }: { rows: MemberDonation[] }) {
  if (!rows.length) return <EmptyState message="No donations yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="py-2 pr-3">Receipt No</th>
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3">Purpose</th>
            <th className="py-2 pr-3">Mode</th>
            <th className="py-2 pr-3 text-right">Amount</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="border-t border-border">
              <td className="py-2 pr-3">{recordNo('DON', d.id)}</td>
              <td className="whitespace-nowrap py-2 pr-3">{formatDate(fromUtc(d.confirmed_at ?? d.created_at))}</td>
              <td className="py-2 pr-3">{d.purpose ?? '—'}</td>
              <td className="py-2 pr-3">{METHOD[d.method] ?? d.method}</td>
              <td className="py-2 pr-3 text-right font-medium">{formatINR(d.amount)}</td>
              <td className="py-2">
                <StatusBadge status={DONATION_STATUS[d.status] ?? d.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Same shape as the page, so nothing jumps when the data arrives */
function MemberDetailsSkeleton() {
  const card = 'rounded-xl border border-border bg-white p-4';
  const lines = (n: number) =>
    Array.from({ length: n }, (_, i) => (
      <div key={i} className="space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-32" />
      </div>
    ));
  return (
    <div role="status" aria-label="Loading member">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-1 h-7 w-48" />
      <Skeleton className="mb-5 h-4 w-64" />
      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <div className="space-y-4">
          <div className={`${card} flex flex-col items-center gap-2 p-5`}>
            <Skeleton className="h-[104px] w-[104px] rounded-full" />
            <Skeleton className="mt-2 h-4 w-32" />
            <Skeleton className="h-3 w-16" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
          </div>
          <div className={`${card} space-y-3`}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`${card} space-y-4`}>
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-2 gap-4">{lines(4)}</div>
            </div>
            <div className={`${card} space-y-4`}>
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-2 gap-4">{lines(5)}</div>
            </div>
          </div>
          <div className={`${card} space-y-3`}>
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MemberDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useMemberDetails(id);
  const setStatus = useMemberStatus();
  const remove = useDeleteMember();
  const [editing, setEditing] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isError) return <ErrorState message={error?.message || 'Member not found or could not be loaded.'} onRetry={() => refetch()} />;
  if (isLoading || !data) return <MemberDetailsSkeleton />;

  const { member, donations } = data;
  const name = memberName(member);
  const isSuperAdmin = member.role === 'super_admin';
  const active = member.status === 'active';

  /** The member's whole payment history (every donation, any status), read page by page */
  const exportPayments = async (format: ExportFormat) => {
    const rows = await donationsApi.listAll({ donor_user_id: member.id });
    await exportTable(
      {
        title: `Payment History - ${name}`,
        subtitle: `${member.member_code ?? ''} · ${rows.length} entries · Verified total ${formatINR(donations.confirmed_total)}`,
        columns: ['Receipt No', 'Date', 'Purpose', 'Mode', 'Reference', 'Amount', 'Status'],
        rows: rows.map((d) => [recordNo('DON', d.id), formatDate(d.donated_on), d.purpose ?? '', methodLabel(d.method), d.reference_no ?? '', formatNumber(d.amount), donationStatusLabel(d.status)]),
      },
      `payment-history-${member.member_code ?? member.id}`,
      format,
    );
  };

  return (
    <>
      <Link href="/members" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-maroon">
        <ArrowLeft className="h-4 w-4" /> All members
      </Link>
      <PageHeader
        title="Member Details"
        subtitle="View and update member information"
        actions={
          isSuperAdmin ? null : (
            <Button variant="outline" className="border-maroon text-maroon" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )
        }
      />

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-white p-5 text-center">
            <Avatar name={name} src={member.photo_url} size={104} className="mx-auto" />
            <div className="mt-3 font-bold">{name}</div>
            <div className="text-xs text-muted-foreground">{member.member_code ?? 'No member code'}</div>
            <div className="mt-3 flex flex-wrap justify-center gap-1">
              <StatusBadge status={ROLE_LABEL[member.role]} />
              <StatusBadge status={statusLabel(member)} />
              {member.signup !== 'completed' ? <StatusBadge status={signupLabel(member)} /> : null}
            </div>
          </div>

          <Card title="Account">
            {isSuperAdmin ? (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-maroon" /> The Super Admin can&apos;t be edited, deactivated or deleted here.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span className={cn('h-2.5 w-2.5 rounded-full', active ? 'bg-[#1E8E4E]' : 'bg-[#C62828]')} />
                  {active ? 'Active: can use the app' : 'Inactive: logged out, can\'t log in'}
                </div>
                <Button
                  variant="outline"
                  className={cn('w-full', active ? 'border-[#C62828] text-[#C62828]' : 'border-[#1E8E4E] text-[#1E8E4E]')}
                  onClick={() => (active ? setConfirmStatus(true) : setStatus.mutate({ id: member.id, status: 'active' }))}
                  disabled={setStatus.isPending || remove.isPending}
                >
                  {setStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {setStatus.isPending ? 'Saving…' : active ? 'Deactivate Member' : 'Activate Member'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-[#C62828]"
                  onClick={() => setConfirmDelete(true)}
                  disabled={setStatus.isPending || remove.isPending}
                >
                  {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {remove.isPending ? 'Deleting…' : 'Delete Member'}
                </Button>
              </div>
            )}
          </Card>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Personal Information">
              <DetailList
                items={[
                  ['Full Name', name],
                  ['Mobile Number', memberMobile(member)],
                  [
                    'Email Address',
                    <span key="e" className="inline-flex items-center gap-1">
                      {member.email}
                      {member.is_verified ? <BadgeCheck className="h-4 w-4 text-[#1E8E4E]" aria-label="Verified" /> : null}
                    </span>,
                  ],
                  ['Residential Address', member.address || '—'],
                ]}
              />
            </Card>
            <Card title="Membership">
              <DetailList
                items={[
                  ['Member Code', member.member_code ?? '—'],
                  ['Role', ROLE_LABEL[member.role]],
                  ['Member Since', `${formatDate(member.joined_on)} (${yearsSince(member.joined_on)} years)`],
                  ['Sign-up', signupLabel(member)],
                  ['Last Login', formatDateTime(member.last_login_at)],
                ]}
              />
            </Card>
          </div>

          <Card
            title="Payment History"
            action={
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm">
                  Verified total <span className="font-bold text-maroon">{formatINR(donations.confirmed_total)}</span> from{' '}
                  {donations.confirmed_count} {donations.confirmed_count === 1 ? 'donation' : 'donations'}
                </span>
                <ExportButton onExport={exportPayments} disabled={!donations.recent.length} />
              </div>
            }
          >
            <p className="mb-2 text-xs text-muted-foreground">Latest donations (Export downloads the full history)</p>
            <RecentDonations rows={donations.recent} />
          </Card>
        </div>
      </div>

      <MemberForm open={editing} onOpenChange={setEditing} member={member} />
      <ConfirmDialog
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={`Deactivate ${name}?`}
        description="They are logged out of the app at once and can't log in until you activate them again."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => setStatus.mutate({ id: member.id, status: 'suspended' })}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${name}?`}
        description="The member is removed from the society list and logged out. Their donations stay in the records."
        confirmLabel="Delete"
        destructive
        onConfirm={() => remove.mutate(member.id, { onSuccess: () => router.replace('/members') })}
      />
    </>
  );
}
