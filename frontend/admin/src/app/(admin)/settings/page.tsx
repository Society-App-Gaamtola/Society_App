'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { Bell, CalendarDays, Database, Download, HandCoins, Info, Loader2, Megaphone, Palette, Plus, QrCode, ReceiptText, Settings, Share2, ShieldCheck, X, type LucideIcon } from 'lucide-react';
import { Card, ErrorState, Field, FileUpload, PageHeader } from '@/components/common';
import { Button, Input, Skeleton, Switch, Textarea } from '@/components/ui/primitives';
import { BACKEND_URL } from '@/config';
import { useAppSettings, useDownloadBackup, useSaveSettings } from '@/hooks/useFinance';
import { useUrlState } from '@/hooks/useUrlState';
import { cn, formatDateTime, fromUtc } from '@/lib/utils';
import { uploadBrandingImage } from '@/services/cloudinary';
import { noticeTagLabel } from '@/services/adminEvents';
import { SOCIAL_NETWORKS, type AppSettings, type SettingsChanges, type SettingsData, type SocialLinks, type UpiDetails } from '@/services/finance';

type BoolKey = { [K in keyof AppSettings]: AppSettings[K] extends boolean ? K : never }[keyof AppSettings];
type Category = { id?: number; name: string };
type Draft = { settings: AppSettings; categories: Category[]; upi: UpiDetails | null };

const SECTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'general', label: 'General Settings', icon: Settings },
  { value: 'event-categories', label: 'Event Categories', icon: CalendarDays },
  { value: 'notice-categories', label: 'Notice Categories', icon: Megaphone },
  { value: 'donation-categories', label: 'Donation Categories', icon: HandCoins },
  { value: 'expense-categories', label: 'Expense Categories', icon: ReceiptText },
  { value: 'upi', label: 'Donations (UPI)', icon: QrCode },
  { value: 'social', label: 'Social Networking', icon: Share2 },
  { value: 'notifications', label: 'Notification Settings', icon: Bell },
  { value: 'appearance', label: 'Appearance', icon: Palette },
  { value: 'security', label: 'Security', icon: ShieldCheck },
  { value: 'backup', label: 'Backup & Data', icon: Database },
  { value: 'about', label: 'About', icon: Info },
];
const EMPTY_UPI: UpiDetails = { payee_name: '', upi_id: '', qr_image_url: null, display_note: '' };

const toDraft = (d: SettingsData): Draft => ({ settings: d.settings, categories: d.event_categories.map(({ id, name }) => ({ id, name })), upi: d.upi });

/** Only what changed goes to PUT /admin/settings */
function changesOf(before: Draft, after: Draft): SettingsChanges {
  const changes: SettingsChanges = {};
  for (const key of Object.keys(after.settings) as (keyof AppSettings)[]) {
    if (JSON.stringify(after.settings[key]) !== JSON.stringify(before.settings[key])) (changes as Record<string, unknown>)[key] = after.settings[key];
  }
  if (JSON.stringify(after.categories) !== JSON.stringify(before.categories)) changes.event_categories = after.categories;
  if (JSON.stringify(after.upi) !== JSON.stringify(before.upi)) changes.upi = after.upi;
  return changes;
}

function ToggleRow({ draft, field, label, hint, onChange }: { draft: AppSettings; field: BoolKey; label: string; hint?: string; onChange: (field: BoolKey, value: boolean) => void }) {
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

function ListEditor({ items, onChange, readOnly }: { items: string[]; onChange?: (items: string[]) => void; readOnly?: boolean }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const add = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !onChange) return;
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
            {readOnly ? (
              <span className="pr-2" />
            ) : (
              <button
                type="button"
                onClick={() => onChange?.(items.filter((i) => i !== item))}
                className="rounded-full p-0.5 hover:bg-[#EFE4D6] disabled:opacity-40"
                aria-label={`Remove ${item}`}
                disabled={items.length <= 1}
                title={items.length <= 1 ? 'Keep at least one' : undefined}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {readOnly ? null : (
        <>
          {/* A nested <form> is not allowed, so the add box handles Enter itself. */}
          <div className="flex max-w-md gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(e)} placeholder="New category" aria-label="New category" maxLength={64} />
            <Button type="button" variant="outline" onClick={add}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {error ? <p className="mt-1 text-xs text-[#C62828]">{error}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">Removing a category does not change existing entries that use it.</p>
        </>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading settings" className="grid gap-4 lg:grid-cols-[230px_1fr]">
      <Skeleton className="h-96 rounded-xl" />
      <div className="space-y-3 rounded-xl border border-border bg-white p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const url = useUrlState();
  const section = SECTIONS.some((s) => s.value === url.get('section')) ? url.get('section') : 'general';
  const { data, isLoading, isError, error, refetch } = useAppSettings();
  const save = useSaveSettings();
  const backup = useDownloadBackup();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (data) setDraft(toDraft(data));
  }, [data]);

  if (isError) return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  if (isLoading || !draft || !data) {
    return (
      <>
        <PageHeader title="App Settings" subtitle="Manage application configuration and general settings" />
        <SettingsSkeleton />
      </>
    );
  }

  const s = draft.settings;
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setDraft((d) => (d ? { ...d, settings: { ...d.settings, [key]: value } } : d));
  const setUpi = <K extends keyof UpiDetails>(key: K, value: UpiDetails[K]) => setDraft((d) => (d ? { ...d, upi: { ...(d.upi ?? EMPTY_UPI), [key]: value } } : d));
  const changes = changesOf(toDraft(data), draft);
  const changed = Object.keys(changes).length > 0;
  const emailError = s.contact_email && !/^\S+@\S+\.\S+$/.test(s.contact_email) ? 'Enter a valid email.' : '';
  const nameError = s.society_name.trim().length < 2 ? 'Society name is required.' : '';
  const upiError = draft.upi && (!draft.upi.payee_name.trim() || !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(draft.upi.upi_id.trim())) ? 'Enter the payee name and a UPI ID like name@bank.' : '';
  const socialLinks: SocialLinks = s.social_links;
  const socialErrors = Object.fromEntries(
    SOCIAL_NETWORKS.map(({ key }) => [key, socialLinks[key] && !/^https?:\/\/\S+\.\S+/.test(socialLinks[key].trim()) ? 'Enter the full link, starting with https://' : '']),
  ) as Record<keyof SocialLinks, string>;
  const blocked = !!(emailError || nameError || upiError || Object.values(socialErrors).some(Boolean));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!changed || blocked) return;
    save.mutate(changes);
  };

  const listOf = (key: 'donation_purposes' | 'expense_categories', title: string, hint: string) => (
    <>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{hint}</p>
      <ListEditor items={s[key]} onChange={(items) => set(key, items)} />
    </>
  );

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
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm', section === value ? 'bg-[#FDF3F3] font-semibold text-maroon' : 'hover:bg-accent')}
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
                <p className="mb-4 text-sm text-muted-foreground">Society details shown in the app, the panel and on receipts</p>
                <div className="grid gap-4 xl:grid-cols-[1fr_200px]">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Society Name" error={nameError}>
                      <Input value={s.society_name} onChange={(e) => set('society_name', e.target.value)} />
                    </Field>
                    <Field label="Society Name (Gujarati)">
                      <Input className="font-gujarati" value={s.society_name_gu} onChange={(e) => set('society_name_gu', e.target.value)} placeholder="શ્રી ગામટોળા યુવક મિત્ર મંડળ" />
                    </Field>
                    <Field label="Contact Email" error={emailError}>
                      <Input type="email" value={s.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
                    </Field>
                    <Field label="Contact Number">
                      <Input value={s.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" />
                    </Field>
                    <Field label="Society Address" className="md:col-span-3">
                      <Textarea rows={3} value={s.address} onChange={(e) => set('address', e.target.value)} />
                    </Field>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">Society Logo</span>
                    <div className="flex items-center gap-3 xl:flex-col xl:items-start">
                      <span className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#F5D58A] bg-white">
                        {s.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logo_url} alt="Society logo" className="h-full w-full object-cover" />
                        ) : (
                          <Image src="/logo.png" alt="Society logo" fill sizes="96px" className="object-cover" />
                        )}
                      </span>
                      <div>
                        <FileUpload value={s.logo_url} onChange={(logo) => set('logo_url', logo)} accept="image/*" maxMb={2} upload={uploadBrandingImage}>
                          {(open, uploading) => (
                            <Button type="button" size="sm" variant="outline" className="border-maroon text-maroon" onClick={open} disabled={uploading}>
                              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Change Logo
                            </Button>
                          )}
                        </FileUpload>
                        <p className="mt-1 text-xs text-muted-foreground">Recommended size: 800 × 800 px</p>
                        {s.logo_url ? (
                          <button type="button" className="mt-1 text-xs text-maroon underline" onClick={() => set('logo_url', null)}>
                            Use default logo
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="mt-5 text-base font-bold">Application Preferences</h3>
                <ToggleRow draft={s} field="allow_registration" label="Allow member registration" hint="Off: new sign-ups in the app are refused." onChange={set} />
                <ToggleRow draft={s} field="event_notifications" label="Send new event notifications to members" onChange={set} />
                <ToggleRow draft={s} field="allow_uploads" label="Allow photo/video uploads" hint="Off: nobody can add to the gallery." onChange={set} />
              </>
            ) : null}

            {section === 'event-categories' ? (
              <>
                <h2 className="text-lg font-bold">Event Categories</h2>
                <p className="mb-4 text-sm text-muted-foreground">Shown when creating events and in the app&apos;s event filter.</p>
                <ListEditor
                  items={draft.categories.map((c) => c.name)}
                  onChange={(names) =>
                    setDraft((d) => (d ? { ...d, categories: names.map((name) => d.categories.find((c) => c.name === name) ?? { name }) } : d))
                  }
                />
              </>
            ) : null}

            {section === 'notice-categories' ? (
              <>
                <h2 className="text-lg font-bold">Notice Categories</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Shown when posting a notice and in the app&apos;s notice board filter. Important, General and Event are translated in the app; new ones show as typed.
                </p>
                <ListEditor items={s.notice_tags.map(noticeTagLabel)} onChange={(items) => set('notice_tags', items.map((t) => t.toLowerCase()))} />
              </>
            ) : null}

            {section === 'donation-categories' ? listOf('donation_purposes', 'Donation Categories', 'Purposes members can donate for in the app, also used in the panel.') : null}
            {section === 'expense-categories' ? listOf('expense_categories', 'Expense Categories', 'Used to group expenses and in reports.') : null}

            {section === 'upi' ? (
              <>
                <h2 className="text-lg font-bold">Donations (UPI)</h2>
                <p className="mb-4 text-sm text-muted-foreground">The society&apos;s UPI details shown on the app&apos;s Donate screen.</p>
                {draft.upi ? (
                  <div className="grid gap-4 xl:grid-cols-[1fr_200px]">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Payee Name">
                        <Input value={draft.upi.payee_name} onChange={(e) => setUpi('payee_name', e.target.value)} />
                      </Field>
                      <Field label="UPI ID" error={upiError}>
                        <Input value={draft.upi.upi_id} onChange={(e) => setUpi('upi_id', e.target.value)} placeholder="society@okaxis" />
                      </Field>
                      <Field label="Note shown to members (optional)" className="md:col-span-2">
                        <Input value={draft.upi.display_note ?? ''} onChange={(e) => setUpi('display_note', e.target.value)} />
                      </Field>
                    </div>
                    <div>
                      <span className="mb-1 block text-xs font-medium text-muted-foreground">UPI QR Code (optional)</span>
                      <FileUpload value={draft.upi.qr_image_url} onChange={(url) => setUpi('qr_image_url', url)} accept="image/*" maxMb={2} label="Upload QR image" upload={uploadBrandingImage} />
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-muted-foreground">No UPI details yet: members can only donate in cash.</p>
                )}
                <div className="mt-3">
                  {draft.upi ? (
                    <Button type="button" variant="ghost" className="text-[#C62828]" onClick={() => setDraft((d) => (d ? { ...d, upi: null } : d))}>
                      Remove UPI details
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" className="border-maroon text-maroon" onClick={() => setDraft((d) => (d ? { ...d, upi: EMPTY_UPI } : d))}>
                      <Plus className="h-4 w-4" /> Add UPI details
                    </Button>
                  )}
                </div>
              </>
            ) : null}

            {section === 'social' ? (
              <>
                <h2 className="text-lg font-bold">Social Networking</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  The society&apos;s pages. Members open them from the app&apos;s menu; change a link here and the app uses the new one at once. Leave a box empty to hide it.
                </p>
                <div className="grid max-w-2xl gap-3">
                  {SOCIAL_NETWORKS.map(({ key, label, placeholder }) => (
                    <Field key={key} label={label} error={socialErrors[key]}>
                      <Input
                        type="url"
                        value={socialLinks[key]}
                        placeholder={placeholder}
                        onChange={(e) => set('social_links', { ...socialLinks, [key]: e.target.value })}
                      />
                    </Field>
                  ))}
                </div>
              </>
            ) : null}

            {section === 'notifications' ? (
              <>
                <h2 className="text-lg font-bold">Notification Settings</h2>
                <p className="mb-4 text-sm text-muted-foreground">Choose what the Super Admin is alerted about (in-app notifications)</p>
                <ToggleRow draft={s} field="notify_new_member" label="New member registration" onChange={set} />
                <ToggleRow draft={s} field="notify_donation" label="Donation received" onChange={set} />
                <ToggleRow draft={s} field="notify_executive_request" label="New executive request" onChange={set} />
                <ToggleRow draft={s} field="notify_media_upload" label="New photo or video uploaded" onChange={set} />
                <ToggleRow draft={s} field="notify_expense" label="Expense or cash entry waiting for verification" hint="Entered by an executive in the app or the panel." onChange={set} />
                <ToggleRow draft={s} field="event_notifications" label="Send new event notifications to members" onChange={set} />
              </>
            ) : null}

            {section === 'appearance' ? (
              <>
                <h2 className="text-lg font-bold">Appearance</h2>
                <p className="mb-4 text-sm text-muted-foreground">How the society name appears in the admin panel header. The app always shows the Gujarati name (set in General Settings).</p>
                <ToggleRow draft={s} field="show_gujarati_name" label="Show the Gujarati name in the header" hint="When off, only the English society name is shown." onChange={set} />
                <div className="mt-3 rounded-lg bg-maroon px-4 py-3 text-white">
                  {s.show_gujarati_name ? <div className="font-gujarati text-lg font-bold">{s.society_name_gu || 'શ્રી ગામટોળા યુવક મિત્ર મંડળ'}</div> : null}
                  <div className={s.show_gujarati_name ? 'text-sm text-white/90' : 'text-lg font-bold'}>{s.society_name}</div>
                </div>
              </>
            ) : null}

            {section === 'security' ? (
              <>
                <h2 className="text-lg font-bold">Security</h2>
                <p className="mb-4 text-sm text-muted-foreground">Rules for executive access and member uploads</p>
                <Field label="Minimum donation to request Executive role (₹)" className="max-w-xs">
                  <Input type="number" min={0} value={s.executive_min_donation} onChange={(e) => set('executive_min_donation', Math.max(0, Math.round(Number(e.target.value))))} />
                </Field>
                <div className="mt-3">
                  <ToggleRow draft={s} field="require_media_approval" label="Member uploads need admin approval" hint="Off: members' photos and videos go straight to the gallery." onChange={set} />
                </div>
              </>
            ) : null}

            {section === 'backup' ? (
              <>
                <h2 className="text-lg font-bold">Backup &amp; Data</h2>
                <p className="mb-4 text-sm text-muted-foreground">Download a full copy of the database (every member, event, notice, donation, expense and setting).</p>
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[#FBF5EC] p-4">
                  <Button type="button" onClick={() => backup.mutate(undefined)} disabled={backup.isPending}>
                    {backup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Backup (.sql)
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Last backup: <span className="font-medium text-foreground">{s.last_backup_at ? formatDateTime(fromUtc(s.last_backup_at)) : 'never'}</span>
                  </span>
                </div>
                <h3 className="mt-5 text-base font-bold">Data recovery</h3>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
                  <li>Create an empty PostgreSQL database.</li>
                  <li>Run <code className="rounded bg-[#F5EEE4] px-1">database/schema.sql</code> on it (not seed.sql).</li>
                  <li>Load the backup: <code className="rounded bg-[#F5EEE4] px-1">psql -U postgres -d &lt;database&gt; -f society_app_backup_&lt;date&gt;.sql</code></li>
                  <li>Point the backend&apos;s database settings at it and restart. Every row and the next ids / member codes are back as they were.</li>
                </ol>
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Keep backups somewhere safe (they contain members&apos; contact details). Take one at least weekly.</li>
                  <li>Photos, posters and bills are stored in Cloudinary, not in this file.</li>
                </ul>
              </>
            ) : null}

            {section === 'about' ? (
              <>
                <h2 className="text-lg font-bold">About</h2>
                <dl className="mt-3 grid max-w-md grid-cols-[140px_1fr] gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Application</dt>
                  <dd>{s.society_name} Admin Panel</dd>
                  <dt className="text-muted-foreground">Version</dt>
                  <dd>1.0.0</dd>
                  <dt className="text-muted-foreground">Server</dt>
                  <dd className="break-all">{BACKEND_URL}</dd>
                  <dt className="text-muted-foreground">Support</dt>
                  <dd>{s.contact_email || '—'}</dd>
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
                <Button type="submit" disabled={!changed || save.isPending || blocked} className="min-w-36">
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
