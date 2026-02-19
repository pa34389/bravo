"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, ChevronRight } from "lucide-react";
import { cn, formatPrice, storeDisplayName, predictionText } from "@/lib/utils";
import { SaleSignal } from "@/components/sale-signal";
import { StoreBadge } from "@/components/store-badge";
import { useWatchlist } from "@/hooks/use-my-list";
import { supabase, type Special, type SpecialIntel } from "@/lib/supabase";

export default function MyListPage() {
  const router = useRouter();
  const { items: watchlistItems, removeItem } = useWatchlist();
  const [specials, setSpecials] = useState<Special[]>([]);
  const [intel, setIntel] = useState<SpecialIntel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: allSpecials } = await supabase.from("specials").select("*");
      const { data: allIntel } = await supabase.from("special_intel").select("*");
      setSpecials(allSpecials ?? []);
      setIntel(allIntel ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const enriched = watchlistItems.map((wi) => {
    const special = specials.find(
      (s) => s.store === wi.store && s.product_id === wi.productId
    );
    const intelRow = intel.find(
      (i) => i.store === wi.store && i.product_id === wi.productId
    );
    return { ...wi, special, intel: intelRow };
  });

  const onSpecial = enriched.filter((e) => e.special);
  const waiting = enriched
    .filter((e) => !e.special)
    .sort((a, b) => {
      const aExp = a.intel?.expected_days_until_next ?? 999;
      const bExp = b.intel?.expected_days_until_next ?? 999;
      return aExp - bExp;
    });

  const onSpecialCount = onSpecial.length;

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <div className="pt-14 space-y-4">
          <div className="skeleton h-10 w-1/3" />
          <div className="skeleton h-12 w-full rounded-xl" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton h-12 w-12 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-safe pb-safe">
      <header className="pt-14 pb-2">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">
          My List
        </h1>
        {watchlistItems.length > 0 && (
          <p className="text-sm text-text-secondary mt-0.5">
            {onSpecialCount > 0
              ? `${onSpecialCount} on special today`
              : "Nothing on special right now"}
          </p>
        )}
      </header>

      {watchlistItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 rounded-full bg-surface-secondary p-5">
            <Star size={32} className="text-text-tertiary" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No items yet</h2>
          <p className="text-sm text-text-secondary max-w-[260px] mb-4">
            Browse specials and add items you want to keep an eye on
          </p>
          <button
            onClick={() => router.push("/browse")}
            className="px-5 py-2.5 bg-text-primary text-surface rounded-xl text-sm font-medium"
          >
            Browse specials
          </button>
        </div>
      ) : (
        <div className="space-y-2 mt-2">
          {/* Shop banner */}
          {onSpecialCount > 0 && (
            <button
              onClick={() => router.push("/shop")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-brand-light text-brand-dark font-medium text-sm transition-transform active:scale-[0.98]"
            >
              <span>Start shopping — {onSpecialCount} item{onSpecialCount > 1 ? "s" : ""} on special</span>
              <ChevronRight size={18} />
            </button>
          )}

          {/* On special now */}
          {onSpecial.length > 0 && (
            <div className="pt-2">
              {onSpecial.map((item) => (
                <div
                  key={`${item.store}-${item.productId}`}
                  className="flex items-center gap-3 py-3 border-b border-separator last:border-0"
                >
                  <div className="relative shrink-0">
                    {item.special?.image_url ? (
                      <img
                        src={item.special.image_url}
                        alt={item.name}
                        className="h-14 w-14 rounded-xl object-contain bg-white dark:bg-surface-secondary p-1"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-surface-secondary flex items-center justify-center text-text-tertiary text-sm font-medium">
                        {item.name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-price-down border-2 border-surface" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold truncate">
                      {item.name}
                    </span>
                    <span className="block text-xs text-price-down font-medium">
                      {item.special?.discount_pct}% off at {storeDisplayName(item.store as "woolworths" | "coles")}
                    </span>
                    <SaleSignal intel={item.intel} layout="inline" />
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-base font-bold tabular-nums">
                      {formatPrice(item.special!.current_price)}
                    </span>
                    {item.special?.original_price && (
                      <span className="block text-xs text-text-tertiary line-through tabular-nums">
                        {formatPrice(item.special.original_price)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Waiting */}
          {waiting.length > 0 && (
            <div className="pt-2">
              {onSpecial.length > 0 && (
                <div className="h-px bg-separator my-2" />
              )}
              {waiting.map((item) => (
                <div
                  key={`${item.store}-${item.productId}`}
                  className="flex items-center gap-3 py-3 border-b border-separator last:border-0"
                >
                  <div className="shrink-0">
                    {item.intel?.image_url ? (
                      <img
                        src={item.intel.image_url}
                        alt={item.name}
                        className="h-14 w-14 rounded-xl object-contain bg-white dark:bg-surface-secondary p-1 opacity-60"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-surface-secondary flex items-center justify-center text-text-tertiary text-sm font-medium">
                        {item.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="block text-[15px] text-text-primary truncate">
                      {item.name}
                    </span>
                    <span className="block text-xs text-text-tertiary">
                      {predictionText(
                        item.intel?.expected_days_until_next ?? null,
                        item.intel?.days_since_last_special ?? null
                      )}
                    </span>
                    <SaleSignal intel={item.intel} layout="inline" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
