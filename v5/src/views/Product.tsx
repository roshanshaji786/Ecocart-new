import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Heart, Leaf, MessageCircle, Minus, PackageSearch, Plus, Share2, Truck } from 'lucide-react'
import { Empty, Photo, Price, ProductCard } from '../components/ui'
import { CHECKOUT_TAB, STORE, WHATSAPP, checkoutUrl, rupees } from '../lib/format'
import { productBySlug, useStore } from '../lib/store'
import type { Eco, Product as P } from '../lib/types'

export default function Product({ slug }: { slug?: string }) {
  const products = useStore((s) => s.products)
  const p = useMemo(() => products.find((x) => x.slug === slug), [products, slug])
  if (!products.length) return <div className="page"><div className="skeleton" style={{ aspectRatio: '1' }} /></div>
  if (!p)
    return (
      <div className="page">
        <Empty icon={<PackageSearch size={40} />} title="We couldn't find that product">
          <p className="muted">It may have sold out or moved.</p>
          <a className="btn ghost" href="#/shop">Browse the shop</a>
        </Empty>
      </div>
    )
  return <ProductView key={p.id} p={p} />
}

function ProductView({ p }: { p: P }) {
  const eco = useStore((s) => s.eco[p.id])
  const wished = useStore((s) => s.wishlist.includes(p.id))
  const { addToCart, toggleWish, loadDescription, toast } = useStore.getState()
  const products = useStore((s) => s.products)
  const [opts, setOpts] = useState<Record<string, string>>({})
  const [qty, setQty] = useState(1)
  const [slide, setSlide] = useState(0)
  const [more, setMore] = useState(false)
  const buyRef = useRef<HTMLDivElement>(null)
  const [showBar, setShowBar] = useState(false)

  useEffect(() => {
    void loadDescription(p.id)
    document.title = `${p.name} · EcoCart`
    return () => { document.title = 'EcoCart · Eco-friendly products & personalised gifts' }
  }, [p.id, p.name, loadDescription])

  useEffect(() => {
    const el = buyRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const variable = p.attributes.length > 0 && p.variations.length > 0
  const chosen = variable ? p.variations.find((v) => p.attributes.every((a) => v.attrs[a.name] === opts[a.name])) : undefined
  const ready = !variable || Boolean(chosen)
  const unitPrice = (chosen ? chosen.price : p.price_max ? null : p.price) || null
  const priceless = ready && !unitPrice // no price set in WooCommerce: ask instead of adding
  const possible = (name: string, term: string) =>
    p.variations.some((v) => v.attrs[name] === term && p.attributes.every((a) => a.name === name || !opts[a.name] || v.attrs[a.name] === opts[a.name]))

  const add = () => {
    if (!ready) {
      toast(`Choose ${p.attributes.filter((a) => !opts[a.name]).map((a) => a.name).join(' and ')}`)
      buyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    addToCart(p.id, qty, chosen?.id, chosen ? opts : undefined)
  }

  const related = products.filter((x) => x.id !== p.id && x.in_stock && x.category_ids.some((c) => p.category_ids.includes(c))).slice(0, 8)
  const paras = (p.description ?? '').split('\n\n').filter(Boolean)
  const share = async () => {
    const url = location.href
    try {
      if (navigator.share) await navigator.share({ title: p.name, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('Link copied')
      }
    } catch { /* cancelled */ }
  }
  const ask = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi EcoCart, I have a question about ${p.name}: ${location.href}`)}`

  return (
    <div className="page">
      <div className="product-layout">
        <div className="stack">
          <div
            className="gallery"
            onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          >
            {p.images.length ? (
              p.images.map((img, i) => <div className="slide" key={img.src}><Photo img={img} full eager={i === 0} /></div>)
            ) : (
              <div className="slide"><Photo /></div>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="dots" aria-hidden>
              {p.images.map((img, i) => <i key={img.src} className={i === slide ? 'on' : ''} />)}
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="stack" style={{ gap: 6 }}>
            <h1 style={{ fontSize: 26 }}>{p.name}</h1>
            <div className="row between">
              {chosen?.price ? <div className="price" style={{ fontSize: 22 }}>{rupees(chosen.price)}</div> : <div style={{ fontSize: 20 }}><Price p={p} /></div>}
              <div className="row" style={{ gap: 0 }}>
                <button className="icon-btn" aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'} onClick={() => toggleWish(p.id)}>
                  <Heart size={22} fill={wished ? 'var(--danger)' : 'none'} color={wished ? 'var(--danger)' : 'currentColor'} />
                </button>
                <button className="icon-btn" aria-label="Share" onClick={share}>
                  <Share2 size={21} />
                </button>
              </div>
            </div>
            {!p.in_stock && <p style={{ color: 'var(--danger)', fontWeight: 600 }}>Sold out right now</p>}
          </div>

          <div ref={buyRef} className="stack" style={{ gap: 14 }}>
            {variable && p.attributes.map((a) => (
              <fieldset key={a.name} style={{ border: 0, padding: 0, margin: 0 }} className="stack">
                <legend style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: 8 }}>
                  {a.name}{opts[a.name] ? `: ${opts[a.name]}` : ''}
                </legend>
                <div className="opts">
                  {a.terms.filter((t) => p.variations.some((v) => v.attrs[a.name] === t)).map((t) => (
                    <button
                      key={t}
                      className="opt"
                      aria-pressed={opts[a.name] === t}
                      disabled={!possible(a.name, t)}
                      onClick={() => setOpts({ ...opts, [a.name]: opts[a.name] === t ? '' : t })}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            {p.in_stock && priceless && (
              <a className="btn wa block" href={ask} target="_blank" rel="noopener"><MessageCircle size={18} /> Ask for the price on WhatsApp</a>
            )}
            {p.in_stock && !priceless && (
              <div className="row">
                <div className="qty" role="group" aria-label="Quantity">
                  <button aria-label="One less" onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={18} /></button>
                  <output aria-live="polite">{qty}</output>
                  <button aria-label="One more" onClick={() => setQty(Math.min(20, qty + 1))}><Plus size={18} /></button>
                </div>
                <button className="btn primary" style={{ flex: 1 }} onClick={add}>
                  Add to basket{unitPrice ? ` · ${rupees(unitPrice * qty)}` : ''}
                </button>
              </div>
            )}
            {p.in_stock && !priceless && ready && (
              <a className="btn sr block" href={checkoutUrl(chosen?.id ?? p.id, qty)} target={CHECKOUT_TAB}>
                Buy now with Shiprocket <ExternalLink size={17} />
              </a>
            )}
            <p className="small muted row" style={{ alignItems: 'flex-start' }}>
              <Truck size={18} style={{ flex: 'none' }} /> Flat ₹55 shipping per order. Delivered in 4 to 10 days anywhere in India.
            </p>
          </div>

          <EcoCard eco={eco} />

          {p.summary.length > 60 && <p style={{ fontSize: 16 }}>{p.summary}</p>}

          {paras.length > 0 && (
            <section className="stack">
              <h2>About this product</h2>
              <div className={`desc ${more ? '' : 'clamp'}`}>{paras.map((t, i) => <p key={i}>{t}</p>)}</div>
              {!more && paras.join('').length > 500 && (
                <button className="link-btn" style={{ justifySelf: 'start' }} onClick={() => setMore(true)}>Read full description</button>
              )}
            </section>
          )}

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <a className="btn ghost" href={ask} target="_blank" rel="noopener"><MessageCircle size={18} /> Ask on WhatsApp</a>
            <a className="btn ghost" href={p.permalink || STORE} target="_blank" rel="noopener"><ExternalLink size={18} /> View on ecocart.co.in</a>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="stack">
          <h2>You may also like</h2>
          <div className="swipe">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}

      {showBar && p.in_stock && !priceless && (
        <div className="buybar">
          <div style={{ minWidth: 0 }}>
            <div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '40vw' }}>{p.name}</div>
            <div className="price">{unitPrice ? rupees(unitPrice) : rupees(p.price)}</div>
          </div>
          <button className="btn primary" onClick={add}>{ready ? 'Add to basket' : 'Choose options'}</button>
        </div>
      )}
    </div>
  )
}

const YES: [keyof Eco, string][] = [
  ['plastic_free', 'Plastic-free'],
  ['handmade', 'Handmade'],
  ['plant_based', 'Plant-based'],
  ['biodegradable', 'Biodegradable'],
]

export function EcoCard({ eco }: { eco?: Eco }) {
  if (!eco)
    return (
      <div className="eco-pending">
        <h3 className="row" style={{ gap: 8 }}><Leaf size={18} color="var(--brand)" /> Eco card coming soon</h3>
        <p className="small muted">
          We're checking this product's materials, origin and packaging with the maker. We only show claims once they're checked. <a href="#/impact">How it works</a>
        </p>
      </div>
    )
  const rows: [string, string | null][] = [
    ['Material', eco.material],
    ['Made in', eco.origin],
    ['Made by', eco.maker],
    ['Packaging', eco.packaging],
  ]
  return (
    <section className="eco-card" aria-label="Eco card">
      <h3><Leaf size={18} /> Eco card · checked</h3>
      <div className="chips">
        {YES.filter(([k]) => eco[k] === true).map(([k, label]) => <span key={k} className="chip">✓ {label}</span>)}
        {eco.certifications.map((c) => <span key={c} className="chip">{c}</span>)}
      </div>
      <dl className="eco-list" style={{ margin: 0 }}>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      {eco.notes && <p className="small">{eco.notes}</p>}
    </section>
  )
}

export { productBySlug }
