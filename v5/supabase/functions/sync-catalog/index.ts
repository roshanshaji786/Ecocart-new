// Copies the public WooCommerce catalogue from ecocart.co.in into Supabase. Read-only towards
// WordPress: it only calls the public Store API (GET). Cleaning rules match scripts/seed.py.
//
//   POST /functions/v1/sync-catalog            products + categories (at most once per 10 min)
//   POST /functions/v1/sync-catalog?images=40  also mirror up to 40 missing product images to Storage
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const STORE = "https://ecocart.co.in/wp-json/wc/store/v1";
const BUCKET = "catalog";
const FALSE_COPY = /free (shipping|delivery)|complimentary shipping|cash on delivery|\bcod\b/i;
const UA = { "User-Agent": "EcoCart-v5-sync/1.0 (+https://v5.ecocart.co.in)", Accept: "application/json" };

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };
const unescape = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => entities[n.toLowerCase()] ?? m);
const clean = (s?: string | null) => unescape(s ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
const paragraphs = (h?: string) =>
  (h ?? "").replace(/<br\s*\/?>|<\/(p|h[1-6]|li|div)>/gi, "\n").replace(/<[^>]+>/g, " ").split("\n")
    .map(clean).filter((t) => t.length > 1 && !FALSE_COPY.test(t));
const paise = (v?: string | null) => (v === undefined || v === null || v === "" ? null : parseInt(v, 10));

async function get(path: string) {
  const r = await fetch(STORE + path, { headers: UA });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return { body: await r.json(), pages: parseInt(r.headers.get("x-wp-totalpages") ?? "1", 10) };
}

type Img = { src: string; thumb: string; alt: string; mirror?: string; mirror_thumb?: string };

// deno-lint-ignore no-explicit-any
async function toRow(p: any, order: number, oldImages: Map<string, Img>) {
  const pr = p.prices;
  const rng = pr.price_range;
  // deno-lint-ignore no-explicit-any
  const attributes = (p.attributes ?? []).filter((a: any) => a.has_variations)
    // deno-lint-ignore no-explicit-any
    .map((a: any) => ({ name: clean(a.name), terms: (a.terms ?? []).map((t: any) => clean(t.name)) }));
  // deno-lint-ignore no-explicit-any
  const variations = await Promise.all((p.variations ?? []).map(async (v: any) => {
    let price = rng ? null : paise(pr.price);
    if (rng) {
      try { price = paise((await get(`/products/${v.id}`)).body.prices.price); } catch { /* keep null */ }
    }
    // deno-lint-ignore no-explicit-any
    // A 0 price means none is set in WooCommerce; the app then sends shoppers to ask instead.
    return { id: v.id, attrs: Object.fromEntries(v.attributes.map((a: any) => [clean(a.name), clean(a.value)])), price: price || null };
  }));
  const desc = paragraphs(p.description);
  // deno-lint-ignore no-explicit-any
  const images: Img[] = (p.images ?? []).map((i: any) => {
    const old = oldImages.get(i.src);
    return { src: i.src, thumb: i.thumbnail || i.src, alt: clean(i.alt || p.name),
      ...(old?.mirror ? { mirror: old.mirror, mirror_thumb: old.mirror_thumb } : {}) };
  });
  return {
    id: p.id, slug: p.slug, name: clean(p.name), type: p.type,
    summary: (paragraphs(p.short_description).join(" ") || desc[0] || "").slice(0, 400),
    description: desc.join("\n\n"),
    price: paise(rng ? rng.min_amount : pr.price), regular_price: paise(pr.regular_price),
    price_max: rng && rng.max_amount !== rng.min_amount ? paise(rng.max_amount) : null,
    on_sale: !!p.on_sale, in_stock: !!p.is_in_stock, listed: true,
    // deno-lint-ignore no-explicit-any
    images, category_ids: (p.categories ?? []).map((c: any) => c.id),
    attributes, variations, permalink: p.permalink, menu_order: order, synced_at: new Date().toISOString(),
  };
}

async function syncCatalog() {
  const cats = (await get("/products/categories?per_page=100")).body;
  // deno-lint-ignore no-explicit-any
  const catRows = cats.map((c: any) => ({ id: c.id, name: clean(c.name), slug: c.slug, parent: c.parent, count: c.count, updated_at: new Date().toISOString() }));
  { const { error } = await db.from("categories").upsert(catRows); if (error) throw error; }

  // deno-lint-ignore no-explicit-any
  const raw: any[] = [];
  const first = await get("/products?per_page=100&page=1");
  raw.push(...first.body);
  for (let pg = 2; pg <= first.pages; pg++) raw.push(...(await get(`/products?per_page=100&page=${pg}`)).body);

  const { data: existing } = await db.from("products").select("id, images");
  const oldImages = new Map<string, Img>();
  for (const e of existing ?? []) for (const i of (e.images as Img[])) oldImages.set(i.src, i);

  const rows = [];
  for (let i = 0; i < raw.length; i++) rows.push(await toRow(raw[i], i, oldImages));
  { const { error } = await db.from("products").upsert(rows); if (error) throw error; }

  // Products no longer in the store stay in the table (eco cards keep their history) but are hidden.
  const live = new Set(rows.map((r) => r.id));
  const gone = (existing ?? []).map((e) => e.id).filter((id) => !live.has(id));
  if (gone.length) await db.from("products").update({ listed: false }).in("id", gone);
  return rows.length;
}

async function mirrorImages(limit: number) {
  const { data } = await db.from("products").select("id, images").eq("listed", true).order("menu_order");
  let done = 0;
  for (const p of data ?? []) {
    const images = p.images as Img[];
    let changed = false;
    for (const img of images) {
      if (img.mirror || done >= limit) continue;
      const put = async (url: string, name: string) => {
        const r = await fetch(url, { headers: { "User-Agent": UA["User-Agent"] } });
        if (!r.ok) throw new Error(`${url} → ${r.status}`);
        const path = `p/${p.id}/${name}`;
        const { error } = await db.storage.from(BUCKET).upload(path, await r.arrayBuffer(), {
          contentType: r.headers.get("content-type") ?? "image/jpeg", upsert: true, cacheControl: "2592000" });
        if (error) throw error;
        return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      };
      try {
        const base = img.src.split("/").pop()!;
        img.mirror = await put(img.src, base);
        img.mirror_thumb = img.thumb === img.src ? img.mirror : await put(img.thumb, "thumb-" + img.thumb.split("/").pop()!);
        changed = true;
        done++;
      } catch (e) {
        console.error("image", p.id, String(e));
        done++; // count failures so one bad image can't loop forever
      }
    }
    if (changed) await db.from("products").update({ images }).eq("id", p.id);
    if (done >= limit) break;
  }
  return done;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const imageLimit = Math.min(parseInt(url.searchParams.get("images") ?? "0", 10) || 0, 80);
  const { data: last } = await db.from("sync_runs").select("ran_at").eq("ok", true).gt("products", 0)
    .order("ran_at", { ascending: false }).limit(1);
  const recent = last?.[0] && Date.now() - new Date(last[0].ran_at).getTime() < 10 * 60_000;

  let products = 0, images = 0, message = "";
  let ok = true;
  try {
    if (!recent) products = await syncCatalog();
    else message = "catalogue synced under 10 min ago; skipped. ";
    if (imageLimit) images = await mirrorImages(imageLimit);
  } catch (e) {
    ok = false;
    message += String(e instanceof Error ? e.message : JSON.stringify(e));
  }
  if (products || images || !ok) await db.from("sync_runs").insert({ ok, products, images, message });
  return new Response(JSON.stringify({ ok, products, images, message }), {
    status: ok ? 200 : 502, headers: { "Content-Type": "application/json" } });
});
