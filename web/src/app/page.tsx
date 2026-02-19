"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search as SearchIcon, X, ChevronRight } from "lucide-react";
import { cn, formatPrice, computeVerdict, storeDisplayName, predictionText } from "@/lib/utils";
import { VerdictCard, VerdictDot } from "@/components/verdict-card";
import { ProductTile } from "@/components/product-tile";
import { useWatchlist } from "@/hooks/use-my-list";
import {
  supabase,
  type Special,
  type SpecialIntel,
} from "@/lib/supabase";
import { searchAll, getBigDeals, type SearchResult } from "@/lib/queries";

const ONBOARDING_CATEGORIES = [
  { emoji: "🧴", label: "Dishwasher tablets", search: "dishwasher" },
  { emoji: "🧺", label: "Laundry detergent", search: "laundry" },
  { emoji: "☕", label: "Coffee", search: "coffee" },
  { emoji: "🥤", label: "Soft drink", search: "coca cola pepsi" },
  { emoji: "🧻", label: "Toilet paper", search: "toilet paper" },
  { emoji: "🧹", label: "Cleaning", search: "cleaning spray" },
  { emoji: "🐕", label: "Pet food", search: "dog food cat food" },
  { emoji: "👶", label: "Nappies", search: "nappies" },
  { emoji: "🪥", label: "Toothpaste", search: "toothpaste" },
  { emoji: "🧴", label: "Shampoo", search: "shampoo" },
  { emoji: "🗑️", label: "Bin bags", search: "bin bags" },
  { emoji: "🧽", label: "Paper towels", search: "paper towel" },
];

export default function HomePage() {
  const { items: watchlistItems } = useWatchlist();
  const [specials, setSpecials] = useState<Special[]>([]);
  const [intel, setIntel] = useState<SpecialIntel[]>([]);
  const [bigDeals, setBigDeals] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    async function load() {
      const [specialsRes, intelRes, deals] = await Promise.all([
        supabase
          .from("specials")
          .select("*")
          .order("discount_pct", { ascending: false }),
        supabase.from("special_intel").select("*"),
        getBigDeals(30),
      ]);
      setSpecials(specialsRes.data ?? []);
      setIntel(intelRes.data ?? []);
      setBigDeals(deals);
      setLoading(false);
    }
    load();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    const results = await searchAll(q.trim());
    setSearchResults(results);
    setHasSearched(true);
    setSearching(false);
    setExpandedResult(null);
  }, []);

  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch]
  );

  const clearSearch = () => {
    setQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setExpandedResult(null);
    inputRef.current?.blur();
  };

  const getSpecialForWatchItem = (store: string, productId: string) =>
    specials.find((s) => s.store === store && s.product_id === productId) ?? null;

  const getIntelForItem = (store: string, productId: string) =>
    intel.find((i) => i.store === store && i.product_id === productId) ?? null;

  const watchedOnSale = watchlistItems
    .map((w) => getSpecialForWatchItem(w.store, w.productId))
    .filter((s): s is Special => s !== null);

  const watchedWaiting = watchlistItems.filter(
    (w) => !getSpecialForWatchItem(w.store, w.productId)
  );

  const isSearchActive = query.length > 0;

  if (loading) {
    return (
      <div className="px-4 pt-14 pb-4 space-y-4">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-12 w-full rounded-2xl" />
        <div className="skeleton h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-safe">
      {/* Header */}
      <div className="pt-10 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Bravo</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Should I buy this now?
        </p>
      </div>

      {/* Search bar */}
      <div className="sticky top-0 z-30 pb-3 bg-surface">
        <div className="relative">
          <SearchIcon
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search any product..."
            className={cn(
              "w-full pl-10 pr-10 py-3 rounded-2xl text-base",
              "bg-surface-secondary border border-separator/60",
              "text-text-primary placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/50",
              "transition-all"
            )}
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-tertiary"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search results overlay */}
      {isSearchActive && (
        <div className="pb-8">
          {searching && (
            <div className="py-8 text-center text-sm text-text-secondary">
              Searching...
            </div>
          )}

          {hasSearched && searchResults.length === 0 && !searching && (
            <div className="py-8 text-center">
              <p className="text-text-secondary">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-sm text-text-tertiary mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((r) => {
                const key = `${r.store}:${r.product_id}`;
                const isExpanded = expandedResult === key;

                return (
                  <div key={key}>
                    {/* Compact row */}
                    <button
                      onClick={() =>
                        setExpandedResult(isExpanded ? null : key)
                      }
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                        "bg-surface-raised border border-separator/40",
                        isExpanded && "border-brand/30"
                      )}
                    >
                      <VerdictDot special={r.special} intel={r.intel} />
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-white dark:bg-surface-secondary flex items-center justify-center overflow-hidden">
                        {r.image_url ? (
                          <img
                            src={r.image_url}
                            alt=""
                            className="h-9 w-9 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-sm text-text-tertiary">
                            {r.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {r.name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className={cn(
                              "h-1 w-1 rounded-full",
                              r.store === "woolworths"
                                ? "bg-woolworths"
                                : "bg-coles"
                            )}
                          />
                          <span className="text-[10px] text-text-secondary">
                            {storeDisplayName(r.store)}
                          </span>
                          <span className="text-[10px] text-text-tertiary ml-1">
                            {computeVerdict(r.special, r.intel).headline}
                          </span>
                        </div>
                      </div>
                      {r.special && (
                        <span className="text-sm font-bold tabular-nums">
                          {formatPrice(r.special.current_price)}
                        </span>
                      )}
                      <ChevronRight
                        size={14}
                        className={cn(
                          "text-text-tertiary transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </button>

                    {/* Expanded verdict */}
                    {isExpanded && (
                      <div className="mt-2 mb-1">
                        <VerdictCard
                          special={r.special}
                          intel={r.intel}
                          name={r.name}
                          store={r.store}
                          productId={r.product_id}
                          imageUrl={r.image_url}
                          onSearchRequest={(q) => {
                            onQueryChange(q);
                            inputRef.current?.focus();
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Category scroll strip — always visible (Uber Eats pattern) */}
      {!isSearchActive && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-4">
          {ONBOARDING_CATEGORIES.map((cat) => (
            <button
              key={cat.search}
              onClick={() => {
                onQueryChange(cat.search);
                inputRef.current?.focus();
              }}
              className="category-pick flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-raised border border-separator/40 whitespace-nowrap flex-shrink-0"
            >
              <span className="text-base">{cat.emoji}</span>
              <span className="text-xs font-medium text-text-secondary">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Home content (hidden when searching) */}
      {!isSearchActive && (
        <div className="space-y-6 pb-8">
          {/* Onboarding nudge — only for empty watchlist */}
          {watchlistItems.length === 0 && (
            <div className="rounded-2xl bg-surface-raised border border-separator/60 p-5 text-center">
              <p className="text-lg font-semibold text-text-primary mb-1">
                Track the expensive stuff
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                Search for products you buy regularly — dishwasher tablets,
                coffee, laundry detergent. We&apos;ll tell you when to buy.
              </p>
            </div>
          )}

          {/* Tracking status — items waiting, none on sale */}
          {watchedWaiting.length > 0 && watchedOnSale.length === 0 && (
            <div className="rounded-2xl bg-surface-raised border border-separator/60 p-4">
              <p className="text-sm font-semibold text-text-primary mb-1">
                Tracking {watchlistItems.length} item{watchlistItems.length !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-text-secondary">
                None on sale right now. We&apos;ll surface them when they drop.
              </p>
            </div>
          )}

          {/* Tracked items waiting (if some are on sale, show waiting below) */}
          {watchedOnSale.length > 0 && watchedWaiting.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
                Waiting for a deal
              </h2>
              <div className="space-y-1.5">
                {watchedWaiting.slice(0, 5).map((w) => {
                  const itemIntel = getIntelForItem(w.store, w.productId);
                  const expected = itemIntel?.expected_days_until_next ?? null;
                  const daysSince = itemIntel?.days_since_last_special ?? null;

                  return (
                    <div
                      key={`${w.store}:${w.productId}`}
                      className="flex items-center gap-3 py-2 px-3 rounded-xl bg-surface-raised border border-separator/40"
                    >
                      <VerdictDot special={null} intel={itemIntel} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {w.name}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {predictionText(expected, daysSince)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          w.store === "woolworths" ? "bg-woolworths" : "bg-coles"
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Big deals feed */}
          {bigDeals.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-text-primary mb-3">
                Big deals right now
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {bigDeals.slice(0, 12).map((s) => (
                  <ProductTile
                    key={`${s.store}:${s.product_id}`}
                    special={s}
                    intel={getIntelForItem(s.store, s.product_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
