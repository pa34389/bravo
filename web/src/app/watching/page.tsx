"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, formatPrice, computeVerdict, storeDisplayName, predictionText } from "@/lib/utils";
import { VerdictDot, VerdictCard } from "@/components/verdict-card";
import { SwipeToRemove } from "@/components/swipe-to-remove";
import { UndoToast } from "@/components/undo-toast";
import { useWatchlist, type WatchlistItem } from "@/hooks/use-my-list";
import { supabase, type Special, type SpecialIntel } from "@/lib/supabase";

export default function WatchingPage() {
  const { items: watchlistItems, removeItem, addItem } = useWatchlist();
  const [specials, setSpecials] = useState<Special[]>([]);
  const [intel, setIntel] = useState<SpecialIntel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [removedItem, setRemovedItem] = useState<WatchlistItem | null>(null);

  useEffect(() => {
    async function load() {
      const [specialsRes, intelRes] = await Promise.all([
        supabase.from("specials").select("*"),
        supabase.from("special_intel").select("*"),
      ]);
      setSpecials(specialsRes.data ?? []);
      setIntel(intelRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const getSpecial = (store: string, productId: string) =>
    specials.find((s) => s.store === store && s.product_id === productId) ?? null;

  const getIntel = (store: string, productId: string) =>
    intel.find((i) => i.store === store && i.product_id === productId) ?? null;

  const handleRemove = useCallback(
    (w: WatchlistItem) => {
      setRemovedItem({ ...w });
      removeItem(w.store, w.productId);
    },
    [removeItem]
  );

  const handleUndo = useCallback(
    (item: WatchlistItem) => {
      addItem({ store: item.store, productId: item.productId, name: item.name });
    },
    [addItem]
  );

  const handleDismissToast = useCallback(() => {
    setRemovedItem(null);
  }, []);

  const enriched = watchlistItems.map((w) => ({
    ...w,
    special: getSpecial(w.store, w.productId),
    intel: getIntel(w.store, w.productId),
  }));

  const onSale = enriched.filter((w) => w.special);
  const waiting = enriched.filter((w) => !w.special);

  if (loading) {
    return (
      <div className="px-4 pt-14 pb-4 space-y-3">
        <div className="skeleton h-8 w-40" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 pt-safe">
      <div className="pt-10 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Tracking</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {watchlistItems.length} item{watchlistItems.length !== 1 ? "s" : ""} tracked
        </p>
      </div>

      {watchlistItems.length === 0 && (
        <div className="rounded-2xl bg-surface-raised border border-separator/60 p-6 text-center mt-4">
          <p className="text-lg font-semibold text-text-primary mb-1">
            Nothing tracked yet
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            Go to Home and search for products you buy — dishwasher tablets, laundry detergent, coffee.
            Add them here and we&apos;ll tell you when to buy.
          </p>
        </div>
      )}

      {/* Swipe hint */}
      {watchlistItems.length > 0 && (
        <p className="text-[11px] text-text-tertiary mb-3">
          Swipe left on any item to remove
        </p>
      )}

      {/* On sale section */}
      {onSale.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">
            On sale now ({onSale.length})
          </h2>
          <div className="space-y-2">
            {onSale.map((w) => {
              const key = `${w.store}:${w.productId}`;
              const isExpanded = expandedItem === key;
              const verdict = computeVerdict(w.special, w.intel);

              return (
                <div key={key}>
                  <SwipeToRemove onRemove={() => handleRemove(w)}>
                    <button
                      onClick={() => setExpandedItem(isExpanded ? null : key)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-950/25 border border-green-200 dark:border-green-800/40 text-left transition-all"
                    >
                      <VerdictDot special={w.special} intel={w.intel} />
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-white dark:bg-surface-raised flex items-center justify-center overflow-hidden">
                        {w.special?.image_url ? (
                          <img src={w.special.image_url} alt="" className="h-9 w-9 object-contain" loading="lazy" />
                        ) : (
                          <span className="text-sm text-text-tertiary">{w.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{w.name}</p>
                        <span className="text-xs text-green-700 dark:text-green-400 font-semibold">
                          {verdict.headline}
                        </span>
                      </div>
                      {w.special && (
                        <span className="text-sm font-bold tabular-nums">
                          {formatPrice(w.special.current_price)}
                        </span>
                      )}
                    </button>
                  </SwipeToRemove>

                  {isExpanded && w.special && (
                    <div className="mt-2 mb-1">
                      <VerdictCard
                        special={w.special}
                        intel={w.intel}
                        name={w.name}
                        store={w.store}
                        productId={w.productId}
                        imageUrl={w.special?.image_url ?? w.intel?.image_url ?? null}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Waiting section */}
      {waiting.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
            Waiting for a deal ({waiting.length})
          </h2>
          <div className="space-y-1.5">
            {waiting.map((w) => {
              const expected = w.intel?.expected_days_until_next ?? null;
              const daysSince = w.intel?.days_since_last_special ?? null;

              return (
                <SwipeToRemove
                  key={`${w.store}:${w.productId}`}
                  onRemove={() => handleRemove(w)}
                >
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-raised border border-separator/40">
                    <VerdictDot special={null} intel={w.intel} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {w.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={cn(
                            "h-1 w-1 rounded-full",
                            w.store === "woolworths" ? "bg-woolworths" : "bg-coles"
                          )}
                        />
                        <span className="text-[10px] text-text-secondary">
                          {storeDisplayName(w.store)}
                        </span>
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                          {predictionText(expected, daysSince)}
                        </span>
                      </div>
                    </div>
                  </div>
                </SwipeToRemove>
              );
            })}
          </div>
        </div>
      )}

      <UndoToast
        item={removedItem}
        onUndo={handleUndo}
        onDismiss={handleDismissToast}
      />
    </div>
  );
}
