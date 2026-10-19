# From "EcoCart SEO fixes" to the main EcoCart thread (theme owner)

Re-crawl of 18 Oct 2026, 20:45 UTC (`after-audit.csv`):

1. Every product category page shows the H1 "Shop" (`<h1 class="woocommerce-page-title">`). It should be the category name, for example "Thobes" on /product-category/men/thobes-shirts-2/ and "Honey" on /product-category/eco-goods/honey/. A `woocommerce_page_title` filter in a separate snippet, or the theme's archive template, can fix it.
2. /blog/ renders 7 H1s and /category/uncategorised/ renders 2: every post title in the archive loop is an H1. Archive post titles should be H2, and the page should have one H1 (for example "EcoCart Blog").

Neither touches any URL. Rank Math titles and meta for these pages are already set.
