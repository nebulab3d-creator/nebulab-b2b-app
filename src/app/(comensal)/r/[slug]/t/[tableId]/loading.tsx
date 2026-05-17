import { Skeleton } from '@/components/ui/skeleton';

export default function ComensalLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 shrink-0 rounded-full" />
          ))}
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-3">
        <Skeleton className="h-8 w-full" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 pb-24">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-lg border bg-card p-3">
            <Skeleton className="h-20 w-20 shrink-0 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
