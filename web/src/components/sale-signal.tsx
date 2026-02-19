"use client";

import { cn } from "@/lib/utils";
import type { SpecialIntel } from "@/lib/supabase";

interface SaleSignalProps {
  intel: SpecialIntel | null | undefined;
  layout?: "compact" | "inline";
}

/**
 * Visual indicator for sale frequency and history.
 *
 * Three dots (like a traffic light) show at-a-glance frequency:
 *   ●●● Frequent (green) — "On sale often"
 *   ●●○ Sometimes (amber) — "On sale sometimes"
 *   ●○○ Rare (red)        — "Rarely on sale"
 *   ○○○ No history (gray)  — "Just spotted"
 *
 * Compact layout: dots + short label (for grid tiles)
 * Inline layout:  dots + label + detail text (for list cards)
 */
export function SaleSignal({ intel, layout = "compact" }: SaleSignalProps) {
  const fc = intel?.frequency_class ?? null;
  const totalTimes = intel?.total_times_on_special ?? 0;
  const avgDays = intel?.avg_frequency_days ?? null;
  const isNew = !fc && totalTimes <= 1;

  const filled = fc === "frequent" ? 3 : fc === "sometimes" ? 2 : fc === "rare" ? 1 : 0;
  const dotColor =
    fc === "frequent"
      ? "bg-price-down"
      : fc === "sometimes"
        ? "bg-brand"
        : fc === "rare"
          ? "bg-price-up"
          : "bg-text-tertiary/30";

  const label = isNew
    ? "Just spotted"
    : fc === "frequent"
      ? "On sale often"
      : fc === "sometimes"
        ? "Sometimes on sale"
        : fc === "rare"
          ? "Rarely on sale"
          : "Just spotted";

  const detail =
    !isNew && avgDays
      ? `Every ~${avgDays}d`
      : isNew
        ? "No sale history yet"
        : null;

  if (layout === "compact") {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <div className="flex items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-[5px] w-[5px] rounded-full transition-colors",
                i < filled ? dotColor : "bg-text-tertiary/15 dark:bg-text-tertiary/25"
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold leading-none",
            fc === "rare"
              ? "text-price-up"
              : fc === "frequent"
                ? "text-price-down"
                : fc === "sometimes"
                  ? "text-brand-dark dark:text-brand"
                  : "text-text-tertiary"
          )}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              i < filled ? dotColor : "bg-text-tertiary/15 dark:bg-text-tertiary/25"
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "text-[11px] font-semibold",
          fc === "rare"
            ? "text-price-up"
            : fc === "frequent"
              ? "text-price-down"
              : fc === "sometimes"
                ? "text-brand-dark dark:text-brand"
                : "text-text-tertiary"
        )}
      >
        {label}
      </span>
      {detail && (
        <span className="text-[11px] text-text-tertiary">{detail}</span>
      )}
    </div>
  );
}
