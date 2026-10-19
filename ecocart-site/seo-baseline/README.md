# ecocart.co.in SEO baseline (18 Oct 2026)

Snapshot taken before any redesign, so nothing is lost.

## Platform
- WordPress 7.1.3 + WooCommerce, theme **Blonwe** (child theme blonwe-child), page builder Elementor 4.3.5.
- Hosting: Hostinger (LiteSpeed Cache) behind Cloudflare.
- SEO plugin: Rank Math (sitemap_index.xml, schema graph). Google Site Kit + Google Listings & Ads, Jetpack.
- Homepage = page id 4324 (slug `home`), title "Home".

## Files here
- `pages.json`: every sitemap URL with status, title, meta description, canonical, robots, OG/Twitter tags, H1/H2/H3, JSON-LD schema, images + alt, internal links, word count.
- `pages-summary.csv`: one row per URL (open in Sheets).
- `html/`: raw HTML of each of the 129 pages.
- `sitemap_index.xml`, `sm-post|page|product|category.xml`, `robots.txt`, `headers.txt` (homepage response headers).
- `current-home-desktop.png`: full-page screenshot of the current homepage.

## Numbers
- 130 sitemap URLs: 9 posts, 22 pages, 95 products, 4 category sitemap entries. 129 return 200; `/checkout/` 302s to home (normal for an empty cart).
- `/cart/` and `/my-account/` are noindex (correct).
- 15 pages have no H1, **including the homepage**. 10 have no meta description.
- 11 titles are duplicated (mostly Thobe variants written in 𝕓𝕠𝕝𝕕 Unicode letters, which Google reads poorly).
- Homepage: 124 images, 59 without alt text.

## Homepage SEO that must survive
- Title: `Eco Friendly Products | Personalized gift| Right From Source`
- Meta description: `Shop eco friendly products at EcoCart and reduce your carbon footprint. Discover sustainable solutions for a greener lifestyle. And Buy spices`
- Canonical `https://ecocart.co.in/`, OG title/description/url as above, locale en_GB.
- Schema (Rank Math): Organization (logo cropped-ecocart-removebg.png), WebSite + SearchAction, WebPage.
- Internal links to: about-us, contact, blog, shop, better-honey, privacy-policy-2, refund_returns-2, shipping-and-delivery, terms-and-conditions, wishlist, my-account, all product categories, and the featured products.

## Plan to keep it
- The redesign only replaces the **content of page 4324**. The URL, Rank Math title, description, canonical, OG and schema are stored on that page and stay untouched. No URL changes, so no 301s needed.
- Shop, product, category, cart and checkout pages keep the current WooCommerce theme.
- New homepage adds one proper H1, alt text on every image, and real HTML text (the 3D canvas is decoration only).
