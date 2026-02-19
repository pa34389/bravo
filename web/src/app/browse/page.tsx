"use client";

import { useEffect, useState, useMemo } from "react";
import { Flame, Sparkles, Tag, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryPill } from "@/components/category-pill";
import { ProductTile } from "@/components/product-tile";
import { supabase, type Special, type SpecialIntel } from "@/lib/supabase";

const PAGE_SIZE = 30;

export default function BrowsePage() {
  const [specials, setSpecials] = useState<Special[]>([]);
  const [intel, setIntel] = useState<SpecialIntel[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeStore, setActiveStore] = useState<"all" | "woolworths" | "coles">("all");
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: i }] = await Promise.all([
        supabase
          .from("specials")
          .select("*")
          .not("discount_pct", "is", null)
          .order("discount_pct", { ascending: false }),
        supabase.from("special_intel").select("*"),
      ]);
      setSpecials(s ?? []);
      setIntel(i ?? []);

      const cats = [
        ...new Set(
          (s ?? []).map((sp: Special) => sp.category).filter(Boolean) as string[]
        ),
      ].sort();
      setCategories(cats);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, activeStore]);

  const getIntel = (store: string, productId: string) => {
    return intel.find(
      (i) => i.store === store && i.product_id === productId
    ) ?? null;
  };

  const filtered = useMemo(
    () =>
      specials.filter((s) => {
        if (activeStore !== "all" && s.store !== activeStore) return false;
        if (activeCategory !== "All" && s.category !== activeCategory) return false;
        return true;
      }),
    [specials, activeStore, activeCategory]
  );

  const topDeals = filtered.slice(0, 8);
  const rareDeals = filtered
    .filter((s) => getIntel(s.store, s.product_id)?.frequency_class === "rare")
    .slice(0, 8);
  const visibleSpecials = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <div className="pt-14 space-y-4">
          <div className="skeleton h-10 w-1/3" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-[220px] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg pt-safe pb-safe">
      <header className="pt-14 pb-2 px-4">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">
          Specials
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {specials.length.toLocaleString()} deals this week
        </p>
      </header>

      {/* Store filter */}
      <div className="flex gap-2 mt-2 mb-3 px-4">
        {(["all", "woolworths", "coles"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveStore(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeStore === s
                ? "bg-text-primary text-surface"
                : "bg-surface-secondary text-text-secondary"
            )}
          >
            {s === "all" ? "All Stores" : s === "woolworths" ? "Woolworths" : "Coles"}
          </button>
        ))}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-4 no-scrollbar">
        <CategoryPill
          label="All"
          isActive={activeCategory === "All"}
          onClick={() => setActiveCategory("All")}
        />
        {categories.map((c) => (
          <CategoryPill
            key={c}
            label={c}
            isActive={activeCategory === c}
            onClick={() => setActiveCategory(c)}
          />
        ))}
      </div>

      {/* Top deals carousel */}
      {activeCategory === "All" && topDeals.length > 0 && (
        <section className="mt-5">
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-[17px] font-bold flex items-center gap-1.5">
              <Flame size={18} className="text-price-up" />
              Biggest Discounts
            </h2>
          </div>
          <div className="carousel">
            {topDeals.map((s) => (
              <ProductTile
                key={s.id}
                special={s}
                intel={getIntel(s.store, s.product_id)}
                size="carousel"
              />
            ))}
          </div>
        </section>
      )}

      {/* Rare finds carousel */}
      {activeCategory === "All" && rareDeals.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-[17px] font-bold flex items-center gap-1.5">
              <Sparkles size={18} className="text-brand" />
              Rare Finds
            </h2>
          </div>
          <p className="text-[12px] text-text-tertiary px-4 -mt-1 mb-2">
            Items that rarely go on special
          </p>
          <div className="carousel">
            {rareDeals.map((s) => (
              <ProductTile
                key={s.id}
                special={s}
                intel={getIntel(s.store, s.product_id)}
                size="carousel"
              />
            ))}
          </div>
        </section>
      )}

      {/* All specials grid */}
      <section className="mt-6 mb-20 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-bold flex items-center gap-1.5">
            <Tag size={16} className="text-text-secondary" />
            {activeCategory === "All" ? "All Specials" : activeCategory}
          </h2>
          <span className="text-[13px] text-text-tertiary tabular-nums">
            {filtered.length.toLocaleString()} items
          </span>
        </div>

        {filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {visibleSpecials.map((s) => (
                <ProductTile
                  key={s.id}
                  special={s}
                  intel={getIntel(s.store, s.product_id)}
                />
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className={cn(
                  "w-full mt-4 py-3 rounded-xl text-sm font-medium",
                  "bg-surface-secondary text-text-secondary",
                  "transition-colors active:bg-separator"
                )}
              >
                Show more ({(filtered.length - visibleCount).toLocaleString()} remaining)
              </button>
            )}
          </>
        ) : (
          <p className="py-12 text-center text-text-tertiary text-sm">
            No specials match your filters
          </p>
        )}
      </section>
    </div>
  );
}
