"use client";

import { Plus, Check } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useWatchlist } from "@/hooks/use-my-list";
import { SaleSignal } from "./sale-signal";
import type { Special, SpecialIntel } from "@/lib/supabase";

interface ProductTileProps {
  special: Special;
  intel?: SpecialIntel | null;
  size?: "default" | "carousel";
}

export function ProductTile({ special, intel, size = "default" }: ProductTileProps) {
  const { hasItem, toggleItem } = useWatchlist();
  const isWatched = hasItem(special.store, special.product_id);
  const isHalfPrice = special.discount_pct && special.discount_pct >= 48;
  const saveAmount =
    special.original_price && special.current_price
      ? (special.original_price - special.current_price).toFixed(2)
      : null;

  return (
    <div
      className={cn(
        "relative bg-surface-raised rounded-2xl overflow-hidden",
        "border border-separator/60",
        "transition-transform active:scale-[0.97]",
        size === "carousel" ? "w-[156px]" : "w-full"
      )}
    >
      {/* Badge overlay */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {isHalfPrice ? (
          <span className="badge-half-price">½ PRICE</span>
        ) : special.discount_pct ? (
          <span className="badge-save">{special.discount_pct}% OFF</span>
        ) : null}
      </div>

      {/* Add/watch button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleItem({
            store: special.store,
            productId: special.product_id,
            name: special.name,
          });
        }}
        className={cn(
          "absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all",
          "shadow-sm",
          isWatched
            ? "bg-brand text-white"
            : "bg-white/90 dark:bg-surface-secondary/90 text-text-secondary backdrop-blur-sm"
        )}
        aria-label={isWatched ? "Remove from list" : "Add to list"}
      >
        {isWatched ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={2.5} />}
      </button>

      {/* Product image */}
      <div className="flex items-center justify-center bg-white dark:bg-surface-secondary pt-3 pb-1 px-3">
        {special.image_url ? (
          <img
            src={special.image_url}
            alt={special.name}
            className="h-[100px] w-[100px] object-contain mix-blend-multiply"
            loading="lazy"
          />
        ) : (
          <div className="h-[100px] w-[100px] flex items-center justify-center text-text-tertiary text-2xl font-medium">
            {special.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="px-2.5 pb-2.5 pt-1.5">
        {/* Store indicator */}
        <div className="flex items-center gap-1 mb-0.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              special.store === "woolworths" ? "bg-woolworths" : "bg-coles"
            )}
          />
          <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wide">
            {special.store === "woolworths" ? "Woolworths" : "Coles"}
          </span>
        </div>

        {/* Name */}
        <p className="text-[13px] font-medium leading-tight text-text-primary line-clamp-2 min-h-[32px]">
          {special.name}
        </p>

        {/* Pricing */}
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-[18px] font-bold tabular-nums leading-none">
            {formatPrice(special.current_price)}
          </span>
          {special.original_price && (
            <span className="text-[12px] text-text-tertiary line-through tabular-nums">
              {formatPrice(special.original_price)}
            </span>
          )}
        </div>

        {/* Save amount */}
        {saveAmount && (
          <p className="text-[11px] font-semibold text-price-down mt-0.5">
            Save ${saveAmount}
          </p>
        )}

        {/* Sale frequency signal */}
        <SaleSignal intel={intel} layout="compact" />
      </div>
    </div>
  );
}
