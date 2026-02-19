"use client";

import { cn, formatPrice, storeDisplayName } from "@/lib/utils";
import type { Special } from "@/lib/supabase";

interface SavingsTickerProps {
  watchedOnSale: Special[];
}

export function SavingsTicker({ watchedOnSale }: SavingsTickerProps) {
  const validItems = watchedOnSale.filter(
    (s) => s.original_price != null && s.original_price > s.current_price
  );

  const totalSavings = validItems.reduce(
    (sum, s) => sum + (s.original_price! - s.current_price),
    0
  );

  if (validItems.length === 0) return null;

  return (
    <div className="rounded-2xl bg-green-50 dark:bg-green-950/25 border border-green-200 dark:border-green-800/40 p-4">
      <div className="text-center mb-3">
        <p className="text-3xl font-bold text-green-700 dark:text-green-400 tabular-nums">
          {formatPrice(totalSavings)}
        </p>
        <p className="text-sm text-green-700/70 dark:text-green-400/70 mt-0.5">
          in savings on {validItems.length} item{validItems.length !== 1 ? "s" : ""} right now
        </p>
      </div>

      <div className="space-y-2">
        {validItems.map((s) => {
          const save = s.original_price! - s.current_price;
          return (
            <div
              key={`${s.store}:${s.product_id}`}
              className="flex items-center gap-2.5"
            >
              <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-white dark:bg-surface-raised flex items-center justify-center overflow-hidden">
                {s.image_url ? (
                  <img
                    src={s.image_url}
                    alt=""
                    className="h-7 w-7 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs font-medium text-text-tertiary">
                    {s.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {s.name}
                </p>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      s.store === "woolworths" ? "bg-woolworths" : "bg-coles"
                    )}
                  />
                  <span className="text-[10px] text-text-secondary">
                    {storeDisplayName(s.store)}
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">
                Save {formatPrice(save)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
