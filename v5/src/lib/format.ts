import type { Img, Product } from './types'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const rupees = (paise: number | null | undefined) => (paise == null ? '' : inr.format(Math.round(paise / 100)))

export const SHIPPING = 5500 // flat ₹55 on every order, India only

export const priceLabel = (p: Product) =>
  !p.price ? 'Price on request' : p.price_max ? `${rupees(p.price)} – ${rupees(p.price_max)}` : rupees(p.price)

export const offPercent = (p: Product) =>
  p.on_sale && p.regular_price && p.price && !p.price_max && p.regular_price > p.price
    ? Math.round((1 - p.price / p.regular_price) * 100)
    : 0

// Mirrored copies live in Supabase Storage; the originals are hotlink-protected, so they are
// requested without a referrer as a fallback.
export const thumbOf = (i?: Img) => i?.mirror_thumb || i?.thumb || ''
export const fullOf = (i?: Img) => i?.mirror || i?.src || ''

export const date = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export const WHATSAPP = '917012045854'
export const PHONE = '+91 70120 45854'
export const EMAIL = 'contact@ecocart.co.in'
export const STORE = 'https://ecocart.co.in'
