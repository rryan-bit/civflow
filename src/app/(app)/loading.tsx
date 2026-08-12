import { Skeleton } from "@/components/ui/skeleton";

// Next.js shows this automatically as the Suspense fallback for every page
// under the (app) group while its data loads — replaces what used to be a
// blank white flash on every navigation with an immediate, on-brand
// placeholder shaped roughly like a normal page (title, then a few panels).
export default function Loading() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-80" />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>

      <div className="mt-8 space-y-3">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </div>
  );
}
