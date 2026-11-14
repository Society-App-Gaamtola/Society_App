'use client';

import { useEffect, useState } from 'react';
import { Field, FileUpload, FormDialog } from '@/components/common';
import { Input, NativeSelect, Textarea } from '@/components/ui/primitives';
import { membersHooks, useCreateMember } from '@/hooks/useMembers';
import { todayISO } from '@/lib/utils';
import type { Member } from '@/types';

type Draft = Pick<Member, 'name' | 'mobile' | 'email' | 'type' | 'status' | 'address' | 'joinedOn'> & {
  gender: NonNullable<Member['gender']>;
  dob: string;
  photo: string | null;
};

const EMPTY: Draft = {
  name: '',
  mobile: '+91 ',
  email: '',
  type: 'Normal',
  status: 'Active',
  address: '',
  joinedOn: todayISO(),
  gender: 'Male',
  dob: '',
  photo: null,
};

function validate(d: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.name.trim()) errors.name = 'Name is required.';
  if (d.mobile.replace(/\D/g, '').length < 10) errors.mobile = 'Enter a valid mobile number.';
  if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) errors.email = 'Enter a valid email.';
  return errors;
}

/** Add a member, or edit one when `member` is given. */
export function MemberForm({ open, onOpenChange, member }: { open: boolean; onOpenChange: (open: boolean) => void; member?: Member }) {
  const create = useCreateMember();
  const update = membersHooks.useUpdate();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDraft(
      member
        ? { ...EMPTY, ...member, gender: member.gender ?? 'Male', dob: member.dob ?? '', photo: member.photo ?? null }
        : { ...EMPTY, joinedOn: todayISO() },
    );
  }, [open, member]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { ...draft, name: draft.name.trim(), email: draft.email.trim() };
    const done = { onSuccess: () => onOpenChange(false) };
    if (member) update.mutate({ id: member.id, changes: body }, done);
    else create.mutate({ ...body, notes: '' }, done);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={member ? `Edit ${member.name}` : 'Add Member'}
      description={member ? `Member ID ${member.memberId}` : 'A member ID is given automatically.'}
      submitLabel={member ? 'Save Changes' : 'Add Member'}
      pending={create.isPending || update.isPending}
      onSubmit={submit}
      className="max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full Name" error={errors.name}>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </Field>
        <Field label="Mobile Number" error={errors.mobile}>
          <Input value={draft.mobile} onChange={(e) => set('mobile', e.target.value)} inputMode="tel" />
        </Field>
        <Field label="Email Address" error={errors.email}>
          <Input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Date of Birth">
          <Input type="date" value={draft.dob} onChange={(e) => set('dob', e.target.value)} max={todayISO()} />
        </Field>
        <Field label="Gender">
          <NativeSelect value={draft.gender} onChange={(e) => set('gender', e.target.value as Draft['gender'])}>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </NativeSelect>
        </Field>
        <Field label="Join Date">
          <Input type="date" value={draft.joinedOn} onChange={(e) => set('joinedOn', e.target.value)} />
        </Field>
        <Field label="Member Type">
          <NativeSelect value={draft.type} onChange={(e) => set('type', e.target.value as Draft['type'])}>
            <option value="Normal">Normal</option>
            <option value="Executive">Executive</option>
          </NativeSelect>
        </Field>
        <Field label="Status">
          <NativeSelect value={draft.status} onChange={(e) => set('status', e.target.value as Draft['status'])}>
            <option>Active</option>
            <option>Inactive</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Residential Address">
        <Textarea value={draft.address} onChange={(e) => set('address', e.target.value)} rows={2} />
      </Field>
      <Field label="Profile Photo">
        <FileUpload value={draft.photo} onChange={(url) => set('photo', url)} accept="image/*" label="Upload photo" />
      </Field>
    </FormDialog>
  );
}
