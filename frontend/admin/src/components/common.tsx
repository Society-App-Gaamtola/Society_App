'use client';

import { memo, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Eye,
  FileSpreadsheet,
  Loader2,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useUpload } from '@/hooks/useUpload';
import { useUrlState } from '@/hooks/useUrlState';
import { cn, initials, isImageUrl } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  Textarea,
} from './ui/primitives';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A44]">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-white p-4', className)}>
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? <h2 className="text-base font-bold text-[#1F2A44]">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

const TONES = {
  red: { card: 'bg-[#FDEEEE]', icon: 'bg-[#C62828] text-white' },
  orange: { card: 'bg-[#FFF3E3]', icon: 'bg-[#E0700B] text-white' },
  blue: { card: 'bg-[#EAF1FD]', icon: 'bg-[#1E63C6] text-white' },
  green: { card: 'bg-[#E9F7EE]', icon: 'bg-[#1E8E4E] text-white' },
  amber: { card: 'bg-[#FFF6DD]', icon: 'bg-[#D9A21B] text-white' },
  purple: { card: 'bg-[#F2ECFC]', icon: 'bg-[#6B46C1] text-white' },
};
export type Tone = keyof typeof TONES;

export const StatCard = memo(function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  trendGoodWhenUp = true,
  tone = 'red',
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  /** Percent change; shown as "↑ 12%" or "↓ 3%". */
  trend?: number | null;
  /** For expenses a rise is shown in red. */
  trendGoodWhenUp?: boolean;
  tone?: Tone;
}) {
  const good = trend != null && (trend >= 0) === trendGoodWhenUp;
  return (
    <div className={cn('flex items-center gap-3 rounded-xl p-4', TONES[tone].card)}>
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', TONES[tone].icon)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xl font-bold text-[#1F2A44]">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        {trend != null ? (
          <div className={cn('text-xs font-semibold', good ? 'text-[#1E8E4E]' : 'text-[#C62828]')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        ) : null}
      </div>
    </div>
  );
});

const GREEN = 'bg-[#E6F6EC] text-[#1E8E4E]';
const ORANGE = 'bg-[#FFF1E0] text-[#E0700B]';
const RED = 'bg-[#FDECEC] text-[#C62828]';
const BLUE = 'bg-[#E8F0FC] text-[#1E63C6]';
const GREY = 'bg-[#F0EEEC] text-[#6B6B6B]';

const statusClasses: Record<string, string> = {
  Active: GREEN,
  Verified: GREEN,
  Published: GREEN,
  Approved: GREEN,
  Allowed: GREEN,
  Confirmed: GREEN,
  Normal: BLUE,
  Draft: BLUE,
  Assigned: BLUE,
  Pending: ORANGE,
  'Pending review': ORANGE,
  Executive: ORANGE,
  Inactive: RED,
  Rejected: RED,
  'Not Allowed': RED,
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold', statusClasses[status] ?? GREY, className)}>
      {status === 'Pending review' ? 'Pending' : status}
    </span>
  );
}

const AVATAR_COLORS = ['bg-[#FDECEC] text-[#7A1020]', 'bg-[#E8F0FC] text-[#1E63C6]', 'bg-[#E6F6EC] text-[#1E8E4E]', 'bg-[#FFF1E0] text-[#E0700B]', 'bg-[#F2ECFC] text-[#6B46C1]'];

export function Avatar({ name, src, size = 32, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const color = AVATAR_COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return src ? (
    // Plain img: uploads can come from any server host, which next/image would reject.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className={cn('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold', color, className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}

export type TabItem = { value: string; label: string; count?: number; icon?: LucideIcon };

/** `pills` for filters inside a page (Pending / Approved…); `underline` for switching between views of a page. */
export function Tabs({
  tabs,
  value,
  onChange,
  className,
  variant = 'pills',
}: {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: 'pills' | 'underline';
}) {
  const underline = variant === 'underline';
  return (
    <div role="tablist" className={cn('mb-4 flex flex-wrap', underline ? 'gap-6 border-b border-border' : 'gap-2', className)}>
      {tabs.map(({ value: v, label, count, icon: Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium transition-colors',
              underline
                ? cn('-mb-px border-b-2 px-1 pb-2.5', active ? 'border-maroon font-semibold text-maroon' : 'border-transparent text-muted-foreground hover:text-foreground')
                : cn('rounded-lg px-4 py-2', active ? 'bg-maroon text-white' : 'bg-[#F5EEE4] text-foreground hover:bg-[#EFE4D6]'),
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {label}
            {count !== undefined ? <span className={active ? 'text-white/80' : 'text-muted-foreground'}>({count})</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export type MenuAction = { label: string; icon?: LucideIcon; onSelect: () => void; destructive?: boolean; hidden?: boolean };

/** Edit / view / delete icons plus an optional "more" menu, as in every table of the design. */
export function RowActions({
  label,
  onEdit,
  onView,
  onDelete,
  more = [],
}: {
  /** Names the row for screen readers, e.g. "Ramesh Patel". */
  label: string;
  onEdit?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  more?: MenuAction[];
}) {
  const items = more.filter((m) => !m.hidden);
  const iconButton = 'rounded-md p-1.5 hover:bg-accent';
  return (
    <div className="flex items-center gap-0.5">
      {onEdit ? (
        <button type="button" className={cn(iconButton, 'text-[#1F2A44]')} onClick={onEdit} aria-label={`Edit ${label}`} title="Edit">
          <Pencil className="h-4 w-4" />
        </button>
      ) : null}
      {onView ? (
        <button type="button" className={cn(iconButton, 'text-[#1F2A44]')} onClick={onView} aria-label={`View ${label}`} title="View">
          <Eye className="h-4 w-4" />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className={cn(iconButton, 'text-[#C62828]')} onClick={onDelete} aria-label={`Delete ${label}`} title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
      {items.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(iconButton, 'text-muted-foreground outline-none')} aria-label={`More actions for ${label}`}>
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {items.map(({ label: text, icon: Icon, onSelect, destructive }) => (
              <DropdownMenuItem key={text} onSelect={onSelect} className={destructive ? 'text-[#C62828]' : undefined}>
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {text}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

/** Downloads the current list as an Excel file. */
export function ExportButton({ onExport, disabled }: { onExport: () => Promise<void> | void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onExport();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outline" className="border-maroon text-maroon" onClick={run} disabled={disabled || busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Export to Excel
    </Button>
  );
}

/** From/to dates kept in the URL (?from=&to=), shared by filters, stats and charts. */
export function DateRangePicker({ className }: { className?: string }) {
  const { get, setParams } = useUrlState();
  return (
    <div className={cn('flex h-10 items-center gap-1 rounded-lg border border-input bg-white px-3 text-sm', className)}>
      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        type="date"
        aria-label="From date"
        className="w-[7.5rem] bg-transparent focus:outline-none"
        value={get('from')}
        max={get('to') || undefined}
        onChange={(e) => setParams({ from: e.target.value })}
      />
      <span className="text-muted-foreground">–</span>
      <input
        type="date"
        aria-label="To date"
        className="w-[7.5rem] bg-transparent focus:outline-none"
        value={get('to')}
        min={get('from') || undefined}
        onChange={(e) => setParams({ to: e.target.value })}
      />
    </div>
  );
}

export function Field({ label, children, error, className }: { label: string; children: ReactNode; error?: string; className?: string }) {
  return (
    <label className={cn('block text-sm', className)}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-[#C62828]">{error}</span> : null}
    </label>
  );
}

/** Pop-up form. The parent owns the field state; `onSubmit` runs when the form is valid. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = 'Save',
  pending,
  onSubmit,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  pending?: boolean;
  onSubmit: () => void;
  children: ReactNode;
  className?: string;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className} aria-describedby={undefined}>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
            {description ? <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription> : null}
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">{children}</div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Read-only details in a pop-up. */
export function ViewDialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className} aria-describedby={undefined}>
        <div className="border-b border-border px-6 py-4 pr-12">
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}

export function DetailList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 break-words font-medium">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Asks for a reason before rejecting something. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pending?: boolean;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      submitLabel="Reject"
      pending={pending}
      onSubmit={() => (reason.trim() ? onSubmit(reason.trim()) : setError('Please give a reason.'))}
    >
      <Field label="Reason" error={error}>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Shared with the member" autoFocus />
      </Field>
    </FormDialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle className="text-lg font-bold">{title}</AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">{description}</AlertDialogDescription>
        <div className="mt-6 flex justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm text-muted-foreground">{message ?? 'Could not load data. Is the mock server running?'}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" /> Retry
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{message}</p>;
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

export function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-8" />
      ))}
    </div>
  );
}

export function SortIcon({ order }: { order?: 'asc' | 'desc' }) {
  if (!order) return null;
  const Icon = order === 'asc' ? ArrowUp : ArrowDown;
  return <Icon className="h-3 w-3" />;
}

/** Uploads a file and returns its URL. `children` replaces the default drop box, e.g. a "Change Photo" button. */
export function FileUpload({
  value,
  onChange,
  accept = 'image/*,application/pdf',
  maxMb = 5,
  label = 'Choose file',
  children,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  accept?: string;
  maxMb?: number;
  label?: string;
  children?: (open: () => void, uploading: boolean) => ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpload();
  const [error, setError] = useState<string | null>(null);

  const onFile = (file?: File) => {
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      setError(`File must be smaller than ${maxMb} MB.`);
      return;
    }
    setError(null);
    upload.mutate(file, { onSuccess: ({ url }) => onChange(url) });
  };
  const open = () => input.current?.click();

  return (
    <div>
      {children ? (
        children(open, upload.isPending)
      ) : value ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm">
          {isImageUrl(value) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-12 w-12 rounded object-cover" />
          ) : null}
          <a href={value} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-maroon underline">
            {value.split('/').pop()}
          </a>
          <button type="button" aria-label="Remove file" onClick={() => onChange(null)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={upload.isPending}
          onClick={open}
          className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-[#D9CBB8] bg-white text-sm text-maroon"
        >
          {upload.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {label}
          <span className="text-xs text-muted-foreground">Max {maxMb} MB</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error ? <p className="mt-1 text-xs text-[#C62828]">{error}</p> : null}
    </div>
  );
}

