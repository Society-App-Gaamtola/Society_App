'use client';

import { useEffect, useState } from 'react';
import { Field, FormDialog } from '@/components/common';
import { Input } from '@/components/ui/primitives';
import { useChangePassword } from '@/hooks/useAccount';

/** The backend's PASSWORD_MIN_LENGTH (checked again by the API) */
const PASSWORD_MIN_LENGTH = 6;

type Draft = { old_password: string; new_password: string; confirm_password: string };
const EMPTY: Draft = { old_password: '', new_password: '', confirm_password: '' };

function validate(d: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.old_password) errors.old_password = 'Enter your current password.';
  if (d.new_password.length < PASSWORD_MIN_LENGTH) errors.new_password = `At least ${PASSWORD_MIN_LENGTH} characters.`;
  else if (d.new_password === d.old_password) errors.new_password = 'Must be different from the current password.';
  if (d.confirm_password !== d.new_password) errors.confirm_password = 'Does not match the new password.';
  return errors;
}

/** PUT /auth/change-password. Other devices are logged out; this browser stays logged in */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const change = useChangePassword();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});

  useEffect(() => {
    if (open) {
      setDraft(EMPTY);
      setErrors({});
    }
  }, [open]);

  const set = (key: keyof Draft, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    change.mutate(draft, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change Password"
      description="Your other devices will be logged out. This browser stays logged in."
      submitLabel="Change Password"
      pending={change.isPending}
      onSubmit={submit}
      className="max-w-md"
    >
      <Field label="Current Password" error={errors.old_password}>
        <Input type="password" autoComplete="current-password" value={draft.old_password} onChange={(e) => set('old_password', e.target.value)} autoFocus />
      </Field>
      <Field label="New Password" error={errors.new_password}>
        <Input type="password" autoComplete="new-password" value={draft.new_password} onChange={(e) => set('new_password', e.target.value)} />
      </Field>
      <Field label="Confirm New Password" error={errors.confirm_password}>
        <Input type="password" autoComplete="new-password" value={draft.confirm_password} onChange={(e) => set('confirm_password', e.target.value)} />
      </Field>
    </FormDialog>
  );
}
