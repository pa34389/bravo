import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FrequencyClass } from "./supabase";

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
