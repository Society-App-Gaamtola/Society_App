'use client';

import { useEffect, useState } from 'react';
import { Field, FormDialog } from '@/components/common';
import { Input, NativeSelect, Textarea } from '@/components/ui/primitives';
import { useAddMember } from '@/hooks/useAdminMembers';
import type { NewMember } from '@/services/adminMembers';

type Draft = Required<NewMember>;

const EMPTY: Draft = { username: '', email: '', country_code: '+91', mobile_number: '', password: '', address: '', member_code: '', role: 'member' };
/** Same rule as the backend (PASSWORD_MIN_LENGTH) */
const PASSWORD_MIN = 6;

function validate(d: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (d.username.trim().length < 2) errors.username = 'Name is required.';
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) errors.email = 'Enter a valid email.';
  if (!/^\+\d{1,4}$/.test(d.country_code.trim())) errors.country_code = 'Like +91';
  if (!/^\d{7,15}$/.test(d.mobile_number.trim())) errors.mobile_number = 'Enter a valid mobile number.';
  if (d.password.length < PASSWORD_MIN) errors.password = `At least ${PASSWORD_MIN} characters.`;
  return errors;
}

/**
 * Add a member by hand (POST /admin/members), for people who don't sign up in the app. Their sign-up is complete:
 * they log in to the app with this email or mobile and the password given here (and can change it in Settings).
 */
export function AddMemberForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const add = useAddMember();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});

  useEffect(() => {
    if (open) {
      setDraft(EMPTY);
      setErrors({});
    }
  }, [open]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    const member: NewMember = {
      username: draft.username.trim(),
      email: draft.email.trim().toLowerCase(),
      country_code: draft.country_code.trim(),
      mobile_number: draft.mobile_number.trim(),
      password: draft.password,
      address: draft.address.trim(),
      member_code: draft.member_code.trim(),
      role: draft.role,
    };
    add.mutate(member, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Member"
      description="For members who don't sign up in the app. They log in with this email or mobile and password."
      submitLabel="Add Member"
      pending={add.isPending}
      onSubmit={submit}
      className="max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full Name" error={errors.username}>
          <Input value={draft.username} onChange={(e) => set('username', e.target.value)} autoFocus />
        </Field>
        <Field label="Email Address" error={errors.email}>
          <Input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Mobile Number" error={errors.country_code || errors.mobile_number}>
          <div className="flex gap-2">
            <Input className="w-20" value={draft.country_code} onChange={(e) => set('country_code', e.target.value)} aria-label="Country code" />
            <Input
              className="flex-1"
              value={draft.mobile_number}
              onChange={(e) => set('mobile_number', e.target.value.replace(/\D/g, ''))}
              inputMode="tel"
              aria-label="Mobile number"
            />
          </div>
        </Field>
        <Field label="Password" error={errors.password}>
          <Input type="text" value={draft.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" placeholder="Give this to the member" />
        </Field>
        <Field label="Member Code (optional)">
          <Input value={draft.member_code} onChange={(e) => set('member_code', e.target.value)} placeholder="Empty = next code (GM…)" />
        </Field>
        <Field label="Role">
          <NativeSelect value={draft.role} onChange={(e) => set('role', e.target.value as Draft['role'])}>
            <option value="member">Member</option>
            <option value="executive">Executive</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Residential Address (optional)">
        <Textarea value={draft.address} onChange={(e) => set('address', e.target.value)} rows={2} />
      </Field>
    </FormDialog>
  );
}
