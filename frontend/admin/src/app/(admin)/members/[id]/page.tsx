'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Camera, ImageIcon, Loader2, Pencil, PlayCircle } from 'lucide-react';
import { Avatar, Card, ConfirmDialog, DetailList, EmptyState, ErrorState, FileUpload, PageHeader, StatusBadge } from '@/components/common';
import { MemberForm } from '@/components/forms/MemberForm';
import { Button, Skeleton, Textarea } from '@/components/ui/primitives';
import { donationsHooks } from '@/hooks/useDonations';
import { assignmentsHooks, dutiesHooks, membersHooks } from '@/hooks/useMembers';
import { mediaHooks } from '@/hooks/useMedia';
import { permissionsHooks } from '@/hooks/useExecutives';
import { cn, formatDate, formatINR, recordNo } from '@/lib/utils';
import { PERMISSION_KEYS, type Member } from '@/types';

const SECTIONS = [
  { value: 'personal', label: 'Personal Information' },
  { value: 'membership', label: 'Membership Details' },
  { value: 'donations', label: 'Donation History' },
  { value: 'media', label: 'Uploaded Media' },
  { value: 'activity', label: 'Activity Participation' },
  { value: 'notes', label: 'Notes' },
] as const;
type Section = (typeof SECTIONS)[number]['value'];

const PERMISSION_LABELS: Record<string, string> = {
  events: 'Event Management',
  notices: 'Notice Management',
  donations: 'Donation Management',
  expenses: 'Expense Management',
  reports: 'Financial Reports',
  media: 'Media Approval',
  settings: 'App Settings',
};

const yearsSince = (date: string) => Math.max(0, new Date().getFullYear() - Number(date.slice(0, 4)));

function DonationHistory({ member }: { member: Member }) {
  const { data, isLoading } = donationsHooks.useList({ filters: { memberId: member.memberId }, sort: { field: 'date', order: 'desc' } });
  if (isLoading) return <Skeleton className="h-40" />;
  if (!data?.data.length) return <EmptyState message="No donations yet." />;
  const total = data.data.filter((d) => d.status === 'Verified').reduce((sum, d) => sum + d.amount, 0);
  return (
    <>
      <p className="mb-3 text-sm">
        Verified total: <span className="font-bold text-maroon">{formatINR(total)}</span> from {data.total} donations
      </p>
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
            {data.data.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="py-2 pr-3">{recordNo('DON', d.id)}</td>
                <td className="whitespace-nowrap py-2 pr-3">{formatDate(d.date)}</td>
                <td className="py-2 pr-3">{d.purpose}</td>
                <td className="py-2 pr-3">{d.mode}</td>
                <td className="py-2 pr-3 text-right font-medium">{formatINR(d.amount)}</td>
                <td className="py-2">
                  <StatusBadge status={d.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UploadedMedia({ member }: { member: Member }) {
  const { data, isLoading } = mediaHooks.useList({ filters: { uploadedBy: member.memberId }, sort: { field: 'uploadedOn', order: 'desc' } });
  if (isLoading) return <Skeleton className="h-40" />;
  if (!data?.data.length) return <EmptyState message="No photos or videos uploaded." />;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {data.data.map((m) => (
        <li key={m.id} className="overflow-hidden rounded-lg border border-border">
          <div className="flex aspect-video items-center justify-center bg-[#F5EEE4] text-maroon">
            {m.url && m.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.title} className="h-full w-full object-cover" />
            ) : m.type === 'video' ? (
              <PlayCircle className="h-8 w-8" />
            ) : (
              <ImageIcon className="h-8 w-8" />
            )}
          </div>
          <div className="space-y-1 p-2 text-xs">
            <div className="truncate font-medium">{m.title}</div>
            <div className="flex items-center justify-between text-muted-foreground">
              {formatDate(m.uploadedOn)} <StatusBadge status={m.status} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ActivityParticipation({ member }: { member: Member }) {
  const assignments = assignmentsHooks.useList({ filters: { memberId: member.memberId } });
  const duties = dutiesHooks.useList({});
  if (assignments.isLoading || duties.isLoading) return <Skeleton className="h-32" />;
  if (!assignments.data?.data.length) return <EmptyState message="Not assigned to any volunteer duty yet." />;
  return (
    <ul className="divide-y divide-border">
      {assignments.data.data.map((a) => {
        const duty = duties.data?.data.find((d) => String(d.id) === String(a.dutyId));
        return (
          <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div>
              <div className="font-medium">{duty?.title ?? 'Volunteer duty'}</div>
              <div className="text-xs text-muted-foreground">
                {formatDate(duty?.date ?? a.date)} {duty ? `· ${duty.time} · ${duty.venue}` : ''}
              </div>
            </div>
            <StatusBadge status={a.status} />
          </li>
        );
      })}
    </ul>
  );
}

function Notes({ member }: { member: Member }) {
  const update = membersHooks.useUpdate();
  const [notes, setNotes] = useState(member.notes ?? '');
  useEffect(() => setNotes(member.notes ?? ''), [member.notes]);
  return (
    <div className="space-y-3">
      <Textarea rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes about this member, only visible to admins." />
      <div className="flex justify-end">
        <Button disabled={notes === (member.notes ?? '') || update.isPending} onClick={() => update.mutate({ id: member.id, changes: { notes } })}>
          Save Notes
        </Button>
      </div>
    </div>
  );
}

function AccessCard({ member }: { member: Member }) {
  const { data } = permissionsHooks.useList({ filters: { memberId: member.memberId } });
  const permission = data?.data[0];
  return (
    <Card
      title="Access & Permissions"
      action={
        member.type === 'Executive' ? (
          <Link href="/executives?tab=permissions" className="rounded-md border border-maroon px-2 py-0.5 text-xs font-semibold text-maroon hover:bg-accent">
            Manage
          </Link>
        ) : null
      }
    >
      {member.type !== 'Executive' ? (
        <p className="text-sm text-muted-foreground">Normal member. No admin access.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {PERMISSION_KEYS.map((key) => (
            <li key={key} className="flex items-center justify-between gap-2">
              {PERMISSION_LABELS[key]}
              <StatusBadge status={permission?.[key] ? 'Allowed' : 'Not Allowed'} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function MemberDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: member, isLoading, isError, refetch } = membersHooks.useOne(id);
  const update = membersHooks.useUpdate();
  const [section, setSection] = useState<Section>('personal');
  const [editing, setEditing] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);

  if (isError) return <ErrorState message="Member not found or could not be loaded." onRetry={() => refetch()} />;
  if (isLoading || !member) return <Skeleton className="h-96" />;

  const setPhoto = (photo: string | null) => update.mutate({ id: member.id, changes: { photo } });
  const nextStatus = member.status === 'Active' ? 'Inactive' : 'Active';

  return (
    <>
      <Link href="/members" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-maroon">
        <ArrowLeft className="h-4 w-4" /> All members
      </Link>
      <PageHeader title="Member Details" subtitle="View and update member information" />
      <div className="grid gap-4 xl:grid-cols-[220px_1fr_280px]">
        <aside className="rounded-xl border border-border bg-white p-4">
          <div className="relative mx-auto mb-3 w-fit">
            <Avatar name={member.name} src={member.photo} size={120} />
            <FileUpload value={member.photo} onChange={setPhoto} accept="image/*">
              {(open, uploading) => (
                <button
                  type="button"
                  onClick={open}
                  aria-label="Change photo"
                  className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-maroon text-white ring-2 ring-white"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
              )}
            </FileUpload>
          </div>
          <div className="mb-4 text-center">
            <div className="font-bold">{member.name}</div>
            <div className="text-xs text-muted-foreground">{member.memberId}</div>
          </div>
          <nav aria-label="Member sections" className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSection(s.value)}
                aria-current={section === s.value ? 'true' : undefined}
                className={cn(
                  'block w-full rounded-lg px-3 py-2 text-left text-sm',
                  section === s.value ? 'bg-maroon font-semibold text-white' : 'text-foreground hover:bg-accent',
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <Card
          title={SECTIONS.find((s) => s.value === section)?.label}
          action={
            section === 'personal' || section === 'membership' ? (
              <Button variant="outline" size="sm" className="border-maroon text-maroon" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            ) : null
          }
        >
          {section === 'personal' ? (
            <DetailList
              items={[
                ['Full Name', member.name],
                ['Mobile Number', member.mobile],
                ['Email Address', member.email],
                ['Date of Birth', formatDate(member.dob)],
                ['Gender', member.gender],
                ['Residential Address', member.address],
              ]}
            />
          ) : null}
          {section === 'membership' ? (
            <DetailList
              items={[
                ['Member ID', member.memberId],
                ['Member Type', <StatusBadge key="t" status={member.type} />],
                ['Membership Since', formatDate(member.joinedOn)],
                ['Years with Society', `${yearsSince(member.joinedOn)} years`],
                ['Account Status', <StatusBadge key="s" status={member.status} />],
                ['Last Updated', formatDate(member.updated_at)],
              ]}
            />
          ) : null}
          {section === 'donations' ? <DonationHistory member={member} /> : null}
          {section === 'media' ? <UploadedMedia member={member} /> : null}
          {section === 'activity' ? <ActivityParticipation member={member} /> : null}
          {section === 'notes' ? <Notes member={member} /> : null}
        </Card>

        <div className="space-y-4">
          <Card title="Profile Photo">
            <div className="flex flex-col items-center gap-3">
              <Avatar name={member.name} src={member.photo} size={88} />
              <FileUpload value={member.photo} onChange={setPhoto} accept="image/*">
                {(open, uploading) => (
                  <Button variant="outline" size="sm" className="border-maroon text-maroon" onClick={open} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Change Photo
                  </Button>
                )}
              </FileUpload>
            </div>
          </Card>
          <Card title="Account Status">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className={cn('h-2.5 w-2.5 rounded-full', member.status === 'Active' ? 'bg-[#1E8E4E]' : 'bg-[#C62828]')} />
              {member.status}
            </div>
            <Button
              variant="outline"
              className={cn('w-full', member.status === 'Active' ? 'border-[#C62828] text-[#C62828]' : 'border-[#1E8E4E] text-[#1E8E4E]')}
              onClick={() => setConfirmStatus(true)}
            >
              {member.status === 'Active' ? 'Deactivate Member' : 'Activate Member'}
            </Button>
          </Card>
          <AccessCard member={member} />
        </div>
      </div>

      <MemberForm open={editing} onOpenChange={setEditing} member={member} />
      <ConfirmDialog
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={`${nextStatus === 'Inactive' ? 'Deactivate' : 'Activate'} ${member.name}?`}
        description={nextStatus === 'Inactive' ? 'The member will be marked inactive.' : 'The member will be marked active again.'}
        confirmLabel={nextStatus === 'Inactive' ? 'Deactivate' : 'Activate'}
        destructive={nextStatus === 'Inactive'}
        onConfirm={() => update.mutate({ id: member.id, changes: { status: nextStatus } })}
      />
    </>
  );
}
