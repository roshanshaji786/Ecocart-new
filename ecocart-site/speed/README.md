# ecocart.co.in speed work (thread "EcoCart speed")

## Baseline (Lighthouse 12.6, mobile, simulated 4G, 18 Oct 2026 ~17:00 UTC)
Raw reports: `lighthouse-before/*.json`, summary `lighthouse-before/summary.txt`.
PageSpeed Insights API quota was exhausted, so Lighthouse ran locally (test machine is in the US, so TTFB is a bit worse than for Indian shoppers; compare before/after only).

| Page | Score | FCP | LCP | TBT | Weight | Requests |
|---|---|---|---|---|---|---|
| Home | 28 | 10.2s | 19.5s | 1841ms | 2.7 MB | 123 |
| Shop | 44 | 10.0s | 20.9s | 478ms | 3.3 MB | 162 |
| Category (eco-goods) | 50 | 4.5s | 14.2s | 494ms | 2.0 MB | 135 |
| Product (coconut milk) | 50 | 4.5s | 6.2s | 564ms | 1.5 MB | 118 |
| Cart (empty) | 43 | 4.7s | 12.3s | 788ms | 1.8 MB | 104 |

Shopify stores usually score 60-85 on mobile with LCP 2-3s. Target: LCP under 3s, TBT under 300ms.

## What makes it slow (in order of impact)
1. **Two JS delayers fighting.** Cloudflare **Rocket Loader is ON** (`/cdn-cgi/.../rocket-loader.min.js`) on top of LiteSpeed **"Load JS Deferred = Delayed"** (46 `type="litespeed/javascript"` tags). Rocket Loader alone costs 1-3s of main-thread time; together they hold jQuery/gallery/add-to-cart until the first tap. Fix: Rocket Loader OFF, LiteSpeed JS = Deferred (not Delayed).
2. **1.24 MB combined CSS** (`/wp-content/litespeed/css/*.css`), mostly an icon font inlined as base64. Render-blocking. QUIC.cloud **UCSS fails** ("UCSS bypassed due to generation error" at the bottom of the HTML), so unused CSS is never removed. Main thread's skin snippet handles the icon CSS.
3. **HTML not cached at Cloudflare** (`cf-cache-status: DYNAMIC`), TTFB 1.7-2.3s every page. LiteSpeed has it cached (`x-litespeed-cache: hit`), so the delay is the trip to Hostinger. Fix: Cloudflare cache rule for guest HTML (bypass on `wordpress_logged_in`, `woocommerce_*`, `wp_woocommerce_session` cookies, and /cart, /checkout, /my-account), or Hostinger CDN.
4. **Images**: homepage LCP image is a 1000px+ jpg (`2024/08/47a19da3...jpg`, 103 KB) that is lazy-loaded by JS; logo is a 51 KB webp shown at ~150px; shop serves 768px thumbnails into ~180px slots (707 KB wasted). LCP image should not be lazy-loaded.
5. **Fonts**: Jost loaded in all 9 weights + italics, Open Sans 600, Inter Tight + Fraunces on product pages (main thread's skin), 15 font files. Theme/Kirki area, owned by the main thread: keep Jost 400/500/600/700 only, `display=swap`.
6. **Third-party scripts**: two Google tag scripts (GT-KV6J8S49 from Site Kit, AW-11464768609 Ads) 380 KB, Pickrr/Fastrr checkout JS on every page, Mailchimp mcjs, Jetpack Stats, OTPless.

## Plugins that look unneeded (deactivate only, never delete)
Not yet changed. Candidates: Hotjar (no data use seen), Hostinger AI Assistant, Envato Market (updater only), WooCommerce Legacy REST API (check nothing uses it), Insta Gallery (if the Instagram feed is not on any page), Mailchimp for WP **or** Mailchimp for WooCommerce (one is enough), WP WhatsApp Chat **and** Click to Chat (two WhatsApp buttons; keep one), Product Editor (admin bulk tool, only needed while editing). Keep: Razorpay, Fastrr/Pickrr, Envia, Xpressbees, Facebook for WooCommerce, Google Listings & Ads, Site Kit, Rank Math, LiteSpeed, Elementor, Blonwe Core, Kirki, Meta Box, Jetpack (login protection), Converter for Media, CF7.

## Changes made (18 Oct, all reversible)
- Code Snippets **id 7 "EcoCart speed: LiteSpeed settings (Claude)"** applies LiteSpeed settings once per version (now v4); old values in `litespeed-settings-before.json`. To undo a setting, change it back in LiteSpeed Cache admin (deactivating the snippet does not revert).
  - `guest_optm` 1 → off (was delaying all JS until first tap for new visitors; gallery/add-to-cart dead until tap)
  - `optm-ggfonts_async` → on
  - `optm-js_exc` / `optm-js_defer_exc` + `wp-includes/js/dist/hooks.min.js`, `i18n.min.js` (fixed "wp is not defined" errors that broke Google Listings & Ads gtag events)
  - `optm-dns_preconnect`: fonts.googleapis.com, fonts.gstatic.com, cdn.jsdelivr.net (v4)
  - `media-lazy` stays on; excludes `ecocart-removebg` (logo), homepage hero `47a19da3-...`, parent class `woocommerce-product-gallery__image`; `media-vpi` on
- Code Snippets **id 6** read-only admin REST view `/wp-json/claude-speed/v1/litespeed-settings`. Deactivate when the speed work is done.
- Plugins deactivated (not deleted): **Click to Chat** (rendered nothing visible; WP WhatsApp Chat shows the button), **Hotjar** (no script on site).
- Cloudflare **Rocket Loader off** (Roshan, 17:16 UTC).
- Store checked after each step: add to cart (Store API + real click), cart, checkout render, 0 JS errors on home/shop/product/cart.

## Lighthouse runs
`lighthouse-before` (baseline), `lighthouse-step1` (delay-JS off, native lazy: images ballooned to 4 MB, reverted), `lighthouse-step2` (lazy back on). TBT went up once scripts stopped being delayed: the old score was flattered by scripts not running at all. Main-thread redesign changes landed during these runs, so compare carefully.

## Next
- Roshan: Cloudflare cache rule (`cloudflare-cache-rule.md`).
- Main thread: product photo `loading="lazy"` (`for-main-thread-product-gallery.md`).
- Images are served `Cache-Control: private` by Converter for Media (WebP at same URL), so Cloudflare never caches images. Fix would be switching it to separate .webp URLs; not done yet.
- Paused 18 Oct 17:35 UTC at Roshan's request; store check OK at pause. Resume with the Next list above.

## Night run (19 Oct, ~01:35 UTC, after the redesign thread's mobile work)
`lighthouse-after/summary.txt`. Mobile, same 5 pages:

| Page | Score before → after | LCP before → after | FCP before → after | TBT before → after |
|---|---|---|---|---|
| Home | 28 → 32 | 19.5s → 14.7s | 10.2s → 6.4s | 1841 → 1892ms |
| Shop | 44 → 49 | 20.9s → 14.8s | 10.0s → 6.9s | 478 → 383ms |
| Category | 50 → 40 | 14.2s → 14.8s | 4.5s → 6.5s | 494 → 782ms |
| Product | 50 → 48 | 6.2s → 8.8s | 4.5s → 6.2s | 564 → 429ms |
| Cart | 43 → 43 | 12.3s → 12.4s | 4.7s → 7.0s | 788 → 615ms |

Reading it: the old numbers looked better on category/product/cart partly because scripts never ran until a tap (product photos and buttons were dead on first view). Now everything works on first view, which costs some lab time. What still holds pages back: (1) Cloudflare not caching HTML (TTFB 0.5-2.2s, needs Roshan's cache rule), (2) one 1.42 MB render-blocking theme CSS (sent to the redesign thread: `for-main-thread-css.md`).
Store check at 01:40 UTC: add to cart, cart, checkout OK; 0 JS errors on home/shop/product/cart.

## Morning list for Roshan
1. Cloudflare cache rule (`cloudflare-cache-rule.md`), about 3 minutes.
