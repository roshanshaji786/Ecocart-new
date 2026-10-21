import { useState } from 'react'
import { CheckCircle2, ExternalLink, MessageCircle, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react'
import { Empty, Photo } from '../components/ui'
import { CHECKOUT_TAB, SHIPPING, STORE, WHATSAPP, checkoutUrl, rupees } from '../lib/format'
import { useStore } from '../lib/store'
import type { CartLine, Product } from '../lib/types'

const unitOf = (p: Product, l: CartLine) =>
  (l.variationId ? p.variations.find((v) => v.id === l.variationId)?.price : p.price_max ? null : p.price) || null

// Payment happens in Shiprocket Checkout, which lives on the ecocart.co.in cart page. WooCommerce adds
// one item per link (?add-to-cart=), so every line gets its own button. They all open the same named
// tab, so the items collect in one basket there.
const addUrl = (l: CartLine) => checkoutUrl(l.variationId ?? l.productId, l.qty)

export default function Cart() {
  const cart = useStore((s) => s.cart)
  const products = useStore((s) => s.products)
  const { setQty, clearCart } = useStore.getState()
  const [sent, setSent] = useState<Record<string, boolean>>({})

  const lines = cart
    .map((l) => ({ l, p: products.find((p) => p.id === l.productId) }))
    .filter((x): x is { l: CartLine; p: Product } => Boolean(x.p))
  if (!products.length) return <div className="page"><div className="skeleton" style={{ height: 200 }} /></div>
  if (!lines.length)
    return (
      <div className="page">
        <Empty icon={<ShoppingBag size={44} />} title="Your cart is empty">
          <p className="muted">Honey, ghee, spices and handmade coconut-shell goods are waiting.</p>
          <a className="btn primary" href="#/shop">Start shopping</a>
        </Empty>
      </div>
    )

  const subtotal = lines.reduce((s, { l, p }) => s + (unitOf(p, l) ?? 0) * l.qty, 0)
  const unknown = lines.some(({ l, p }) => unitOf(p, l) == null)
  const total = subtotal + SHIPPING
  const message = [
    'Hi EcoCart, I would like to order:',
    ...lines.map(({ l, p }) => `• ${p.name}${l.options ? ` (${Object.values(l.options).join(', ')})` : ''} × ${l.qty}`),
    `Total: ${rupees(total)} incl. ₹55 shipping`,
  ].join('\n')
  const allSent = lines.every(({ l }) => sent[l.key])

  return (
    <div className="page">
      <div className="row between">
        <h1>Cart</h1>
        <button className="link-btn" style={{ color: 'var(--muted)' }} onClick={() => confirm('Remove everything from your cart?') && clearCart()}>
          Clear
        </button>
      </div>

      <section className="card pad">
        {lines.map(({ l, p }) => {
          const unit = unitOf(p, l)
          return (
            <div className="line" key={l.key}>
              <a className="thumb" href={`#/p/${p.slug}`} aria-hidden tabIndex={-1}><Photo img={p.images[0]} /></a>
              <div className="stack" style={{ gap: 6, minWidth: 0 }}>
                <a href={`#/p/${p.slug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500, lineHeight: 1.3 }}>{p.name}</a>
                {l.options && <span className="tiny muted">{Object.entries(l.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span>}
                <div className="row between">
                  <div className="qty" role="group" aria-label={`Quantity of ${p.name}`}>
                    <button aria-label={l.qty === 1 ? 'Remove' : 'One less'} onClick={() => setQty(l.key, l.qty - 1)}>
                      {l.qty === 1 ? <Trash2 size={17} /> : <Minus size={17} />}
                    </button>
                    <output>{l.qty}</output>
                    <button aria-label="One more" onClick={() => setQty(l.key, Math.min(20, l.qty + 1))}><Plus size={17} /></button>
                  </div>
                  <b>{unit ? rupees(unit * l.qty) : 'See price'}</b>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="card pad totals">
        <div className="row"><span>Items</span><span>{rupees(subtotal)}</span></div>
        <div className="row"><span>Shipping (flat, India-wide)</span><span>{rupees(SHIPPING)}</span></div>
        <div className="row grand"><span>Total</span><span>{rupees(total)}{unknown ? '+' : ''}</span></div>
        <p className="tiny muted">Secure payments via Razorpay and Shiprocket Checkout: UPI, cards and net banking. No cash on delivery.</p>
      </section>

      <section className="card pad stack">
        <h2>Checkout</h2>
        <p className="sr-note"><ShieldCheck size={18} /> You'll pay in Shiprocket Checkout on ecocart.co.in, our secure checkout. Your basket opens there with these items.</p>
        {lines.length === 1 ? (
          <a className="btn sr block" href={addUrl(lines[0].l)} target={CHECKOUT_TAB}>
            Checkout with Shiprocket <ExternalLink size={18} />
          </a>
        ) : (
          <ol className="clean steps">
            {lines.map(({ l, p }) => (
              <li key={l.key}>
                <a
                  className={`btn ${sent[l.key] ? 'ghost' : 'primary'} block`}
                  style={{ justifyContent: 'space-between', whiteSpace: 'normal', textAlign: 'left', padding: '8px 16px' }}
                  href={addUrl(l)}
                  target={CHECKOUT_TAB}
                  onClick={() => setSent({ ...sent, [l.key]: true })}
                >
                  <span>Add {p.name.length > 32 ? p.name.slice(0, 30) + '…' : p.name} × {l.qty}</span>
                  {sent[l.key] ? <CheckCircle2 size={18} /> : <ExternalLink size={16} />}
                </a>
              </li>
            ))}
            <li>
              <a className={`btn ${allSent ? 'sr' : 'ghost'} block`} href={`${STORE}/cart/`} target={CHECKOUT_TAB}>
                Checkout with Shiprocket
              </a>
            </li>
          </ol>
        )}
        <div className="row" style={{ gap: 8 }}>
          <hr style={{ flex: 1, border: 0, borderTop: '1px solid var(--line)' }} />
          <span className="tiny muted">or</span>
          <hr style={{ flex: 1, border: 0, borderTop: '1px solid var(--line)' }} />
        </div>
        <a className="btn wa block" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener">
          <MessageCircle size={18} /> Order on WhatsApp
        </a>
      </section>
    </div>
  )
}
