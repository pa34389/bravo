import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Special = {
  id: string;
  store: "woolworths" | "coles";
  product_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  current_price: number;
  original_price: number | null;
  discount_pct: number | null;
  image_url: string | null;
  product_url: string | null;
  special_type: string | null;
  valid_from: string | null;
  valid_to: string | null;
  scraped_at: string;
};

export type SpecialHistory = {
  id: string;
  store: string;
  product_id: string;
  name: string;
  current_price: number | null;
  original_price: number | null;
  discount_pct: number | null;
  first_seen: string;
  last_seen: string;
};

export type SpecialIntel = {
  id: string;
  store: "woolworths" | "coles";
  product_id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  avg_frequency_days: number | null;
  frequency_class: "frequent" | "sometimes" | "rare" | null;
  days_since_last_special: number | null;
  expected_days_until_next: number | null;
  is_on_special_now: boolean;
  last_special_date: string | null;
  last_discount_pct: number | null;
  total_times_on_special: number;
  updated_at: string;
};

export type FrequencyClass = "frequent" | "sometimes" | "rare";
