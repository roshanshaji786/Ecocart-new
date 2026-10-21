export type Img = { src: string; thumb: string; alt: string; mirror?: string; mirror_thumb?: string }
export type Variation = { id: number; attrs: Record<string, string>; price: number | null }
export type Attribute = { name: string; terms: string[] }

export type Product = {
  id: number
  slug: string
  name: string
  type: 'simple' | 'variable' | string
  summary: string
  description?: string
  price: number | null // paise
  regular_price: number | null
  price_max: number | null
  on_sale: boolean
  in_stock: boolean
  images: Img[]
  category_ids: number[]
  attributes: Attribute[]
  variations: Variation[]
  permalink: string
  menu_order: number
}

export type Category = { id: number; name: string; slug: string; parent: number; count: number }

export type Eco = {
  product_id: number
  material: string | null
  origin: string | null
  maker: string | null
  packaging: string | null
  plastic_free: boolean | null
  handmade: boolean | null
  plant_based: boolean | null
  biodegradable: boolean | null
  certifications: string[]
  notes: string | null
  verified: boolean
}

export type ImpactStat = { key: string; label: string; value: number; unit: string; note: string; sort: number }

export type CartLine = { key: string; productId: number; variationId?: number; options?: Record<string, string>; qty: number }
