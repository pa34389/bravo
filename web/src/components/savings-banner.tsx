"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingDown } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useWatchlist } from "@/hooks/use-my-list";
import { supabase, type Special } from "@/lib/supabase";

export function SavingsBanner() {
  const { items: watchlistItems } = useWatchlist();
  const [specials, setSpecials] = useState<Special[]>([]);

  useEffect(() => {
    if (watchlistItems.length === 0) return;
    supabase
      .from("specials")
      .select("*")
      .then(({ data }) => setSpecials(data ?? []));
  }, [watchlistItems.length]);

  if (watchlistItems.length === 0) return null;

  const watchedOnSale = watchlistItems
    .map((w) =>
      specials.find(
        (s) => s.store === w.store && s.product_id === w.productId
      )
    )
    .filter(
      (s): s is Special =>
        s != null &&
        s.original_price != null &&
        s.original_price > s.current_price
    );

  if (watchedOnSale.length === 0) return null;

  const totalSavings = watchedOnSale.reduce(
    (sum, s) => sum + (s.original_price! - s.current_price),
    0
  );

  return (
    <Link
      href="/watching"
      className="fixed bottom-[calc(var(--nav-height)+var(--safe-bottom))] left-0 right-0 z-40"
    >
      <div className="mx-2 mb-1 flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-green-600 dark:bg-green-700 text-white shadow-lg">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingDown size={16} strokeWidth={2.5} className="flex-shrink-0" />
          <span className="text-sm font-semibold truncate">
            {formatPrice(totalSavings)} in savings
          </span>
        </div>
        <span className="text-xs font-medium opacity-80 whitespace-nowrap">
          {watchedOnSale.length} item{watchedOnSale.length !== 1 ? "s" : ""} on sale →
        </span>
      </div>
    </Link>
  );
}
