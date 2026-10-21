# EcoCart v5

A fast, phone-first version of [ecocart.co.in](https://ecocart.co.in) where every product can carry a checked **eco card** (material, origin, maker, packaging, plastic-free, handmade…). Built on React + Supabase + Vercel from Roshan's RSV master prompt.

- **Live:** https://v5.ecocart.co.in (once the DNS record is added) · Supabase project `ecocart-v5` (`fckeyyrdzlrreidttimo`, Mumbai) · Vercel project `ecocart-v5`
- **The WordPress store stays the source of truth.** Products, prices and stock are copied read-only from its public Store API. Checkout still happens on ecocart.co.in (WooCommerce + Razorpay). Nothing here writes to WordPress.

## What's where

| Path | What |
|---|---|
| `src/App.tsx` | Shell: top bar, bottom tabs, hash router (`#/shop/<category>`, `#/p/<slug>`, `#/cart`, `#/impact`, `#/account`, `#/admin`) |
| `src/views/` | One file per screen. `Admin.tsx` is lazy-loaded |
| `src/lib/store.ts` | zustand store: catalogue, eco cards, cart (localStorage), session, wishlist |
| `src/lib/supabase.ts` | Two clients: `supabase` (keeps the login) and `pub` (no session, for public reads) |
| `src/data/catalog.json` | Bundled catalogue snapshot so the first paint has real products. Regenerate with `python3 scripts/seed.py` |
| `supabase/migrations/` | Tables, row-level security, storage bucket, nightly cron |
| `supabase/functions/sync-catalog/` | Copies products/categories from the WooCommerce Store API and mirrors photos into Storage |

## Data and security

- Public: `products`, `categories`, `impact_stats`, and **verified** rows of `product_eco`.
- Admin only (`app_metadata.admin = true`): edit `product_eco` and `impact_stats`, read draft eco cards and `sync_runs`.
- Own rows only: `profiles`, `wishlists`.
- Catalogue tables have no write policies; only the sync function (service role) writes them.
- Sign-in is an email magic link. To make someone an admin, run in the SQL editor:
  `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"admin": true}' where email = '...';` (they sign out and in again).

## Sync

`sync-catalog` runs every night at 03:30 IST (pg_cron → pg_net). Admins can also press **Sync now** on `#/admin`. `?images=N` mirrors up to N missing photos to the public `catalog` bucket, because ecocart.co.in blocks image hotlinking. Products removed from WooCommerce are hidden (`listed = false`), never deleted, so their eco cards survive.

Copy in descriptions that contradicts the store facts (free shipping/delivery, COD) is dropped during sync.

## Run locally

```
npm install
cp .env.example .env.local   # fill in the project URL and publishable key
npm run dev
```

Env vars (Vercel → Settings → Environment Variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the publishable key; safe in the browser).

## Store facts the copy must match

Flat ₹55 shipping on every order, India only, no free shipping. No COD; Razorpay (UPI, cards). Cancel within 2 days or report damage within 2 days of delivery; refunds in 3 to 5 days; delivery in 4 to 10 days. EcoCart (ecocart.co.in), contact@ecocart.co.in, +91 70120 45854.

## Not built yet

- Paying directly on v5 (Razorpay order + webhook in an edge function; needs Razorpay keys as Supabase secrets). Today the cart hands off to the ecocart.co.in checkout, one link per item.
- Order history (orders live in WooCommerce).
- Eco cards: the data model and admin editor are ready, but no card is verified yet, so shoppers see "coming soon".
