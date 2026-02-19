import { cn } from "@/lib/utils";
import type { Store } from "@/lib/utils";

interface StoreBadgeProps {
  store: Store;
  size?: "sm" | "md";
  winner?: boolean;
}

export function StoreBadge({ store, size = "sm", winner = false }: StoreBadgeProps) {
  const isWoolworths = store === "woolworths";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold rounded-full",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-3 py-1 text-xs",
        isWoolworths
          ? "bg-woolworths-bg text-woolworths"
          : "bg-coles-bg text-coles",
        winner && "ring-2 ring-brand/30"
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          isWoolworths ? "bg-woolworths" : "bg-coles"
        )}
      />
      {isWoolworths ? "Woolworths" : "Coles"}
    </span>
  );
}
