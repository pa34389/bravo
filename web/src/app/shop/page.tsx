"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, formatPrice, storeDisplayName } from "@/lib/utils";
import { useWatchlist } from "@/hooks/use-my-list";
import { supabase, type Special } from "@/lib/supabase";

interface ShopItem {
  productId: string;
  store: string;
  name: string;
  special: Special | null;
  checked: boolean;
}

export default function ShopMode() {
  const router = useRouter();
  const { items: watchlistItems } = useWatchlist();
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("specials").select("*");
      setSpecials(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const shopItems: ShopItem[] = watchlistItems
    .map((wi) => ({
      productId: wi.productId,
      store: wi.store,
      name: wi.name,
      special: specials.find(
        (s) => s.store === wi.store && s.product_id === wi.productId
      ) ?? null,
      checked: checked.has(`${wi.store}:${wi.productId}`),
    }))
    .filter((i) => i.special !== null);

  const woolies = shopItems.filter((i) => i.store === "woolworths");
  const colesItems = shopItems.filter((i) => i.store === "coles");

  const toggleCheck = (store: string, productId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      const key = `${store}:${productId}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalSavings = shopItems
    .filter((i) => i.special && i.special.original_price)
    .reduce(
      (sum, i) => sum + (i.special!.original_price! - i.special!.current_price),
      0
    );

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <div className="pt-14 space-y-4">
          <div className="skeleton h-8 w-2/5" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const renderStoreSection = (
    store: "woolworths" | "coles",
    items: ShopItem[]
  ) => (
    <section className="space-y-1">
      <div className="flex items-center gap-2 py-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            store === "woolworths" ? "bg-woolworths" : "bg-coles"
          )}
        />
        <h2 className="text-lg font-bold">{storeDisplayName(store)}</h2>
        <span className="text-sm text-text-tertiary ml-auto">
          {items.filter((i) => checked.has(`${i.store}:${i.productId}`)).length}/{items.length}
        </span>
      </div>
      {items.map((item) => {
        const key = `${item.store}:${item.productId}`;
        const isDone = checked.has(key);
        return (
          <button
            key={key}
            onClick={() => toggleCheck(item.store, item.productId)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98]",
              isDone ? "bg-surface-secondary opacity-60" : "bg-surface"
            )}
          >
            <div
              className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                isDone ? "bg-price-down" : "border-2 border-separator"
              )}
            >
              {isDone && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
            <span
              className={cn(
                "flex-1 text-left text-[15px] transition-all",
                isDone && "line-through text-text-tertiary"
              )}
            >
              {item.name}
            </span>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold tabular-nums">
                {formatPrice(item.special!.current_price)}
              </span>
              {item.special?.discount_pct && (
                <span className="block text-[11px] text-price-down font-medium">
                  {item.special.discount_pct}% off
                </span>
              )}
            </div>
          </button>
        );
      })}
      {items.length === 0 && (
        <p className="text-sm text-text-tertiary py-3 text-center">
          Nothing on special here from your list
        </p>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-safe pb-safe">
      <header className="pt-14 pb-2 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-surface-secondary"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart size={22} />
            Shop Mode
          </h1>
          {totalSavings > 0 && (
            <p className="text-sm text-price-down font-medium">
              Saving {formatPrice(totalSavings)} total
            </p>
          )}
        </div>
      </header>

      <div className="mt-4 space-y-6">
        {renderStoreSection("woolworths", woolies)}
        {renderStoreSection("coles", colesItems)}
      </div>
    </div>
  );
}
