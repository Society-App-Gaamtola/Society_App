'use client';

import { useEffect, useState } from 'react';
import { Field, FormDialog } from '@/components/common';
import { Input, NativeSelect, Textarea } from '@/components/ui/primitives';
import { useEditMember } from '@/hooks/useAdminMembers';
import { memberName, type MemberChanges } from '@/services/adminMembers';
import type { AdminMember } from '@/types';

type Draft = { name: string; email: string; country_code: string; mobile: string; member_code: string; address: string; role: 'member' | 'executive' };

const toDraft = (m: AdminMember): Draft => ({
  name: m.name ?? '',
  email: m.email,
  country_code: m.country_code,
  mobile: m.mobile,
  member_code: m.member_code ?? '',
  address: m.address ?? '',
  role: m.role === 'executive' ? 'executive' : 'member',
});

function validate(d: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (d.name.trim().length < 2) errors.name = 'Name is required.';
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) errors.email = 'Enter a valid email.';
  if (!/^\+\d{1,4}$/.test(d.country_code.trim())) errors.country_code = 'Like +91';
  if (!/^\d{7,15}$/.test(d.mobile.trim())) errors.mobile = 'Enter a valid mobile number.';
  return errors;
}

/** Only the fields that changed are sent (PUT /admin/members/:id); a role change goes to its own API */
function changesOf(before: Draft, after: Draft): MemberChanges {
  const changes: MemberChanges = {};
  if (after.name.trim() !== before.name) changes.username = after.name.trim();
  if (after.email.trim().toLowerCase() !== before.email) changes.email = after.email.trim().toLowerCase();
  if (after.mobile.trim() !== before.mobile || after.country_code.trim() !== before.country_code) {
    changes.country_code = after.country_code.trim();
    changes.mobile_number = after.mobile.trim();
  }
  if (after.member_code.trim() !== before.member_code) changes.member_code = after.member_code.trim();
  if (after.address.trim() !== before.address) changes.address = after.address.trim();
  return changes;
}

/** Edit a member's details (members join through the app, so there is no "add" here) */
export function MemberForm({ open, onOpenChange, member }: { open: boolean; onOpenChange: (open: boolean) => void; member?: AdminMember }) {
  const edit = useEditMember();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});

  useEffect(() => {
    if (open && member) {
      setDraft(toDraft(member));
      setErrors({});
    }
  }, [open, member]);

  if (!member || !draft) return null;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const submit = () => {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    const before = toDraft(member);
    const role = draft.role !== before.role ? draft.role : undefined;
    edit.mutate({ id: member.id, changes: changesOf(before, draft), role }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${memberName(member)}`}
      description={member.member_code ? `Member code ${member.member_code}` : 'No member code yet'}
      submitLabel="Save Changes"
      pending={edit.isPending}
      onSubmit={submit}
      className="max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full Name" error={errors.name}>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </Field>
        <Field label="Email Address" error={errors.email}>
          <Input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Mobile Number" error={errors.country_code || errors.mobile}>
          <div className="flex gap-2">
            <Input className="w-20" value={draft.country_code} onChange={(e) => set('country_code', e.target.value)} aria-label="Country code" />
            <Input className="flex-1" value={draft.mobile} onChange={(e) => set('mobile', e.target.value.replace(/\D/g, ''))} inputMode="tel" aria-label="Mobile number" />
          </div>
        </Field>
        <Field label="Member Code">
          <Input value={draft.member_code} onChange={(e) => set('member_code', e.target.value)} placeholder="e.g. GM025" />
        </Field>
        <Field label="Role">
          <NativeSelect value={draft.role} onChange={(e) => set('role', e.target.value as Draft['role'])}>
            <option value="member">Member</option>
            <option value="executive">Executive</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Residential Address">
        <Textarea value={draft.address} onChange={(e) => set('address', e.target.value)} rows={2} />
      </Field>
    </FormDialog>
  );
}
