import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  // Admin's shell is always dark regardless of the person's theme
  // preference (see admin/layout.tsx) — the extra `dark` class here scopes
  // the skeleton's dark shimmer variant locally so it isn't styled for
  // whatever the global light/dark toggle happens to be set to.
  return (
    <div className="dark mx-auto max-w-6xl animate-fade-in" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-48" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </div>
  );
}
