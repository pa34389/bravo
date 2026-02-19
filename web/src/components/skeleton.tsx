import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton", className)} />;
}

export function PriceCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-raised p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="ml-auto h-5 w-14" />
        <Skeleton className="ml-auto h-3 w-20" />
      </div>
    </div>
  );
}

export function WinnerCardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface-raised p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <Skeleton className="h-4 w-1/3 mb-3" />
      <Skeleton className="h-8 w-2/3 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
