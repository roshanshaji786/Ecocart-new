# Cloudflare cache rule for ecocart.co.in pages (free plan)

Why: Cloudflare currently passes every page to Hostinger (`cf-cache-status: DYNAMIC`, 75% of traffic hits the origin), so each page waits 1.5-3 s before anything shows. LiteSpeed already caches the same HTML for all logged-out visitors, and the mobile and desktop HTML are identical (checked 18 Oct), so Cloudflare can safely keep a copy near the shopper.

## Steps
1. Cloudflare → ecocart.co.in → **Caching → Cache Rules → Create rule**.
2. Rule name: `Cache pages for visitors`.
3. Under "If incoming requests match", choose **Custom filter expression → Edit expression** and paste:

```
(http.host eq "ecocart.co.in" and not starts_with(http.request.uri.path, "/wp-") and not starts_with(http.request.uri.path, "/cart") and not starts_with(http.request.uri.path, "/checkout") and not starts_with(http.request.uri.path, "/my-account") and not starts_with(http.request.uri.path, "/wishlist") and not starts_with(http.request.uri.path, "/compare") and not starts_with(http.request.uri.path, "/order-tracking") and not http.request.uri.query contains "wc-ajax" and not http.request.uri.query contains "add-to-cart" and not http.cookie contains "wordpress_logged_in" and not http.cookie contains "woocommerce_items_in_cart" and not http.cookie contains "wp_woocommerce_session" and not http.cookie contains "comment_author")
```

4. Cache eligibility: **Eligible for cache**.
5. Edge TTL: **Ignore cache-control header and use this TTL** → **2 hours**.
6. Leave Browser TTL and everything else as is. **Deploy**.

## What it means
- Shoppers who haven't added anything to the basket get pages from Cloudflare. Anyone with items in the basket, logged in, or on cart/checkout/account goes to the site as today.
- After changing a price or product, the old page can show for up to 2 hours. To show it at once: Caching → Configuration → **Purge Everything**.
- To undo: Caching → Cache Rules → switch the rule off.

## Not done on purpose
- No rule for images: the WebP plugin serves WebP and JPG at the same address, and Cloudflare free can't keep both, so WhatsApp/Facebook link previews could break.
