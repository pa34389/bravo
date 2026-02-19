"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search as SearchIcon,
  X,
  Clock,
  TrendingUp,
  Flame,
  ArrowRight,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { ProductTile } from "@/components/product-tile";
import { StoreBadge } from "@/components/store-badge";
import { supabase, type Special, type SpecialIntel } from "@/lib/supabase";

const QUICK_CATEGORIES = [
  { emoji: "🥛", label: "Dairy", query: "milk cheese yoghurt" },
  { emoji: "🍞", label: "Bread", query: "bread" },
  { emoji: "🥩", label: "Meat", query: "beef chicken lamb mince" },
  { emoji: "🍎", label: "Fruit", query: "apple banana orange berry" },
  { emoji: "🥤", label: "Drinks", query: "coca cola pepsi water juice" },
  { emoji: "🧹", label: "Cleaning", query: "detergent cleaning spray wipe" },
  { emoji: "🍫", label: "Snacks", query: "chips chocolate biscuit" },
  { emoji: "🧴", label: "Personal", query: "shampoo soap deodorant" },
  { emoji: "🍝", label: "Pasta", query: "pasta sauce spaghetti" },
  { emoji: "☕", label: "Coffee", query: "coffee nespresso instant" },
  { emoji: "🐶", label: "Pet Food", query: "dog cat pet food" },
  { emoji: "👶", label: "Baby", query: "nappy wipes formula baby" },
];

const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("bravo_recent_searches") || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(q: string) {
  const recent = getRecentSearches().filter((s) => s !== q);
  recent.unshift(q);
  localStorage.setItem(
    "bravo_recent_searches",
    JSON.stringify(recent.slice(0, MAX_RECENT))
  );
}

function clearRecentSearches() {
  localStorage.removeItem("bravo_recent_searches");
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Special[]>([]);
  const [intel, setIntel] = useState<SpecialIntel[]>([]);
  const [trending, setTrending] = useState<Special[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [storeFilter, setStoreFilter] = useState<"all" | "woolworths" | "coles">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());

    Promise.all([
      supabase.from("special_intel").select("*"),
      supabase
        .from("specials")
        .select("*")
        .not("discount_pct", "is", null)
        .order("discount_pct", { ascending: false })
        .limit(6),
    ]).then(([{ data: i }, { data: t }]) => {
      setIntel(i ?? []);
      setTrending(t ?? []);
    });
  }, []);

  const doSearch = useCallback(
    async (q: string, store: "all" | "woolworths" | "coles" = "all") => {
      if (q.trim().length < 2) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      setLoading(true);
      setHasSearched(true);

      let queryBuilder = supabase
        .from("specials")
        .select("*")
        .ilike("name", `%${q.trim()}%`)
        .order("discount_pct", { ascending: false, nullsFirst: false })
        .limit(60);

      if (store !== "all") {
        queryBuilder = queryBuilder.eq("store", store);
      }

      const { data } = await queryBuilder;
      setResults(data ?? []);
      setLoading(false);

      if (q.trim().length >= 2) {
        saveRecentSearch(q.trim());
        setRecentSearches(getRecentSearches());
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query, storeFilter), 300);
    return () => clearTimeout(timer);
  }, [query, storeFilter, doSearch]);

  const getIntel = (store: string, productId: string) => {
    return intel.find(
      (i) => i.store === store && i.product_id === productId
    ) ?? null;
  };

  const handleCategoryTap = (cat: (typeof QUICK_CATEGORIES)[number]) => {
    const terms = cat.query.split(" ");
    setQuery(terms[0]);
    inputRef.current?.focus();
  };

  const handleRecentTap = (q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  };

  const showDiscovery = !hasSearched && !loading;
  const resultCount = results.length;

  return (
    <div className="mx-auto max-w-lg pt-safe pb-safe">
      {/* Search header */}
      <header className="pt-14 pb-1 px-4">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">
          Search
        </h1>
      </header>

      {/* Search bar */}
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-lg px-4 pt-2 pb-3">
        <div className="relative">
          <SearchIcon
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for any product..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "w-full pl-11 pr-11 py-3.5 rounded-2xl text-[16px]",
              "bg-surface-secondary text-text-primary placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-brand/40",
              "transition-shadow"
            )}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setHasSearched(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-text-tertiary/20"
            >
              <X size={14} className="text-text-secondary" />
            </button>
          )}
        </div>

        {/* Store filter chips (visible when searching) */}
        {hasSearched && (
          <div className="flex gap-2 mt-2.5">
            {(["all", "woolworths", "coles"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStoreFilter(s)}
                className={cn(
                  "px-3 py-1 rounded-full text-[13px] font-medium transition-colors",
                  storeFilter === s
                    ? "bg-text-primary text-surface"
                    : "bg-surface-secondary text-text-secondary"
                )}
              >
                {s === "all" ? "All" : s === "woolworths" ? "Woolworths" : "Coles"}
              </button>
            ))}
            {resultCount > 0 && (
              <span className="ml-auto text-[13px] text-text-tertiary self-center tabular-nums">
                {resultCount} results
              </span>
            )}
          </div>
        )}
      </div>

      {/* Discovery state (before searching) */}
      {showDiscovery && (
        <div className="px-4">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <section className="mt-2 mb-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[15px] font-semibold flex items-center gap-1.5 text-text-secondary">
                  <Clock size={14} />
                  Recent
                </h2>
                <button
                  onClick={() => {
                    clearRecentSearches();
                    setRecentSearches([]);
                  }}
                  className="text-[13px] text-brand font-medium"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleRecentTap(q)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[13px] font-medium",
                      "bg-surface-secondary text-text-primary",
                      "transition-colors active:bg-separator"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Quick categories */}
          <section className="mb-6">
            <h2 className="text-[15px] font-semibold text-text-secondary mb-3">
              Browse by category
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => handleCategoryTap(cat)}
                  className="category-pick flex flex-col items-center gap-1 py-3 rounded-2xl bg-surface-secondary"
                >
                  <span className="text-[28px] leading-none">{cat.emoji}</span>
                  <span className="text-[11px] font-medium text-text-secondary">
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Trending */}
          {trending.length > 0 && (
            <section className="mb-20">
              <h2 className="text-[15px] font-semibold flex items-center gap-1.5 text-text-secondary mb-3">
                <TrendingUp size={14} />
                Top deals right now
              </h2>
              <div className="space-y-0 divide-y divide-separator">
                {trending.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setQuery(s.name.split(" ").slice(0, 2).join(" "))}
                    className="w-full flex items-center gap-3 py-3 text-left transition-colors active:bg-surface-secondary"
                  >
                    <span className="text-[13px] font-bold text-text-tertiary w-5 text-center tabular-nums">
                      {idx + 1}
                    </span>
                    {s.image_url ? (
                      <img
                        src={s.image_url}
                        alt={s.name}
                        className="h-10 w-10 rounded-lg object-contain bg-white dark:bg-surface-secondary shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-surface-secondary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{s.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StoreBadge store={s.store} size="sm" />
                        {s.discount_pct && (
                          <span className="text-[11px] font-bold text-price-down">
                            {s.discount_pct}% off
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[15px] font-bold tabular-nums shrink-0">
                      {formatPrice(s.current_price)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="px-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-[220px] rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {!loading && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center px-4">
          <div className="mb-3 text-4xl">🔍</div>
          <p className="text-[15px] font-medium text-text-primary mb-1">
            No specials found
          </p>
          <p className="text-[13px] text-text-tertiary max-w-[240px]">
            &ldquo;{query}&rdquo; isn&apos;t on special this week. Try a
            different search term.
          </p>
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <div className="px-4 mt-1 mb-20">
          <div className="grid grid-cols-2 gap-3">
            {results.map((s) => (
              <ProductTile
                key={s.id}
                special={s}
                intel={getIntel(s.store, s.product_id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
