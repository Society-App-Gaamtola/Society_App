'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, KeyRound, Loader2, LogOut, MailCheck } from 'lucide-react';
import { Avatar, Card, DetailList, ErrorState, Field, PageHeader, StatusBadge } from '@/components/common';
import { ChangePasswordDialog } from '@/components/forms/ChangePasswordDialog';
import { Button, Input, Skeleton, Textarea } from '@/components/ui/primitives';
import { useEditProfile, useMyProfile, useVerifyEmail } from '@/hooks/useAccount';
import { useLogout } from '@/hooks/useLogout';
import { formatDate } from '@/lib/utils';
import type { MyProfile, ProfileChanges } from '@/services/account';

type Draft = { username: string; email: string; address: string };
const toDraft = (p: MyProfile): Draft => ({ username: p.username ?? '', email: p.email, address: p.address ?? '' });

function validate(d: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (d.username.trim().length < 2) errors.username = 'Name is required.';
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) errors.email = 'Enter a valid email.';
  return errors;
}

/** Only what changed is sent to PUT /auth/edit-profile */
function changesOf(before: Draft, after: Draft): ProfileChanges {
  const changes: ProfileChanges = {};
  if (after.username.trim() !== before.username) changes.username = after.username.trim();
  if (after.address.trim() !== before.address) changes.address = after.address.trim();
  if (after.email.trim().toLowerCase() !== before.email) changes.email = after.email.trim().toLowerCase();
  return changes;
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile" className="grid gap-4 xl:grid-cols-[280px_1fr]">
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="mt-2 h-4 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="space-y-3 rounded-xl border border-border bg-white p-4">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-16" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: profile, isLoading, isError, error, refetch } = useMyProfile();
  const edit = useEditProfile();
  const verify = useVerifyEmail();
  const logout = useLogout();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  // A new email waiting for its OTP (sent by edit-profile)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (profile) setDraft(toDraft(profile));
  }, [profile]);

  if (isError) return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  if (isLoading || !profile || !draft) {
    return (
      <>
        <PageHeader title="My Profile" subtitle="Your Super Admin account" />
        <ProfileSkeleton />
      </>
    );
  }

  const before = toDraft(profile);
  const changes = changesOf(before, draft);
  const dirty = Object.keys(changes).length > 0;
  const set = (key: keyof Draft, value: string) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = () => {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length || !dirty) return;
    edit.mutate(changes, {
      onSuccess: (result) => {
        if (result.data.new_email) {
          setPendingEmail(result.data.new_email);
          setOtp('');
        }
      },
    });
  };

  const confirmEmail = () => {
    if (!pendingEmail || otp.length !== 6) return;
    verify.mutate({ email: pendingEmail, otp }, { onSuccess: () => setPendingEmail(null) });
  };

  const name = profile.username || profile.email;

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your Super Admin account" />
      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-white p-6 text-center">
            <Avatar name={name} src={profile.profile_image} size={96} className="mx-auto" />
            <div className="mt-3 font-bold">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{profile.email}</div>
            <div className="mt-3">
              <StatusBadge status="Super Admin" />
            </div>
          </div>
          <Card title="Security">
            <div className="space-y-2">
              <Button variant="outline" className="w-full border-maroon text-maroon" onClick={() => setChangingPassword(true)}>
                <KeyRound className="h-4 w-4" /> Change Password
              </Button>
              <Button variant="ghost" className="w-full text-[#C62828]" onClick={logout.run} disabled={logout.busy}>
                {logout.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Log out
              </Button>
            </div>
          </Card>
        </aside>

        <div className="min-w-0 space-y-4">
          <Card title="Profile Details">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full Name" error={errors.username}>
                <Input value={draft.username} onChange={(e) => set('username', e.target.value)} />
              </Field>
              <Field label="Email Address" error={errors.email}>
                <Input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} disabled={!!pendingEmail} />
              </Field>
              <Field label="Mobile Number">
                <Input value={`${profile.country_code} ${profile.mobile_number}`} disabled aria-describedby="mobile-note" />
                <span id="mobile-note" className="mt-1 block text-xs text-muted-foreground">
                  The mobile number can&apos;t be changed.
                </span>
              </Field>
            </div>
            <Field label="Address" className="mt-3">
              <Textarea rows={2} value={draft.address} onChange={(e) => set('address', e.target.value)} />
            </Field>

            {pendingEmail ? (
              <div className="mt-4 rounded-lg border border-[#F5B400]/50 bg-[#FFF8E6] p-4">
                <p className="mb-3 flex items-start gap-2 text-sm">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-maroon" />
                  We sent a 6-digit code to <span className="font-semibold">{pendingEmail}</span>. Enter it to change your email.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="w-36 tracking-[0.3em]"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    aria-label="Verification code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                  <Button onClick={confirmEmail} disabled={otp.length !== 6 || verify.isPending}>
                    {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify Email
                  </Button>
                  <Button variant="ghost" onClick={() => edit.mutate({ email: pendingEmail })} disabled={edit.isPending}>
                    Resend code
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => {
                      setPendingEmail(null);
                      set('email', profile.email);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDraft(before)} disabled={!dirty || edit.isPending}>
                Discard
              </Button>
              <Button onClick={save} disabled={!dirty || edit.isPending || !!pendingEmail}>
                {edit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
              </Button>
            </div>
          </Card>

          <Card title="Account">
            <DetailList
              items={[
                ['Role', 'Super Admin'],
                [
                  'Email',
                  <span key="e" className="inline-flex items-center gap-1">
                    {profile.email}
                    {profile.is_verified ? <BadgeCheck className="h-4 w-4 text-[#1E8E4E]" aria-label="Verified" /> : null}
                  </span>,
                ],
                ['Account Since', formatDate(profile.created_at)],
              ]}
            />
          </Card>
        </div>
      </div>

      <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
    </>
  );
}
