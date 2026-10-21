// Homepage images and the logo, copied from ecocart.co.in into Supabase Storage by
// `sync-catalog?assets=1`. The originals block other sites' referrers, so they are the fallback.
const base = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/storage/v1/object/public/catalog/site/`
const UP = 'https://ecocart.co.in/wp-content/uploads/'

export type SiteImage = { src: string; fallback: string }
const img = (path: string): SiteImage => ({ src: base + path.split('/').pop(), fallback: UP + path })

export const LOGO = img('2024/05/ecocart-removebg.png')
export const CATEGORY_IMAGES: Record<string, SiteImage> = {
  'eco-goods': img('2024/05/isabela-kronemberger-QXaTcvJEc-8-unsplash-1.jpg'),
  gift: img('2024/05/creatella_2-16-05-2024-0001-transformed-1-500x667.png'),
  men: img('2024/05/IMG-20240504-WA0222.jpg'),
  'coconut-shell-products': img('2024/08/7.jpg'),
  women: img('2023/04/dresses-1-2.jpg'),
}
export const HONEY_IMAGE = img('2024/07/IMG_20240726_010543-transformed-500x667.jpeg')
export const REVIEW_IMAGES = [1, 2, 3, 4, 7].map((n) => img(`2024/08/Neutral-Minimalist-Testimonials-Instagram-${n}-768x768.jpg`))

export const ECO_CHIPS = [
  ['honey', 'Honey'], ['virgin-coconut-oil', 'Virgin Coconut Oil'], ['coconut-products', 'Coconut Products'],
  ['greennuts', 'GreenNuts'], ['spices-eco-goods', 'Spices'], ['ghee-eco-goods', 'Ghee'], ['grains-flours', 'Grains & Flours'],
  ['homemade-soaps', 'Homemade Soaps'], ['beauty-products', 'Beauty Products'], ['bamboo-tissue', 'Bamboo Tissue'],
  ['natural-organic-sweeteners', 'Natural Sweeteners'], ['pure-pack', 'Pure Pack'],
] as const

// Pages that only exist on the main site; v5 links out to them.
export const STORE_PAGES = {
  blog: 'https://ecocart.co.in/blog/',
  about: 'https://ecocart.co.in/about-us/',
  contact: 'https://ecocart.co.in/contact/',
  betterHoney: 'https://ecocart.co.in/better-honey/',
  tracking: 'https://ecocart.co.in/order-tracking/',
  orders: 'https://ecocart.co.in/my-account/',
  shipping: 'https://ecocart.co.in/shipping-and-delivery/',
  returns: 'https://ecocart.co.in/refund_returns-2/',
  faq: 'https://ecocart.co.in/faq/',
  privacy: 'https://ecocart.co.in/privacy-policy-2/',
  terms: 'https://ecocart.co.in/terms-and-conditions/',
  instagram: 'https://www.instagram.com/ecocart.co.in',
}
