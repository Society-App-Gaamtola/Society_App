import { PageSkeleton } from '@/components/common';

/** Next.js shows this while a page's code loads (in a production build it is prefetched, so it appears at once) */
export default function Loading() {
  return <PageSkeleton />;
}
