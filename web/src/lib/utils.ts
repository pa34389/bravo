import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FrequencyClass, Special, SpecialIntel } from "./supabase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatDiscount(pct: number | null): string {
  if (!pct) return "";
  return `${pct}%`;
}

export type Store = "woolworths" | "coles";

export function storeDisplayName(store: Store): string {
  return store === "woolworths" ? "Woolworths" : "Coles";
}

export function frequencyLabel(fc: FrequencyClass | null): string {
  if (fc === "frequent") return "Frequent";
  if (fc === "sometimes") return "Sometimes";
  if (fc === "rare") return "Rare";
  return "";
}

export function frequencyColor(fc: FrequencyClass | null): string {
  if (fc === "frequent") return "text-price-down";
  if (fc === "sometimes") return "text-brand";
  if (fc === "rare") return "text-price-up";
  return "text-text-tertiary";
}

export function frequencyBg(fc: FrequencyClass | null): string {
  if (fc === "frequent") return "bg-green-50 dark:bg-green-950/30";
  if (fc === "sometimes") return "bg-amber-50 dark:bg-amber-950/30";
  if (fc === "rare") return "bg-red-50 dark:bg-red-950/30";
  return "bg-surface-secondary";
}

export function predictionText(
  expectedDays: number | null,
  daysSince: number | null
): string {
  if (expectedDays === null || daysSince === null) return "Hard to predict";
  if (expectedDays <= 0) return "Could be any day now";
  if (expectedDays <= 3) return `Expected back in ~${expectedDays} days`;
  if (expectedDays <= 7) return "Expected back within a week";
  if (expectedDays <= 14) return `Probably ~${expectedDays} days away`;
  return `Check back in ~${expectedDays} days`;
}

export type Verdict = "buy" | "wait" | "meh";

export interface VerdictResult {
  verdict: Verdict;
  headline: string;
  detail: string;
  saveAmount: number | null;
  storeName: string | null;
}

export function computeVerdict(
  special: Special | null,
  intel: SpecialIntel | null
): VerdictResult {
  const storeName = special
    ? storeDisplayName(special.store)
    : intel
      ? storeDisplayName(intel.store)
      : null;

  if (special) {
    const pct = special.discount_pct ?? 0;
    const save =
      special.original_price != null
        ? special.original_price - special.current_price
        : null;
    const fc = intel?.frequency_class ?? null;
    const daysSince = intel?.days_since_last_special ?? null;

    if (pct >= 40 || fc === "rare") {
      const rareNote =
        fc === "rare" && daysSince != null
          ? `Last on sale ${daysSince} days ago. Rare deal.`
          : pct >= 48
            ? "Half price — don't miss it."
            : `${pct}% off — good deal.`;
      return {
        verdict: "buy",
        headline: `Buy at ${storeName} — ${formatPrice(special.current_price)}`,
        detail: rareNote,
        saveAmount: save,
        storeName,
      };
    }

    if (pct >= 20) {
      if (fc === "frequent") {
        return {
          verdict: "meh",
          headline: `${pct}% off at ${storeName} — ${formatPrice(special.current_price)}`,
          detail: "Decent, but this goes on sale often. Bigger discounts come around.",
          saveAmount: save,
          storeName,
        };
      }
      return {
        verdict: "buy",
        headline: `Buy at ${storeName} — ${formatPrice(special.current_price)}`,
        detail: `${pct}% off. Good price.`,
        saveAmount: save,
        storeName,
      };
    }

    return {
      verdict: "meh",
      headline: `${pct}% off at ${storeName} — ${formatPrice(special.current_price)}`,
      detail: "Small discount. Might get better.",
      saveAmount: save,
      storeName,
    };
  }

  if (intel) {
    const expected = intel.expected_days_until_next;
    const avgDays = intel.avg_frequency_days;
    const daysSince = intel.days_since_last_special;
    const lastPct = intel.last_discount_pct;

    if (expected != null && expected <= 7) {
      return {
        verdict: "wait",
        headline: "Wait — sale expected soon",
        detail: `Usually every ~${avgDays ?? "??"} days. Expected back in ~${expected} days.`,
        saveAmount: null,
        storeName,
      };
    }

    if (expected != null && expected <= 14) {
      return {
        verdict: "wait",
        headline: "Hold off — couple of weeks",
        detail: `Usually on sale every ~${avgDays ?? "??"} days.${
          lastPct ? ` Last discount was ${lastPct}%.` : ""
        }`,
        saveAmount: null,
        storeName,
      };
    }

    if (daysSince != null && avgDays != null) {
      return {
        verdict: "wait",
        headline: "Not on sale right now",
        detail: `Last on sale ${daysSince} days ago. Usually every ~${avgDays} days.`,
        saveAmount: null,
        storeName,
      };
    }

    return {
      verdict: "wait",
      headline: "Not on sale right now",
      detail: intel.total_times_on_special > 0
        ? "No prediction available yet."
        : "No sale history — we just started tracking this.",
      saveAmount: null,
      storeName,
    };
  }

  return {
    verdict: "wait",
    headline: "No data yet",
    detail: "We haven't seen this item before. Watch it and we'll track it.",
    saveAmount: null,
    storeName: null,
  };
}
