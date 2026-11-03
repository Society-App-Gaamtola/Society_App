'use client';

import { memo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Loader2, RotateCcw, Upload, X, type LucideIcon } from 'lucide-react';
import { useUpload } from '@/hooks/useUpload';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button,
  Skeleton,
} from './ui/primitives';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export const StatCard = memo(function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  iconClassName = 'bg-accent text-maroon',
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  /** Percent change; shown as "↑ 12%" or "↓ 3%". */
  trend?: number;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-lg font-bold">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
      {trend !== undefined ? (
        <span className={cn('ml-auto text-xs font-semibold', trend >= 0 ? 'text-[#1E8E4E]' : 'text-[#C62828]')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      ) : null}
    </div>
  );
});

const GREEN = 'bg-[#E6F6EC] text-[#1E8E4E]';
const ORANGE = 'bg-[#FFF1E0] text-[#E0700B]';
const RED = 'bg-[#FDECEC] text-[#C62828]';
const GREY = 'bg-[#F0EEEC] text-[#6B6B6B]';

const statusClasses: Record<string, string> = {
  Active: GREEN,
  Verified: GREEN,
  Published: GREEN,
  Approved: GREEN,
  Normal: GREEN,
  Pending: ORANGE,
  'Pending review': ORANGE,
  Executive: ORANGE,
  Inactive: RED,
  Rejected: RED,
  Draft: GREY,
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-block rounded-md px-2 py-0.5 text-xs font-semibold', statusClasses[status] ?? GREY)}>
      {status}
    </span>
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

export function FileUpload({
  value,
  onChange,
  accept = 'image/*,application/pdf',
  maxMb = 5,
  label = 'Choose file',
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  accept?: string;
  maxMb?: number;
  label?: string;
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

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm">
          {/\.(png|jpe?g|webp|gif)$/i.test(value) ? (
            // Plain img: uploads can come from any server host, which next/image would reject.
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
          onClick={() => input.current?.click()}
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
