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

function TopBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');

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
      <Image src="/logo.png" alt="" width={44} height={44} className="rounded-full bg-white" priority />
      <div className="hidden leading-tight sm:block">
        <div className="font-gujarati text-sm font-bold">શ્રી ગામટોળા યુવક મિત્ર મંડળ</div>
        <div className="text-xs text-white/80">Shri Gamtola Yuvak Mitra Mandal</div>
      </div>

      <form onSubmit={onSearch} className="relative ml-auto hidden w-64 md:block" role="search">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search here..."
          aria-label="Search here"
          className="h-9 w-full rounded-lg bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </form>

      <button type="button" className="relative ml-auto md:ml-2" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
      </button>

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
          'fixed bottom-0 left-0 top-16 z-30 w-[230px] overflow-y-auto bg-maroon py-3 transition-transform lg:translate-x-0',
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
                'flex items-center gap-3 border-l-4 px-4 py-3 text-sm text-white/90 hover:bg-maroon-dark',
                active ? 'border-white bg-maroon-dark font-semibold text-white' : 'border-transparent',
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
    <div className="min-h-screen bg-cream">
      <TopBar onMenu={() => setMenuOpen(true)} />
      <SideBar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="p-6 pt-[88px] lg:pl-[254px]">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  );
}
