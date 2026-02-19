import { supabase, type Special, type SpecialIntel } from "./supabase";

export async function getCurrentSpecials(
  store?: string,
  category?: string
): Promise<Special[]> {
  let query = supabase
    .from("specials")
    .select("*")
    .order("discount_pct", { ascending: false, nullsFirst: false });

  if (store && store !== "all") query = query.eq("store", store);
  if (category && category !== "All") query = query.eq("category", category);

  const { data } = await query;
  return data ?? [];
}

export async function getTopDiscounts(limit = 10): Promise<Special[]> {
  const { data } = await supabase
    .from("specials")
    .select("*")
    .not("discount_pct", "is", null)
    .order("discount_pct", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRareDeals(limit = 10): Promise<Special[]> {
  const { data: intel } = await supabase
    .from("special_intel")
    .select("store, product_id")
    .eq("is_on_special_now", true)
    .eq("frequency_class", "rare");

  if (!intel || intel.length === 0) return [];

  const keys = intel.map((i) => `${i.store}:${i.product_id}`);

  const { data } = await supabase
    .from("specials")
    .select("*")
    .order("discount_pct", { ascending: false });

  if (!data) return [];
  return data
    .filter((s) => keys.includes(`${s.store}:${s.product_id}`))
    .slice(0, limit);
}

export async function getSpecialIntel(
  store: string,
  productId: string
): Promise<SpecialIntel | null> {
  const { data } = await supabase
    .from("special_intel")
    .select("*")
    .eq("store", store)
    .eq("product_id", productId)
    .single();
  return data;
}

export async function getIntelForProducts(
  keys: { store: string; productId: string }[]
): Promise<SpecialIntel[]> {
  if (keys.length === 0) return [];

  const { data } = await supabase.from("special_intel").select("*");
  if (!data) return [];

  const keySet = new Set(keys.map((k) => `${k.store}:${k.productId}`));
  return data.filter((d) => keySet.has(`${d.store}:${d.product_id}`));
}

export async function getCategories(): Promise<string[]> {
  const { data } = await supabase
    .from("specials")
    .select("category")
    .not("category", "is", null);

  if (!data) return [];
  return [...new Set(data.map((d) => d.category).filter(Boolean) as string[])].sort();
}

export async function searchSpecials(query: string): Promise<Special[]> {
  const { data } = await supabase
    .from("specials")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("discount_pct", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getLastScrapeTime(): Promise<string | null> {
  const { data } = await supabase
    .from("specials")
    .select("valid_from")
    .order("valid_from", { ascending: false })
    .limit(1);
  return data?.[0]?.valid_from ?? null;
}
