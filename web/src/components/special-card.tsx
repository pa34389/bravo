"use client";

import { Plus, Check } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { StoreBadge } from "./store-badge";
import { SaleSignal } from "./sale-signal";
import { useWatchlist } from "@/hooks/use-my-list";
import type { Special, SpecialIntel } from "@/lib/supabase";

interface SpecialCardProps {
  special: Special;
  intel?: SpecialIntel | null;
  showAddButton?: boolean;
}

export function SpecialCard({
  special,
  intel,
  showAddButton = true,
}: SpecialCardProps) {
  const { hasItem, toggleItem } = useWatchlist();
  const isWatched = hasItem(special.store, special.product_id);

  return (
    <div className="flex items-center gap-3 py-3">
      {special.image_url ? (
        <img
          src={special.image_url}
          alt={special.name}
          className="h-14 w-14 rounded-xl object-contain bg-white dark:bg-surface-secondary shrink-0 p-1"
          loading="lazy"
        />
      ) : (
        <div className="h-14 w-14 rounded-xl bg-surface-secondary shrink-0 flex items-center justify-center text-text-tertiary text-sm font-medium">
          {special.name.charAt(0)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold leading-tight">
            {special.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <StoreBadge store={special.store} size="sm" />
        </div>
        <SaleSignal intel={intel} layout="inline" />
      </div>

      <div className="text-right shrink-0 flex items-center gap-2">
        <div>
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-[16px] font-bold tabular-nums">
              {formatPrice(special.current_price)}
            </span>
            {special.original_price && (
              <span className="text-xs text-text-tertiary line-through tabular-nums">
                {formatPrice(special.original_price)}
              </span>
            )}
          </div>
          {special.original_price && special.current_price && (
            <span className="text-[11px] font-semibold text-price-down">
              Save ${(special.original_price - special.current_price).toFixed(2)}
            </span>
          )}
        </div>

        {showAddButton && (
          <button
            onClick={() =>
              toggleItem({
                store: special.store,
                productId: special.product_id,
                name: special.name,
              })
            }
            className={cn(
              "p-1.5 rounded-full transition-colors shrink-0",
              isWatched
                ? "bg-brand text-white"
                : "bg-surface-secondary text-text-tertiary"
            )}
            aria-label={isWatched ? "Remove from list" : "Add to list"}
          >
            {isWatched ? <Check size={14} /> : <Plus size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
