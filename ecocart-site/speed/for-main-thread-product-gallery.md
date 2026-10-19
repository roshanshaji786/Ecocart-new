# Speed fix for the product template (owned by "EcoCart 3D redesign")

The main product photo (LCP element on every product page) is printed by the theme with `loading="lazy"`:
`<div class="woocommerce-product-gallery__image"><a ...><img loading="lazy" width="650" height="812" src=".../rr-1-650x812.jpg" class="wp-post-image" ...>`
Native lazy loading delays the biggest above-the-fold image. LiteSpeed's own lazy load is already excluded for this wrapper (speed thread, snippet "EcoCart speed: LiteSpeed settings").

Fix in the product template / child theme (PHP, child functions or a snippet):
```php
add_filter('woocommerce_single_product_image_thumbnail_html', function ($html, $attachment_id) {
    static $first = true;
    if ($first) {
        $first = false;
        $html = str_replace('loading="lazy"', 'fetchpriority="high"', $html);
    }
    return $html;
}, 20, 2);
```
Also worth checking: an `Open Sans 600` Google Fonts stylesheet is injected by a script (not in the HTML; likely the Shiprocket/Fastrr BUY NOW button) and counts as render-blocking.
