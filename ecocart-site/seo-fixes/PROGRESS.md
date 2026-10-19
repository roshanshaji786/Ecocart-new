# EcoCart SEO fixes: progress

Resumed 18 Oct 20:36 UTC. Redirect REST call retried: still 403 from the Hostinger firewall. Re-crawl after all threads' changes: 142 indexable URLs, no duplicate titles, no missing meta, homepage keeps its title/meta and now has one H1 and full alt text. Theme H1 items sent to the main thread in `handoff-theme.md`. Remaining items are only the ones Roshan has to do (Blocked section below).

Every live change is logged with before/after in `changes.csv`. Raw "before" snapshots of products and categories are in `before/`. `after-audit.csv` is a re-crawl of all 158 URLs after the changes.

## Done (live)
- 94 products: plain-text names (no more 𝕓𝕠𝕝𝕕 Unicode), unique names for the 40 thobes (colour + sleeve + "Style <id>"), new Rank Math title, meta description and focus keyword. Slugs/URLs unchanged.
- 49 product descriptions cleaned: fancy letters to plain, H1 to H2, removed stray ``` fences, unlinked himalayanstreetrawhoney.in links, fixed broken/404 internal links and a fake mailto, replaced the false "Free Shipping in Kerala" short description on SEY products (shipping is flat ₹55).
- 13 products: H1 to H2 in the theme's "Product Specifications" tab (meta klb_product_specification).
- 207 product images got alt text (177 empty + 30 with fancy Unicode alt).
- Rank Math titles/meta on 28 product categories, 16 pages, 3 posts, 2 post categories. Category names "ℂ𝕦𝕤𝕥𝕠𝕞𝕚𝕫𝕖𝕕 𝕄𝕖𝕟'𝕤 ℍ𝕒𝕞𝕡𝕖𝕣𝕤" and "ℕ𝕀𝔻𝔸" renamed to plain text (slugs unchanged). /product-category/men/thobes/ canonicalised to /product-category/men/thobes-shirts-2/ (the one in the menu).
- noindex, follow on lorem/demo items: pages home-2, about-us-2, contact-2, contact-3, compare, wishlist; 4 lorem posts; post categories smartphone, tablet; 15 empty product categories. FAQ and order-tracking were rewritten by "EcoCart other pages", so they are back to index with real meta.
- Audit after changes: no duplicate titles, no missing meta, no fancy letters in titles, every indexable product page has one H1.

## Blocked
- 301 redirects: the Rank Math redirect REST call is blocked by Hostinger's firewall ("Access Denied", 403). Roshan to add in Rank Math > Redirections (301): /all-eyes-on-rafah-a-city-at-the-crossroads-of-conflict/ -> /blog/ (post now draft, 404 today); home-2 -> /, about-us-2 -> /about-us/, contact-2 and contact-3 -> /contact/, the 4 lorem posts -> /blog/. Until then they stay noindex.
- Rank Math global settings (no REST access): need Roshan in Rank Math settings:
  1. Sitemap Settings > Product Categories: include in sitemap (product category pages are indexable but missing from the sitemap).
  2. Titles & Meta > Local SEO: name "EcoCart" (now "ecocart.co.in"), phone +91 88919 06342, social profiles.
  3. Titles & Meta > Products: schema Name -> %title% (today Product schema name = SEO title incl. "| EcoCart").

## For the main thread (theme)
- Product category and /shop/ pages all show H1 "Shop" (woocommerce-page-title); should be the category name.
- /blog/ and /category/uncategorised/ render every post title as an H1 (7 on /blog/); archive post titles should be H2.

## Next steps when resumed
1. Internal links: add category/related-product links from the 3 real blog posts (coordinate with "EcoCart other pages", which owns post bodies).
2. Product schema: brand (GreenNuts, Pure Pack, Meswa Naturals) via Rank Math per-product schema if worth it.
3. Notes for Roshan: duplicate products 6148 = 6245 and 6231 = 6249 (same photos; 6148 has no price), thobe 6162 named Brown but colour attribute "navyblue", prayer mat 7574 sits in the "Red mountain" category, two "Thobes" and two "Ghee" categories.
4. Ask Roshan to delete/rotate the "claude" app password when all EcoCart work is finished.
