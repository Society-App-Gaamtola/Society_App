'use client';

import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

/** Calls shorter than this never show the bar, so fast pages don't flicker */
const SHOW_AFTER_MS = 150;

/**
 * Thin gold bar under the top bar while any data is loading or being saved, on every screen.
 * It reads TanStack Query's own counters (and AdminShell's page change), so screens need no extra code.
 * Cached pages make no call, so no bar.
 */
export function LoadingBar({ navigating = false }: { navigating?: boolean }) {
  const fetching = useIsFetching();
  const saving = useIsMutating();
  const busy = navigating || fetching + saving > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!busy) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-x-0 top-16 z-50 h-[3px] overflow-hidden bg-[#F5B400]/20 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="loading-bar-stripe h-full w-1/3 rounded-full bg-[#F5B400]" />
    </div>
  );
}
