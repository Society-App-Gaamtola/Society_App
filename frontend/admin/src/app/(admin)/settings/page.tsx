'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import {
  Bell,
  CalendarDays,
  Database,
  HandCoins,
  Info,
  Loader2,
  Megaphone,
  Palette,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Card, ConfirmDialog, ErrorState, Field, FileUpload, PageHeader } from '@/components/common';
import { Button, Input, Skeleton, Switch, Textarea } from '@/components/ui/primitives';
import { API_URL, DATA_MODE } from '@/config';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { useUrlState } from '@/hooks/useUrlState';
import { cn } from '@/lib/utils';
import { backupService } from '@/services/backup';
import { resetMockData } from '@/services/core/adapter';
import type { AppSettings, NewRecord } from '@/types';

type Draft = NewRecord<AppSettings>;
type ListKey = 'eventCategories' | 'donationPurposes' | 'expenseCategories' | 'noticeTags';
type BoolKey = { [K in keyof Draft]: Draft[K] extends boolean ? K : never }[keyof Draft];

const SECTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'general', label: 'General Settings', icon: Settings },
  { value: 'event-categories', label: 'Event Categories', icon: CalendarDays },
  { value: 'notice-categories', label: 'Notice Categories', icon: Megaphone },
  { value: 'donation-categories', label: 'Donation Categories', icon: HandCoins },
  { value: 'expense-categories', label: 'Expense Categories', icon: ReceiptText },
  { value: 'notifications', label: 'Notification Settings', icon: Bell },
  { value: 'appearance', label: 'Appearance', icon: Palette },
  { value: 'security', label: 'Security', icon: ShieldCheck },
  { value: 'backup', label: 'Backup & Data', icon: Database },
  { value: 'about', label: 'About', icon: Info },
];

const LIST_SECTIONS: Record<string, { key: ListKey; title: string; hint: string }> = {
  'event-categories': { key: 'eventCategories', title: 'Event Categories', hint: 'Shown when creating events and in the Events filter.' },
  'notice-categories': { key: 'noticeTags', title: 'Notice Categories', hint: 'Labels for notices, e.g. Important or General.' },
  'donation-categories': { key: 'donationPurposes', title: 'Donation Categories', hint: 'Purposes members can donate for.' },
  'expense-categories': { key: 'expenseCategories', title: 'Expense Categories', hint: 'Used to group expenses and in reports.' },
};

const toDraft = ({ id: _id, created_at: _c, updated_at: _u, ...rest }: AppSettings): Draft => rest;

function ToggleRow({ draft, field, label, hint, onChange }: { draft: Draft; field: BoolKey; label: string; hint?: string; onChange: (field: BoolKey, value: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Switch label={label} checked={!!draft[field]} onCheckedChange={(v) => onChange(field, v)} />
      <span className="text-sm">
        {label}
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </div>
  );
}

function ListEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const add = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (items.some((i) => i.toLowerCase() === value.toLowerCase())) return setError(`"${value}" is already in the list.`);
    onChange([...items, value]);
    setText('');
    setError('');
  };
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-1 rounded-full border border-border bg-[#FBF5EC] py-1 pl-3 pr-1 text-sm">
            {item}
            <button type="button" onClick={() => onChange(items.filter((i) => i !== item))} className="rounded-full p-0.5 hover:bg-[#EFE4D6]" aria-label={`Remove ${item}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {!items.length ? <li className="text-sm text-muted-foreground">No categories yet.</li> : null}
      </ul>
      {/* A nested <form> is not allowed, so the add box handles Enter itself. */}
      <div className="flex max-w-md gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(e)} placeholder="New category" aria-label="New category" />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {error ? <p className="mt-1 text-xs text-[#C62828]">{error}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">Removing a category does not change existing entries that use it.</p>
    </div>
  );
}

export default function SettingsPage() {
  const url = useUrlState();
  const section = SECTIONS.some((s) => s.value === url.get('section')) ? url.get('section') : 'general';
  const { data, isLoading, isError, refetch } = useSettings();
  const save = useUpdateSettings();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (data) setDraft(toDraft(data));
  }, [data]);

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isLoading || !draft || !data) return <Skeleton className="h-96" />;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const changed = (Object.keys(draft) as (keyof Draft)[]).some((k) => JSON.stringify(draft[k]) !== JSON.stringify(data[k]));
  const emailError = draft.contactEmail && !/^\S+@\S+\.\S+$/.test(draft.contactEmail) ? 'Enter a valid email.' : '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (emailError || !draft.societyName.trim()) return;
    save.mutate(draft);
  };

  const list = LIST_SECTIONS[section];

  return (
    <>
      <PageHeader title="App Settings" subtitle="Manage application configuration and general settings" />
      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <nav aria-label="Settings sections" className="h-fit rounded-xl border border-border bg-white p-2">
          {SECTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => url.setParams({ section: value === 'general' ? undefined : value })}
              aria-current={section === value ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm',
                section === value ? 'bg-[#FDF3F3] font-semibold text-maroon' : 'hover:bg-accent',
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        <form onSubmit={submit}>
          <Card>
            {section === 'general' ? (
              <>
                <h2 className="text-lg font-bold">General Settings</h2>
                <p className="mb-4 text-sm text-muted-foreground">Manage basic application information and preferences</p>
                <div className="grid gap-4 xl:grid-cols-[1fr_200px]">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Society Name" error={draft.societyName.trim() ? '' : 'Society name is required.'}>
                      <Input value={draft.societyName} onChange={(e) => set('societyName', e.target.value)} />
                    </Field>
                    <Field label="Contact Email" error={emailError}>
                      <Input type="email" value={draft.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
                    </Field>
                    <Field label="Contact Number">
                      <Input value={draft.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" />
                    </Field>
                    <Field label="Society Address" className="md:col-span-3">
                      <Textarea rows={3} value={draft.address} onChange={(e) => set('address', e.target.value)} />
                    </Field>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">Society Logo</span>
                    <div className="flex items-center gap-3 xl:flex-col xl:items-start">
                      <span className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#F5D58A] bg-white">
                        {draft.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={draft.logo} alt="Society logo" className="h-full w-full object-cover" />
                        ) : (
                          <Image src="/logo.png" alt="Society logo" fill sizes="96px" className="object-cover" />
                        )}
                      </span>
                      <div>
                        <FileUpload value={draft.logo} onChange={(logo) => set('logo', logo)} accept="image/*" maxMb={2}>
                          {(open, uploading) => (
                            <Button type="button" size="sm" variant="outline" className="border-maroon text-maroon" onClick={open} disabled={uploading}>
                              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Change Logo
                            </Button>
                          )}
                        </FileUpload>
                        <p className="mt-1 text-xs text-muted-foreground">Recommended size: 800 × 800 px</p>
                        {draft.logo ? (
                          <button type="button" className="mt-1 text-xs text-maroon underline" onClick={() => set('logo', null)}>
                            Use default logo
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="mt-5 text-base font-bold">Application Preferences</h3>
                <ToggleRow draft={draft} field="allowRegistration" label="Allow member registration" onChange={set} />
                <ToggleRow draft={draft} field="enableEventNotifications" label="Enable event notifications" onChange={set} />
                <ToggleRow draft={draft} field="allowUploads" label="Allow photo/video uploads" onChange={set} />
              </>
            ) : null}

            {list ? (
              <>
                <h2 className="text-lg font-bold">{list.title}</h2>
                <p className="mb-4 text-sm text-muted-foreground">{list.hint}</p>
                <ListEditor items={draft[list.key]} onChange={(items) => set(list.key, items)} />
              </>
            ) : null}

            {section === 'notifications' ? (
              <>
                <h2 className="text-lg font-bold">Notification Settings</h2>
                <p className="mb-4 text-sm text-muted-foreground">Choose what admins are alerted about</p>
                <ToggleRow draft={draft} field="notifyNewMember" label="New member registration" onChange={set} />
                <ToggleRow draft={draft} field="notifyDonation" label="Donation received" onChange={set} />
                <ToggleRow draft={draft} field="notifyExecutiveRequest" label="New executive request" onChange={set} />
                <ToggleRow draft={draft} field="notifyMediaUpload" label="New photo or video uploaded" onChange={set} />
                <ToggleRow draft={draft} field="enableEventNotifications" label="Send event reminders to members" onChange={set} />
              </>
            ) : null}

            {section === 'appearance' ? (
              <>
                <h2 className="text-lg font-bold">Appearance</h2>
                <p className="mb-4 text-sm text-muted-foreground">How the society name appears in the admin panel header</p>
                <ToggleRow draft={draft} field="showGujaratiName" label="Show the Gujarati name in the header" hint="When off, only the English society name is shown." onChange={set} />
                <div className="mt-3 rounded-lg bg-maroon px-4 py-3 text-white">
                  {draft.showGujaratiName ? <div className="font-gujarati text-lg font-bold">શ્રી ગામટોળા યુવક મિત્ર મંડળ</div> : null}
                  <div className={draft.showGujaratiName ? 'text-sm text-white/90' : 'text-lg font-bold'}>{draft.societyName}</div>
                </div>
              </>
            ) : null}

            {section === 'security' ? (
              <>
                <h2 className="text-lg font-bold">Security</h2>
                <p className="mb-4 text-sm text-muted-foreground">Rules for executive access and member uploads</p>
                <Field label="Minimum donation to request Executive role (₹)" className="max-w-xs">
                  <Input type="number" min={0} value={draft.MIN_EXECUTIVE_DONATION} onChange={(e) => set('MIN_EXECUTIVE_DONATION', Number(e.target.value))} />
                </Field>
                <div className="mt-3">
                  <ToggleRow draft={draft} field="requireMediaApproval" label="Member uploads need admin approval" hint="Uploads stay hidden until approved in Media Approval." onChange={set} />
                </div>
                <p className="mt-4 rounded-lg bg-[#FFF6DD] px-3 py-2 text-xs text-[#7A5A00]">
                  Admin login is not yet connected to the server: any email and password opens this panel. Connect it before going live.
                </p>
              </>
            ) : null}

            {section === 'backup' ? (
              <>
                <h2 className="text-lg font-bold">Backup &amp; Data</h2>
                <p className="mb-4 text-sm text-muted-foreground">Download a copy of all society data as one JSON file</p>
                <Button
                  type="button"
                  disabled={backingUp}
                  onClick={async () => {
                    setBackingUp(true);
                    try {
                      await backupService.downloadBackup();
                    } finally {
                      setBackingUp(false);
                    }
                  }}
                >
                  {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />} Download Backup
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">Includes members, events, notices, donations, expenses, media records, reports and settings.</p>
                {DATA_MODE === 'mock' ? (
                  <div className="mt-6 border-t border-border pt-4">
                    <h3 className="text-base font-bold">Demo Data</h3>
                    <p className="mb-3 text-sm text-muted-foreground">
                      This demo keeps its data in your browser only. Other people opening the link see their own copy.
                    </p>
                    <Button type="button" variant="outline" className="border-[#C62828] text-[#C62828]" onClick={() => setConfirmReset(true)}>
                      Reset Demo Data
                    </Button>
                    <ConfirmDialog
                      open={confirmReset}
                      onOpenChange={setConfirmReset}
                      title="Reset demo data?"
                      description="Every change made in this browser is removed and the original sample data comes back."
                      confirmLabel="Reset"
                      destructive
                      onConfirm={() => {
                        resetMockData();
                        window.location.reload();
                      }}
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            {section === 'about' ? (
              <>
                <h2 className="text-lg font-bold">About</h2>
                <dl className="mt-3 grid max-w-md grid-cols-[140px_1fr] gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Application</dt>
                  <dd>{draft.societyName} Admin Panel</dd>
                  <dt className="text-muted-foreground">Version</dt>
                  <dd>1.0.0</dd>
                  <dt className="text-muted-foreground">Data source</dt>
                  <dd>{DATA_MODE === 'mock' ? 'Demo data stored in this browser' : DATA_MODE === 'local-server' ? `Mock server (${API_URL})` : DATA_MODE}</dd>
                  <dt className="text-muted-foreground">Support</dt>
                  <dd>{draft.contactEmail}</dd>
                </dl>
              </>
            ) : null}

            {!['backup', 'about'].includes(section) ? (
              <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
                {changed ? (
                  <Button type="button" variant="ghost" onClick={() => setDraft(toDraft(data))}>
                    Discard
                  </Button>
                ) : null}
                <Button type="submit" disabled={!changed || save.isPending || !!emailError} className="min-w-36">
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
                </Button>
              </div>
            ) : null}
          </Card>
        </form>
      </div>
    </>
  );
}
