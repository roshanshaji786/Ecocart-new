# EcoCart (ecocart.co.in) project handoff

Written 19 Oct 2026 from the "learn.dartsai.in" project, where the EcoCart work started. This file is self-contained: the new project cannot see the old project's files, threads or memory. In this repo, all the source, notes and backups mentioned below are in `ecocart-site/`. The site settings and plugin-list backups were left out because this repo is public.

## 1. The site

- **ecocart.co.in**: Roshan's eco / gift / food store (Thiruvananthapuram, Kerala). Sells honey, ghee, spices, coconut milk, gift hampers, thobes, KitKat towers and more (about 95 products).
- **Stack:** WordPress 7.1 + WooCommerce, theme **Blonwe** (child theme `blonwe-child`), Elementor 4.3.5, Rank Math SEO, LiteSpeed Cache, Code Snippets plugin, Jetpack. Hosting is Hostinger behind Cloudflare.
- **Checkout:** WooCommerce checkout with Razorpay, plus a Fastrr/Shiprocket "Buy Now" button. Roshan still has to decide which one is the main checkout.
- **Homepage** is page id **4324** (template `elementor_canvas`, one HTML widget).

## 2. Access

- WP user **`claude`** (administrator) plus an **Application Password**, used over the **REST API with Basic auth** (`https://ecocart.co.in/wp-json/...`).
- `wp-login.php` is blocked by Jetpack Protect's human check, so there is no browser login. Use REST only.
- **The password is not in this file on purpose.** Roshan pastes it into the new project's first thread (or sets it as an environment secret). Never write it into files, memory or replies.
- Roshan should rotate the Application Password before the new project starts, and delete the user when the work is finished.
- The Hostinger firewall returns 403 to some REST calls (for example Rank Math redirects). Those changes go on Roshan's list instead.
- Images are hotlink-protected (403 for other referers), so test on the live URLs.

## 3. Store facts (never contradict these in copy)

- Shipping is a **flat ₹55** on every order, India only. **There is no free shipping.** Never write "free delivery".
- Returns: cancel within **2 days**, or report a damaged item within 2 days of delivery. Refunds take 3 to 5 days. Delivery takes 4 to 10 days.
- **No COD.** Payment is Razorpay (UPI and cards).
- Merchant name: **"EcoCart (ecocart.co.in)"**. Email: contact@ecocart.co.in.
- Phone / WhatsApp: **+91 70120 45854** (`wa.me/917012045854`). The old **88919 06342 is dead.** On 19 Oct it was replaced everywhere on the live site, and every phone and WhatsApp link now goes to 7012045854. Backups from before the swap are in `ecocart-site/backup-2026-10-19-phone/`.

## 4. Done and live (18 to 19 Oct)

- **3D homepage, mobile-first.** On phones it is half as long (6,600px instead of 14,200px), with swipe rows, 2-column category tiles and one proper H1 with full alt text. Rank Math title, meta, canonical and schema on page 4324 were kept.
- **Skin snippet** (Code Snippets **id 5**, "EcoCart skin + speed"). It restyles the header, bottom bar, menu, footer, cookie strip and WhatsApp button; gives shop/category pages pills, a filter drawer and 2-column cards; gives the product page a sticky buy bar and folded descriptions; and turns the cart and checkout into big-tap cards. It hides the false "free shipping" messages, sets category H1s to the category name, and sets blog list titles to H2.
- **Speed:** Cloudflare Rocket Loader is off. Code Snippet **id 7** applies the LiteSpeed settings (guest mode off, JS fixes, preconnects, lazy-load excludes); **id 6** is a read-only settings view, to deactivate when speed work ends. The Click to Chat and Hotjar plugins are deactivated (not deleted). Lighthouse mobile: Home 28 → 32, Shop 44 → 49. The big remaining wins are the Cloudflare cache rule and the 1.4 MB theme CSS.
- **SEO:** 94 products have plain-text names (no 𝕗𝕒𝕟𝕔𝕪 letters) and a new title, meta and focus keyword; the 40 thobes have unique names; 49 descriptions are cleaned; 207 images have alt text; titles and meta are set on 28 categories, 16 pages and 3 posts; demo/lorem pages are noindex. The re-crawl shows no duplicate titles and no missing meta.
- **Other pages:** 14 pages rewritten with true facts and a phone layout: About, Contact (CF7 form kept), FAQ, Shipping, Refund, Terms, Privacy, Order tracking, Better Honey, Red Mountain KitKat tower and Thobe. Post 6269 was rewritten. The "All Eyes on Rafah" post is in draft at Roshan's request.
- Tested at 360 / 390 / 414px with a real guest cart: add to basket works, the cart shows ₹249 + ₹55 = ₹304, checkout renders (no order was ever placed), and there are no JS errors and no sideways scroll.

## 5. How the work is split (same structure as before)

- **Coordinator** in the project chat: takes each ask, starts a thread per area, routes follow-ups, and keeps memory.
- **Threads, one owner per area.** Only the owner changes its area; anyone else sends the change to the owner through the coordinator.
  1. **Design**: theme, global CSS, header/footer, homepage, and the shop/product/cart/checkout templates. Owns snippet **id 5** and its source in `skin/`, `mobile/` and `new-site/`.
  2. **Speed**: LiteSpeed, Cloudflare, images and plugins. Owns snippets **id 6 and id 7**. Deactivates plugins, never deletes them.
  3. **SEO**: Rank Math fields, product names, alt text and redirects. Logs every change in `seo-fixes/changes.csv`.
  4. **Pages**: static page and post body content. Source in `other-pages/build.py` and `publish.py`.
- **Shared code** is the "EcoCart skin + speed" snippet (id 5), owned by Design. Every other thread adds its PHP as **its own Code Snippet**, never inside someone else's.
- Every live change starts with a backup (JSON in the folder) and ends with a store check: add to cart, cart, checkout render, and no JS errors.

## 6. Deploy notes

- **Homepage:** `python3 new-site/build.py`, then POST `wp/v2/pages/4324` with `{meta:{_elementor_data}}`, then DELETE `elementor/v1/cache`.
- **Skin:** `python3 skin/build_snippet.py`, then POST `code-snippets/v1/snippets/5` with `{code}` (without the leading `<?php\n`). Bump `REV` when only PHP changes so LiteSpeed purges.
- After any REST page update, DELETE `/wp-json/elementor/v1/cache` or Elementor keeps showing the old page.
- **Gotchas:** the child theme `style.css` ends with a pasted Google tag `<script>` (a guard rule covers it). Kirki's inline `:root` variables override yours, so set them on `body.theme-blonwe`. LiteSpeed strips Google Fonts links, so fonts are self-hosted. Don't use `?m=` as a cache-buster (WP 404s it). LiteSpeed has no settings REST API.

## 7. Open items

- Speed: the 1.4 MB render-blocking theme CSS (`speed/for-main-thread-css.md`); the main product photo `loading="lazy"` (`speed/for-main-thread-product-gallery.md`); Converter for Media serves images as `private`, so Cloudflare never caches them.
- SEO next: internal links from the 3 real blog posts, Product schema brand, FAQPage schema on the FAQ page, and duplicate products 6148 = 6245 and 6231 = 6249.
- Product 6504 "Red mountain double layer (customised)" has price ₹0.
- The remaining plugin clean-up candidates are listed in `speed/README.md`.

## 8. Roshan's to-do list (only he can do these)

1. **Cloudflare cache rule** for guest pages: steps in `speed/cloudflare-cache-rule.md`, about 3 minutes. This is the biggest speed win left.
2. **Rank Math > Redirections (301):** `/all-eyes-on-rafah-a-city-at-the-crossroads-of-conflict/` → `/blog/`; `home-2` → `/`; `about-us-2` → `/about-us/`; `contact-2` and `contact-3` → `/contact/`; the 4 lorem posts → `/blog/`.
3. **Rank Math settings:** include product categories in the sitemap; set Local SEO name "EcoCart" and phone +91 70120 45854; set the Products schema name to `%title%`.
4. **Appearance > Customize (Blonwe):** turn off the free-shipping progress bar and the mini-cart "Free Shipping over $100" text, replace the demo search keywords, set the cookie text and link, and fix the footer demo text ("Free from fixed and mobile phones", "Copyright 2024", klbtheme.com links).
5. **Checkout:** choose WooCommerce + Razorpay or Fastrr as the main checkout and clean up the Fastrr rules in Additional CSS; hide the Company field; untick the pre-ticked Mailchimp box; make the inline terms page plain.
6. The newsletter promises "Rs 50 off" but no coupon exists, so create one or change the text.
7. Products: merge the duplicate "Ghee" and "Thobes" categories, fix "cofee", and add colour swatches.
8. Remove the pasted `<script>` at the end of the child theme `style.css`.
9. Test the Contact page form reaches contact@ecocart.co.in.
10. When all work is done: **delete the `claude` WP user and revoke its Application Password.**

## 9. Ready-to-paste project instructions

```
This project runs ecocart.co.in, Roshan's WooCommerce store (WordPress + Blonwe + Elementor + Rank Math + LiteSpeed, Hostinger + Cloudflare).

How to work:
- The coordinator in the project chat starts one thread per area: Design, Speed, SEO, Pages. One owner per area; changes to another area go to its owner through the coordinator.
- Access is the "claude" WP user + Application Password over REST (wp-login is blocked by Jetpack). Never write the password into files, memory or replies.
- Back up before every live change (JSON in the project folder) and check the store after: add to cart, cart, checkout render, no JS errors. Never place a real order.
- Shared CSS/JS lives in Code Snippet id 5 "EcoCart skin + speed" (owned by Design). Every other thread adds its PHP as its own Code Snippet.
- Deactivate plugins, never delete them. Never delete pages, products or posts; draft or noindex instead.
- Store facts: flat ₹55 shipping, India only, no free shipping; 2-day returns; no COD (Razorpay only); merchant name "EcoCart (ecocart.co.in)"; phone/WhatsApp +91 70120 45854 (88919 06342 is dead).
- Things only Roshan can do (Cloudflare, Rank Math redirects and settings, Customizer) go on a short to-do list for him, with exact steps.
- When Roshan is away, work autonomously with sensible defaults and keep replies short and plain.
```

## 10. First memory block for the new project

```
# ecocart.co.in
- Owner: Roshan. Store: ecocart.co.in, WordPress 7.1 + WooCommerce, theme Blonwe (blonwe-child), Elementor 4.3.5, Rank Math, LiteSpeed Cache, Code Snippets, Jetpack; Hostinger + Cloudflare. Homepage = page 4324.
- Access: "claude" WP admin user + Application Password over REST Basic auth; wp-login.php blocked by Jetpack Protect. Hostinger firewall 403s some REST calls (Rank Math redirects). Password is never stored in files or memory.
- Facts: flat ₹55 shipping India-only, no free shipping; 2-day returns, refunds 3-5 days, delivery 4-10 days; no COD (Razorpay); merchant name "EcoCart (ecocart.co.in)"; phone/WhatsApp +91 70120 45854 (old 88919 06342 dead, replaced site-wide on 19 Oct; backups in ecocart-site/backup-2026-10-19-phone/).
- Threads and ownership: Design (snippet 5 "EcoCart skin + speed", homepage, templates), Speed (snippets 6 and 7, LiteSpeed, Cloudflare, plugins), SEO (Rank Math, product names, alt text, log seo-fixes/changes.csv), Pages (static page/post bodies). Other threads add PHP as their own snippet; handoffs go through the coordinator.
- Deploy: homepage = new-site/build.py, POST wp/v2/pages/4324 meta._elementor_data, DELETE elementor/v1/cache. Skin = skin/build_snippet.py, POST code-snippets/v1/snippets/5 {code} without "<?php\n"; bump REV for PHP-only changes.
- Status 19 Oct 2026: 3D mobile-first redesign, speed settings, SEO pass and 14 rewritten pages are all live and tested. Roshan's to-do list: Cloudflare cache rule, Rank Math 301s and settings, Customizer demo text, checkout choice, contact form test, then delete the claude user and app password.
```

## 11. Folders to upload into the new project

Upload from the old project's `ecocart-site/` folder, keeping the same names:

- **Need:** `skin/` (snippet 5 source), `new-site/` (homepage source), `mobile/live/` (phone CSS/JS bundled into snippet 5), `other-pages/` (page sources, `publish.py`, originals in `backup/`), `speed/` (README, Cloudflare rule, settings backup), `seo-fixes/` (`changes.csv`, `PROGRESS.md`, `before/`), `backup-2026-10-18/` (full site backup and pre-change copies, for undo), `backup-2026-10-19-phone/` (copies from before the phone number swap), `redesign-status.md`, and this file.
- **Useful but large:** `seo-baseline/` (pre-redesign SEO snapshot with 129 raw HTML pages). Upload `README.md`, `pages-summary.csv` and `pages.json` at least.
- **Skip:** `mobile/before/`, `mobile/after/`, `mobile/proposals/`, `other-pages/mobile-screens/`, `speed/lighthouse-*` (screenshots and reports, only history).
