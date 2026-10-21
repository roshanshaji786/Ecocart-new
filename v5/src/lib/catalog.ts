import type { Category, Product } from './types'

// The store's top-level sections, in the order shoppers look for them.
export const SECTIONS = [
  { slug: 'eco-goods', label: 'Eco Goods', hint: 'All chemical free and right from the source.' },
  { slug: 'gift', label: 'Gifts', hint: 'Special gift, special person, special moment.' },
  { slug: 'men', label: 'Men', hint: 'Thobes, shirts, jackets & coats.' },
  { slug: 'coconut-shell-products', label: 'Coconut Shell', hint: 'Bowls, cups and decor, zero plastic.' },
  { slug: 'women', label: 'Women', hint: '"Green & Glam: elevating style, sustainably."' },
]

export const descendants = (cats: Category[], rootId: number) => {
  const ids = new Set([rootId])
  let grew = true
  while (grew) {
    grew = false
    for (const c of cats) if (!ids.has(c.id) && ids.has(c.parent)) ids.add(c.id), (grew = true)
  }
  return ids
}

export const inCategory = (products: Product[], cats: Category[], slug?: string) => {
  if (!slug) return products
  const root = cats.find((c) => c.slug === slug)
  if (!root) return []
  const ids = descendants(cats, root.id)
  return products.filter((p) => p.category_ids.some((id) => ids.has(id)))
}

export const searchProducts = (products: Product[], cats: Category[], q: string) => {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return products
  const catName = new Map(cats.map((c) => [c.id, c.name.toLowerCase()]))
  return products.filter((p) => {
    const hay = [p.name, p.summary, ...p.category_ids.map((id) => catName.get(id) ?? '')].join(' ').toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}
