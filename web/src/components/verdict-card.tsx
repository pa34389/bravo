"use client";

import { Plus, Check, TrendingDown, Clock, Minus } from "lucide-react";
import { cn, formatPrice, computeVerdict, type Verdict } from "@/lib/utils";
import { useWatchlist } from "@/hooks/use-my-list";
import type { Special, SpecialIntel } from "@/lib/supabase";

interface VerdictCardProps {
  special: Special | null;
  intel: SpecialIntel | null;
  name: string;
  store: "woolworths" | "coles";
  productId: string;
  imageUrl: string | null;
}

const verdictConfig: Record<
  Verdict,
  { bg: string; border: string; icon: typeof TrendingDown; label: string; labelColor: string }
> = {
  buy: {
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800/50",
    icon: TrendingDown,
    label: "BUY NOW",
    labelColor: "text-green-700 dark:text-green-400",
  },
  wait: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/50",
    icon: Clock,
    label: "WAIT",
    labelColor: "text-amber-700 dark:text-amber-400",
  },
  meh: {
    bg: "bg-surface-secondary",
    border: "border-separator",
    icon: Minus,
    label: "YOUR CALL",
    labelColor: "text-text-secondary",
  },
};

export function VerdictCard({
  special,
  intel,
  name,
  store,
  productId,
  imageUrl,
}: VerdictCardProps) {
  const { hasItem, toggleItem } = useWatchlist();
  const isWatched = hasItem(store, productId);
  const result = computeVerdict(special, intel);
  const config = verdictConfig[result.verdict];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden transition-all",
        config.bg,
        config.border
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Product image */}
          <div className="flex-shrink-0 h-16 w-16 rounded-xl bg-white dark:bg-surface-raised flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="h-14 w-14 object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-xl font-medium text-text-tertiary">
                {name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Verdict badge */}
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={14} className={config.labelColor} strokeWidth={2.5} />
              <span
                className={cn(
                  "text-xs font-bold tracking-wide",
                  config.labelColor
                )}
              >
                {config.label}
              </span>
            </div>

            {/* Product name */}
            <p className="text-sm font-semibold text-text-primary leading-tight line-clamp-2">
              {name}
            </p>

            {/* Store */}
            <div className="flex items-center gap-1 mt-1">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  store === "woolworths" ? "bg-woolworths" : "bg-coles"
                )}
              />
              <span className="text-[11px] text-text-secondary">
                {store === "woolworths" ? "Woolworths" : "Coles"}
              </span>
            </div>
          </div>

          {/* Price (if on sale) */}
          {special && (
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold tabular-nums">
                {formatPrice(special.current_price)}
              </p>
              {special.original_price && (
                <p className="text-xs text-text-tertiary line-through tabular-nums">
                  {formatPrice(special.original_price)}
                </p>
              )}
              {result.saveAmount != null && result.saveAmount > 0 && (
                <p className="text-xs font-semibold text-price-down mt-0.5">
                  Save ${result.saveAmount.toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Verdict detail */}
        <p className="text-sm text-text-secondary mt-3 leading-relaxed">
          {result.detail}
        </p>

        {/* Watch button */}
        <button
          onClick={() => toggleItem({ store, productId, name })}
          className={cn(
            "mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
            isWatched
              ? "bg-brand/10 text-brand dark:bg-brand/20"
              : "bg-surface-raised dark:bg-surface-secondary text-text-primary border border-separator"
          )}
        >
          {isWatched ? (
            <>
              <Check size={16} strokeWidth={2.5} />
              Watching
            </>
          ) : (
            <>
              <Plus size={16} strokeWidth={2.5} />
              Watch this item
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function VerdictDot({
  special,
  intel,
}: {
  special: Special | null;
  intel: SpecialIntel | null;
}) {
  const result = computeVerdict(special, intel);
  const colors: Record<Verdict, string> = {
    buy: "bg-green-500",
    wait: "bg-amber-500",
    meh: "bg-text-tertiary",
  };
  return <span className={cn("h-2 w-2 rounded-full", colors[result.verdict])} />;
}

export function VerdictInline({
  special,
  intel,
}: {
  special: Special | null;
  intel: SpecialIntel | null;
}) {
  const result = computeVerdict(special, intel);
  const colors: Record<Verdict, string> = {
    buy: "text-green-700 dark:text-green-400",
    wait: "text-amber-700 dark:text-amber-400",
    meh: "text-text-secondary",
  };
  return (
    <span className={cn("text-xs font-semibold", colors[result.verdict])}>
      {result.headline}
    </span>
  );
}
