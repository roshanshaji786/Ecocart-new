# EcoCart redesign thread: status (19 Oct 2026, mobile-first pass)

## Live now
- **Homepage** (page 4324, elementor_canvas): 3D design, now phone-first. On phones it is about half as long (6,600px instead of 14,200px): swipe rows for "why us", deals, best sellers and reviews, 2-column category tiles, compact hero stats, 2-column footer links. Source `new-site/build.py` (writes fragment.html, preview.html and elementor-data.json). Backup before the pass: `backup-2026-10-18/pre-mobile-page-4324.json`.
- **Skin snippet** (Code Snippets id 5), built by `skin/build_snippet.py` from `skin/skin.css` + `skin/skin.js` + every file in `mobile/live/` (loaded in name order):
  - `05-global-chrome.css/.js`: slim 60px bottom bar with current-tab marker, round WhatsApp button, one-line cookie strip, centred mobile header with a search icon, restyled menu drawer, search popup and mini cart, compact footer (klbtheme.com demo links hidden), blog post and my-account forms (16px inputs, no iOS zoom).
  - `10-shop.css`: shop/category: one swipe row of category pills, Filter + sort toolbar, filter drawer with chips, 2-column cards with the button under the price, small wishlist only, first-tap fix for add to basket on touch.
  - `20-product.css/.js`: product page: buy area back in the page, slim sticky buy bar above the bottom bar (only while the real buttons are off screen), small "19% OFF" pill, swipeable tabs, long descriptions clamped with "Read full description", related products as a swipe row; hides "complimentary shipping" checklist lines.
  - `25-product-cards.css`: related-product cards use the shop card design (generated from 10-shop.css).
  - `30-cart.css`: cart rows as cards with a 44px stepper, one-row coupon, quiet "Clear All", clean totals (shipping row fixed), 54px green Proceed to checkout; checkout fields 48px/16px in white cards, name and State/PIN paired, 44px checkbox rows, Razorpay card, 56px Place order.
  - PHP in the snippet: drops base-dark.css and Elementor Roboto CSS; category/tag H1 = category name (was "Shop"); blog list titles are H2; main product photo no longer lazy-loaded.
  - Backup before the pass: `backup-2026-10-18/pre-mobile-snippet-5.json`. To undo everything: deactivate snippet 5, or POST that backup's code back.
- `.klb-free-shipping` ("Your order qualifies for free shipping!") is hidden everywhere; shipping is a flat ₹55.
- Proposals from the four page-area workers are in `mobile/proposals/`; before/after screenshots in `mobile/before/` and `mobile/after/`.
- Tested after each deploy with a phone browser at 360, 390 and 414 (final run 19 Oct 01:55 UTC, real guest cart): homepage add to basket, cart (₹249 + ₹55 = ₹304), checkout form and Place order render (never submitted), product page add to basket (simple and variable), sticky bar, no JS errors, no sideways scroll on any page. Page length on phones (390): homepage 14,156 → 6,597px, product 8,618 → 3,652px, small tap targets per page cut from 21–135 to 4–16 (the rest are filter chips and checkboxes whose rows are 44px).

## Deploy
`python3 new-site/build.py` then POST `wp/v2/pages/4324` `{meta:{_elementor_data}}` and DELETE `elementor/v1/cache`. Skin: `python3 skin/build_snippet.py` then POST `code-snippets/v1/snippets/5` `{code}` without the leading `<?php\n`; bump `REV` when only PHP changes.

## Morning list for Roshan (only he can do these)
1. When all EcoCart threads are done: delete the `claude` WP user and its Application Password (Users > Profile > Application Passwords). Its password was visible in a screenshot, so change it now if the user stays a while.
2. Appearance > Customize (Blonwe): turn off the free-shipping progress bar and the mini-cart "Free Shipping on All Orders Over $100" text; replace the demo search keywords; set the cookie notice text and its policy link. They are hidden or rewritten by the skin today, but fixing them at the source is cleaner.
3. Done 19 Oct: 88919 06342 stopped working, so every call/WhatsApp number and link on the site is now 70120 45854 (theme header, social links, pages, posts, homepage, product WhatsApp button, contact SEO title). Backups in `backup-2026-10-19-phone/`. Update it outside the site too (Google Business Profile, Instagram/Facebook bios, Meta ads) if the old one is listed there.
4. Footer widgets/menu: "Free from fixed and mobile phones in INDIA" is theme demo text, "Copyright 2024", "Accessibility Statement" links to My account, and "Your Orders" / "Cookie Settings" point to klbtheme.com (hidden by CSS).
5. Newsletter promises "Rs 50 off": no matching coupon was found in WooCommerce. Create one or change the text.
6. Products: remove "Complimentary shipping on most orders" from the product checklist (hidden by JS today); merge duplicate categories (two "Ghee", two "Thobes"); add swatch colours for colour terms and fix "cofee"; some photos have text baked in that gets cropped on phones.
7. Child theme `style.css` ends with a pasted Google tag `<script>`; remove it (the skin has a guard rule for now).
8. Cart and checkout settings: Customizer > Additional CSS has Fastrr rules that hide the WooCommerce checkout buttons and colour Buy Now red, so decide which checkout is the main one (WooCommerce + Razorpay or Fastrr) and clean them up; WooCommerce > Settings > General "Sell to specific countries: India" (check international orders first); Customizer > WooCommerce > Checkout: set Company name to Hidden; untick the pre-ticked Mailchimp newsletter box; the terms page shown inside checkout carries its full page design, so make it plain text or turn off inline terms.
