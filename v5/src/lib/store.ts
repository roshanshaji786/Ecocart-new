import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { configured, pub, supabase } from './supabase'
import { load, save } from './storage'
import type { CartLine, Category, Eco, ImpactStat, Product } from './types'

type Toast = { id: number; text: string }

type State = {
  products: Product[]
  categories: Category[]
  eco: Record<number, Eco>
  impact: ImpactStat[]
  loaded: 'none' | 'snapshot' | 'live'
  netError: boolean
  cart: CartLine[]
  wishlist: number[]
  session: Session | null
  isAdmin: boolean
  loginOpen: boolean
  toasts: Toast[]

  boot: () => Promise<void>
  refresh: () => Promise<void>
  loadDescription: (id: number) => Promise<void>
  addToCart: (productId: number, qty?: number, variationId?: number, options?: Record<string, string>) => void
  setQty: (key: string, qty: number) => void
  clearCart: () => void
  toggleWish: (productId: number) => Promise<void>
  setSession: (s: Session | null) => void
  openLogin: (open: boolean) => void
  toast: (text: string) => void
  saveEco: (eco: Eco) => Promise<string | null>
}

const LIST_COLS =
  'id,slug,name,type,summary,price,regular_price,price_max,on_sale,in_stock,images,category_ids,attributes,variations,permalink,menu_order'

const adminFrom = (s: Session | null) => Boolean(s?.user?.app_metadata?.admin)

export const useStore = create<State>((set, get) => ({
  products: [],
  categories: [],
  eco: {},
  impact: [],
  loaded: 'none',
  netError: false,
  cart: load<CartLine[]>('cart', []),
  wishlist: [],
  session: null,
  isAdmin: false,
  loginOpen: false,
  toasts: [],

  boot: async () => {
    // Bundled snapshot first so the first paint has real products, then the live catalogue.
    const snap = (await import('../data/catalog.json')).default as { products: Product[]; categories: Category[] }
    if (get().loaded === 'none') set({ products: snap.products, categories: snap.categories, loaded: 'snapshot' })
    if (!configured) return
    void get().refresh()
    const { data } = await supabase.auth.getSession()
    get().setSession(data.session)
    supabase.auth.onAuthStateChange((_e, s) => get().setSession(s))
  },

  refresh: async () => {
    const [p, c, e, i] = await Promise.all([
      pub.from('products').select(LIST_COLS).eq('listed', true).order('menu_order'),
      pub.from('categories').select('id,name,slug,parent,count'),
      pub.from('product_eco').select('*').eq('verified', true),
      pub.from('impact_stats').select('*').order('sort'),
    ])
    if (p.error || !p.data?.length) {
      set({ netError: true })
      return
    }
    const old = new Map(get().products.map((x) => [x.id, x.description]))
    set({
      products: (p.data as Product[]).map((x) => ({ ...x, description: old.get(x.id) })),
      categories: (c.data as Category[]) ?? get().categories,
      eco: Object.fromEntries(((e.data as Eco[]) ?? []).map((x) => [x.product_id, x])),
      impact: (i.data as ImpactStat[]) ?? [],
      loaded: 'live',
      netError: false,
    })
  },

  loadDescription: async (id) => {
    if (!configured || get().products.find((p) => p.id === id)?.description !== undefined) return
    const { data } = await pub.from('products').select('description').eq('id', id).single()
    if (data) set({ products: get().products.map((p) => (p.id === id ? { ...p, description: data.description } : p)) })
  },

  addToCart: (productId, qty = 1, variationId, options) => {
    const key = `${productId}:${variationId ?? 0}`
    const cart = [...get().cart]
    const line = cart.find((l) => l.key === key)
    if (line) line.qty = Math.min(line.qty + qty, 20)
    else cart.push({ key, productId, variationId, options, qty })
    save('cart', cart)
    set({ cart })
    get().toast('Added to cart')
  },

  setQty: (key, qty) => {
    const cart = get().cart.map((l) => (l.key === key ? { ...l, qty } : l)).filter((l) => l.qty > 0)
    save('cart', cart)
    set({ cart })
  },

  clearCart: () => {
    save('cart', [])
    set({ cart: [] })
  },

  toggleWish: async (productId) => {
    const s = get().session
    if (!s) {
      set({ loginOpen: true })
      return
    }
    const has = get().wishlist.includes(productId)
    set({ wishlist: has ? get().wishlist.filter((x) => x !== productId) : [...get().wishlist, productId] })
    const { error } = has
      ? await supabase.from('wishlists').delete().eq('user_id', s.user.id).eq('product_id', productId)
      : await supabase.from('wishlists').insert({ user_id: s.user.id, product_id: productId })
    if (error) {
      get().toast('Could not save your wishlist. Try again.')
      set({ wishlist: has ? [...get().wishlist, productId] : get().wishlist.filter((x) => x !== productId) })
    } else get().toast(has ? 'Removed from wishlist' : 'Saved to wishlist')
  },

  setSession: (session) => {
    const changed = session?.user?.id !== get().session?.user?.id
    set({ session, isAdmin: adminFrom(session), loginOpen: session ? false : get().loginOpen })
    if (!changed) return
    if (!session) {
      set({ wishlist: [] })
      return
    }
    void supabase
      .from('wishlists')
      .select('product_id')
      .then(({ data }) => set({ wishlist: (data ?? []).map((r) => r.product_id as number) }))
  },

  openLogin: (loginOpen) => set({ loginOpen }),

  toast: (text) => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, text }] })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2600)
  },

  saveEco: async (eco) => {
    const { error } = await supabase.from('product_eco').upsert(eco)
    if (error) return error.message
    const map = { ...get().eco }
    if (eco.verified) map[eco.product_id] = eco
    else delete map[eco.product_id]
    set({ eco: map })
    return null
  },
}))

export const productBySlug = (slug?: string) => useStore.getState().products.find((p) => p.slug === slug)
