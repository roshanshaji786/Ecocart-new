# Render-blocking CSS: what's left is theme CSS (owned by "EcoCart 3D redesign")

Measured 18 Oct ~21:00 UTC. Every page loads ONE combined LiteSpeed stylesheet of **1.42 MB uncompressed (~270 KB gzipped)** before anything paints. Lighthouse mobile FCP is ~6 s on all pages mainly because of it. LiteSpeed's unused-CSS service (UCSS) fails on this site, so it never gets trimmed.

What's inside (source files before combining, homepage):
| File | Size | Note |
|---|---|---|
| themes/blonwe/assets/css/base.css | 796 KB | Theme's everything-file. Biggest win if the skin replaces most of it on shop/product/cart. |
| themes/blonwe/assets/css/bootstrap.min.css | 221 KB | Full Bootstrap. |
| themes/blonwe/style.css | 111 KB | |
| uploads/elementor/google-fonts/css/roboto.css + robotoslab.css | 107 + 25 KB | Elementor's local Google Fonts (Roboto). Not used by the new skin fonts (Inter Tight / Fraunces). Elementor → Settings → Advanced → Google Fonts: off, or dequeue `elementor-gf-local-roboto*`. |
| uploads/ecocart-skin/.../icons.css | 82 KB | Skin icon CSS (already slimmed from 1.3 MB). |
| themes/blonwe/assets/css/base-dark.css | 67 KB | Dark-mode CSS; dequeue if there's no dark mode toggle. |
| plugins/wp-whatsapp-chat/.../style.css | 37 KB | WhatsApp button (keep). |
| select2, mediaelement, blog-single, contact, storebox | ~60 KB | Only needed on some pages; dequeue elsewhere. |

Fonts: Blonwe `klbtheme.woff2` icon fonts (183 KB interface + 70 KB social) load on every page at VeryHigh priority. If the skin's SVG icons replace them, dequeue/drop those @font-face rules.

Also: `plugins/5-July-fastrr-checkout-plugin/FastrrCss.css` @imports Google Fonts Open Sans 600 (render-blocking chain). Speed thread added preconnects to fonts.googleapis.com / fonts.gstatic.com to soften it; not touching the checkout plugin itself.

Suggested order (biggest first): dequeue base-dark.css + Elementor Roboto CSS (~200 KB, near zero risk) → trim base.css/bootstrap on pages the skin fully styles.
