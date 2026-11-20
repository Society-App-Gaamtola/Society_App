'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Which page the admin just asked for, until it is on screen. AdminShell shows the loading bar, a page skeleton
 * and the highlighted menu item at once, so a click never looks frozen (the first visit to a page can take a few
 * seconds in `next dev` while the page is compiled).
 */
let pending: string | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** A page that never arrives (error, cancelled click) must not leave the skeleton up forever */
const MAX_PENDING_MS = 20_000;

export function startNavigation(path: string) {
  pending = path;
  clearTimeout(safetyTimer);
  safetyTimer = setTimeout(endNavigation, MAX_PENDING_MS);
  emit();
}

export function endNavigation() {
  if (pending === null) return;
  pending = null;
  clearTimeout(safetyTimer);
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The path being opened, or null */
export const usePendingPath = () => useSyncExternalStore(subscribe, () => pending, () => null);

/** router.push that shows the loading state at once (for buttons; links are handled by AdminShell) */
export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (href: string) => {
      const path = href.split('?')[0];
      // Same page with other ?params (e.g. ?new=1) opens at once: no page skeleton
      if (path !== window.location.pathname) startNavigation(path);
      router.push(href);
    },
    [router],
  );
}
