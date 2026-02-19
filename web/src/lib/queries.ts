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

export type SearchResult = {
  special: Special | null;
  intel: SpecialIntel | null;
  name: string;
  store: "woolworths" | "coles";
  product_id: string;
  image_url: string | null;
};

export async function searchAll(query: string): Promise<SearchResult[]> {
  const [specialsRes, intelRes] = await Promise.all([
    supabase
      .from("specials")
      .select("*")
      .ilike("name", `%${query}%`)
      .order("discount_pct", { ascending: false })
      .limit(40),
    supabase
      .from("special_intel")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(60),
  ]);

  const specials = specialsRes.data ?? [];
  const intelItems = intelRes.data ?? [];

  const resultMap = new Map<string, SearchResult>();

  for (const s of specials) {
    const key = `${s.store}:${s.product_id}`;
    resultMap.set(key, {
      special: s,
      intel: null,
      name: s.name,
      store: s.store,
      product_id: s.product_id,
      image_url: s.image_url,
    });
  }

  for (const i of intelItems) {
    const key = `${i.store}:${i.product_id}`;
    const existing = resultMap.get(key);
    if (existing) {
      existing.intel = i;
    } else {
      resultMap.set(key, {
        special: null,
        intel: i,
        name: i.name,
        store: i.store,
        product_id: i.product_id,
        image_url: i.image_url,
      });
    }
  }

  const results = Array.from(resultMap.values());
  results.sort((a, b) => {
    if (a.special && !b.special) return -1;
    if (!a.special && b.special) return 1;
    if (a.special && b.special) {
      return (b.special.discount_pct ?? 0) - (a.special.discount_pct ?? 0);
    }
    return 0;
  });

  return results;
}

export async function getBigDeals(limit = 20): Promise<Special[]> {
  const { data } = await supabase
    .from("specials")
    .select("*")
    .not("original_price", "is", null)
    .not("discount_pct", "is", null)
    .gte("discount_pct", 30)
    .order("discount_pct", { ascending: false })
    .limit(limit);

  return (data ?? []).filter(
    (s) => s.original_price && s.original_price - s.current_price >= 3
  );
}
