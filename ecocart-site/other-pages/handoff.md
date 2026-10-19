# EcoCart other pages: done + handoffs (18 Oct 2026)

## Live now (body content only, URLs unchanged)
about-us (1735), contact (2299, CF7 form 2343 kept), faq (2724), shipping-and-delivery (5354),
refund_returns-2 (2677), terms-and-conditions (2711), privacy-policy-2 (2697), order-tracking (2627, Woo tracking form kept),
better-honey (7420), red-mountain-kitkat-tower (6494), thobe (5227) — each one Elementor section of HTML + shortcode widgets.
Posts: 6269 body rewritten with true products (old one listed items EcoCart doesn't sell, made-up testimonials and an "SEO keywords" sentence); 7355 and 7618 got a shop/WhatsApp box at the end.
Source: build.py -> out/*.json, publish.py pushes them. Originals: backup/. After REST updates, call DELETE /wp-json/elementor/v1/cache or Elementor keeps rendering the old page.
Facts used: flat ₹55 shipping India-only, Razorpay only (no COD), 2-day cancel/report window, 3–5 day refunds, 4–10 day delivery (all from the store's existing policies and Woo settings).

## For "EcoCart SEO fixes"
- H1s now in body (one per page): About "Do you want to know us? Hello, we're EcoCart." · Contact "You can ask us questions. We reply fast." · FAQ "FAQ: answers in one place" · Shipping/Refund/Terms/Privacy = page name · Order tracking "Track your order." · Better Honey "Better Honey A delicious fusion of honey and dry fruits." · Red Mountain "Red Mountain KitKat tower, made to wow." · Thobe "Thobe collection". Don't add a second H1.
- Meta descriptions for shipping and refund pages are still "Last updated on May 5th 2024"; FAQ meta is Bootstrap placeholder text; order-tracking meta is lorem ipsum. Suggested:
  - shipping: "Flat ₹55 shipping on every EcoCart order, delivered anywhere in India in 4–10 days by trusted couriers. Track your order online or on WhatsApp."
  - refund: "Cancel within 2 days or report a damaged item within 2 days of delivery. EcoCart replaces or refunds, with refunds processed in 3–5 days."
  - faq: "Answers about EcoCart orders, UPI and card payments, ₹55 shipping, returns, Better Honey, gift hampers and thobe sizes."
  - order-tracking: "Track your EcoCart order with your order ID and email, or ask us on WhatsApp at +91 88919 06342."
  - contact: "Contact EcoCart on WhatsApp +91 88919 06342, call 7012045854 or email contact@ecocart.co.in. Thiruvananthapuram, Kerala."
- FAQ page is a good FAQPage schema candidate (questions are <details><summary>).
- Red Mountain page title is broken: "Red Mountain Exclusive Page - ecocart.co.inred-mountain-kitkat tower".
- Theme demo pages still indexed with lorem: home-2, about-us-2, contact-2, contact-3 -> suggest 301 to /, /about-us/, /contact/, /contact/.
- Lorem demo posts: english-breakfast-tea-with-tasty-donut-desserts, the-problem-with-typefaces-on-the-web, but-i-must-explain-to-you-how-all-this-mistaken-idea, on-the-other-hand-we-provide-denounce-with-righteous -> suggest 301 to /blog/. Also categories smartphone, tablet exist only for them.
- Post all-eyes-on-rafah-a-city-at-the-crossroads-of-conflict (6487): Roshan asked to remove it; moved to draft 18 Oct, URL now 404s -> please 301 it to /blog/ and drop it from the sitemap.
- Roshan confirmed: 2-day return window and merchant name "EcoCart (ecocart.co.in)" stay.

## For the main EcoCart thread (theme/header/footer/products)
- Header mini-cart says "Free Shipping on All Orders Over $100" (false, and in dollars).
- Homepage build.py still says "Free delivery from ₹700" (top bar, marquee, stats) — free shipping is off.
- Product "Red mountain -double layer (customised)" (6504) has price ₹0.
- Footer: "Free from fixed and mobile phones in INDIA" under the phone number isn't true for a mobile number; newsletter promises "Rs 50 off" — check a coupon exists.
- Policies say a 2-day window; old About/Contact boxes said "Money back under 7 days" (removed from my pages). If Roshan wants 7 days, only the refund page text needs changing.

## Mobile pass (18 Oct night, 21:xx UTC)
- Phone CSS rewritten in build.py (block "phones (mobile-first pass)"): shorter heroes, full-width 50px buttons, swipeable chips and policy contents, compact 2x2 trust row, 2-column steps/team/gallery, 3-up policy "at a glance", 56px FAQ rows, 16px form inputs (no iOS zoom), full-width submit buttons. All 14 pages republished.
- Tested at 360/390/414 with a mobile UA. Note: LiteSpeed Guest Mode reloads the page once on first visit, so wait for the reload before measuring. Don't use ?m= as a cache-buster (WP treats it as a date archive and 404s).
- For the main thread (theme/plugins): the floating "Whatsapp Live Chat" pill sits over hero text on phones (shrink to an icon-only button above the bottom nav); the cookie popup covers about half the first screen on phones (make it a slim bottom bar).

## Morning list for Roshan
- Send yourself a test message from the Contact page form and check it reaches contact@ecocart.co.in.
- When all EcoCart threads say they're done: delete the "claude" WP user and its Application Password.

## 19 Oct: phone number
88919 06342 stopped working. build.py now uses 70120 45854 everywhere (WA_NUM 917012045854) and all 9 pages + 3 posts were republished from it, plus Rank Math meta on contact (2299) and order-tracking (2627).
