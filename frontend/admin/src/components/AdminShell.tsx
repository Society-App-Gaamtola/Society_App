'use client';

import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  Crown,
  HandCoins,
  ImageIcon,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ReceiptText,
  Search,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useSettings } from '@/hooks/useSettings';
import { clearSession, getSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/primitives';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/executives', label: 'Executives', icon: Crown },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/notices', label: 'Notices', icon: Megaphone },
  { href: '/donations', label: 'Donations', icon: HandCoins },
  { href: '/expenses', label: 'Expenses', icon: ReceiptText },
  { href: '/reports', label: 'Financial Reports', icon: BarChart3 },
  { href: '/media', label: 'Media Approval', icon: ImageIcon },
  { href: '/settings', label: 'App Settings', icon: Settings },
];

const GUJARATI_NAME = 'શ્રી ગામટોળા યુવક મિત્ર મંડળ';
const DEFAULT_NAME = 'Shri Gamtola Yuvak Mitra Mandal';

function Notifications() {
  const router = useRouter();
  const { data } = useDashboardStats();
  const items = data
    ? [
        { count: data.pendingRequests, label: 'executive requests to review', href: '/executives' },
        { count: data.pendingDonations, label: 'donations to verify', href: '/donations?status=Pending' },
        { count: data.pendingExpenses, label: 'expenses to verify', href: '/expenses?status=Pending' },
        { count: data.pendingMedia, label: 'photos/videos to approve', href: '/media?tab=pending' },
      ].filter((i) => i.count > 0)
    : [];
  const total = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative ml-auto rounded-md p-1 outline-none md:ml-2" aria-label={`Notifications${total ? `, ${total} pending` : ''}`}>
        <Bell className="h-5 w-5" />
        {total ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F5B400] px-1 text-[10px] font-bold text-maroon">
            {total}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">Waiting for you</div>
        {items.length ? (
          items.map((i) => (
            <DropdownMenuItem key={i.href} onSelect={() => router.push(i.href)}>
              <span className="font-semibold text-maroon">{i.count}</span> {i.label}
            </DropdownMenuItem>
          ))
        ) : (
          <p className="px-3 py-2 text-sm text-muted-foreground">Nothing pending. All caught up.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const { data: settings } = useSettings();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `${pathname}?search=${encodeURIComponent(q)}` : pathname);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-3 bg-maroon px-4 text-white">
      <button type="button" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-6 w-6" />
      </button>
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#F5D58A] bg-white lg:h-[72px] lg:w-[72px] lg:translate-y-3">
        {settings?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logo} alt="Society logo" className="h-full w-full object-cover" />
        ) : (
          <Image src="/logo.png" alt="Society logo" fill sizes="72px" className="object-cover" priority />
        )}
      </span>
      <div className="hidden min-w-0 leading-tight sm:block">
        {settings?.showGujaratiName !== false ? <div className="truncate font-gujarati text-lg font-bold">{GUJARATI_NAME}</div> : null}
        <div className={cn('truncate', settings?.showGujaratiName !== false ? 'text-sm text-white/90' : 'text-lg font-bold')}>
          {settings?.societyName || DEFAULT_NAME}
        </div>
      </div>

      <form onSubmit={onSearch} className="relative ml-auto hidden w-64 md:block" role="search">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search here..."
          aria-label="Search this page"
          className="h-9 w-full rounded-lg bg-white/15 pl-9 pr-3 text-sm text-white placeholder:text-white/70 focus:bg-white/25 focus:outline-none"
        />
      </form>

      <Notifications />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <User className="h-5 w-5" />
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold">Admin</span>
            <span className="block text-xs text-white/80">Super Admin</span>
          </span>
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => toast('Profile is coming soon.')}>
            <User className="h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast('Change Password is coming soon.')}>
            <KeyRound className="h-4 w-4" /> Change Password
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              clearSession();
              router.replace('/login');
            }}
          >
            <LogOut className="h-4 w-4" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function SideBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {open ? <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={onClose} /> : null}
      <nav
        aria-label="Main"
        className={cn(
          'fixed bottom-0 left-0 top-16 z-30 w-[230px] space-y-1 overflow-y-auto bg-maroon px-3 pb-3 pt-3 transition-transform lg:translate-x-0 lg:pt-10',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active ? 'bg-white font-semibold text-maroon shadow-sm' : 'text-white/90 hover:bg-white/10',
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // UI-only protection: the session lives in localStorage until real auth exists.
  useEffect(() => {
    if (getSession()) setReady(true);
    else router.replace('/login');
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#FAF6F0]">
      <TopBar onMenu={() => setMenuOpen(true)} />
      <SideBar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="p-4 pt-[84px] sm:p-6 sm:pt-[88px] lg:pl-[254px]">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  );
}
