import { ArrowRight, Gift, Leaf, Search, Shirt, ShieldCheck, Truck, Undo2, Soup, Sprout } from 'lucide-react'
import { ProductCard, GridSkeleton } from '../components/ui'
import { SECTIONS, inCategory } from '../lib/catalog'
import { useStore } from '../lib/store'

const ICONS = [Soup, Sprout, Gift, Shirt, Shirt]

export default function Home() {
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const eco = useStore((s) => s.eco)
  const listed = products.filter((p) => p.in_stock)
  const newIn = listed.slice(0, 10)
  const pantry = inCategory(listed, categories, 'eco-goods').slice(0, 10)
  const shell = inCategory(listed, categories, 'coconut-shell-products')
  const gifts = inCategory(listed, categories, 'gift').slice(0, 10)
  const verified = Object.keys(eco).length

  return (
    <div className="page">
      <section className="hero">
        <svg className="leaf" viewBox="0 0 64 64" aria-hidden>
          <path d="M46 16c-17 0-28 9-28 23 0 3 .6 5.7 1.7 8C23 36 30 29 41 25c-9 6-15 13-18 25 2.7 1.3 5.6 2 8.7 2C44 52 50 41 50 26c0-3.6-.5-7-1.4-10H46z" fill="#fff" />
        </svg>
        <h1>Good things from Kerala, honestly told.</h1>
        <p>Honey, ghee, spices, coconut and handmade coconut-shell goods from Thiruvananthapuram, with the facts behind every product.</p>
        <div className="row">
          <a className="btn accent" href="#/shop">
            Shop now <ArrowRight size={18} />
          </a>
          <a className="btn ghost" href="#/impact" style={{ background: 'transparent', color: '#fff', borderColor: 'rgb(255 255 255 / 35%)' }}>
            <Leaf size={18} /> How we rate products
          </a>
        </div>
      </section>

      <a className="search" href="#/search" aria-label="Search products">
        <Search size={18} />
        <div className="input" style={{ paddingLeft: 44, display: 'flex', alignItems: 'center', color: 'var(--muted)' }}>
          Search honey, ghee, thobes…
        </div>
      </a>

      <div className="facts">
        <div className="fact"><b>₹55</b><span>flat shipping, India-wide</span></div>
        <div className="fact"><b>UPI</b><span>& cards via Razorpay</span></div>
        <div className="fact"><b>2 days</b><span>to cancel or report damage</span></div>
      </div>

      <section className="stack">
        <h2>Shop by section</h2>
        <div className="tiles">
          {SECTIONS.map((s, i) => {
            const Icon = ICONS[i]
            return (
              <a key={s.slug} className="tile" href={`#/shop/${s.slug}`}>
                <Icon size={22} />
                <div>
                  <b>{s.label}</b>
                  <br />
                  <span>{s.hint}</span>
                </div>
              </a>
            )
          })}
          <a className="tile" href="#/impact" style={{ background: 'var(--brand-soft)' }}>
            <Leaf size={22} />
            <div>
              <b>Eco cards</b>
              <br />
              <span>{verified ? `${verified} products checked` : 'How we check products'}</span>
            </div>
          </a>
        </div>
      </section>

      <Row title="New in" href="#/shop" items={newIn} eager />
      <Row title="From the pantry" href="#/shop/eco-goods" items={pantry} />
      {shell.length > 0 && <Row title="Coconut shell, handmade" href="#/shop/coconut-shell-products" items={shell} />}
      <Row title="Gifts & hampers" href="#/shop/gift" items={gifts} />

      <section className="card pad stack">
        <h2>Our promise</h2>
        <ul className="clean promise">
          <li><Leaf size={20} /><span><b>Eco cards you can trust.</b> We only show a sustainability claim after we've checked it with the maker: material, origin, packaging.</span></li>
          <li><Truck size={20} /><span><b>Flat ₹55 shipping</b> on every order, anywhere in India. Delivery in 4 to 10 days.</span></li>
          <li><Undo2 size={20} /><span><b>Easy fixes.</b> Cancel within 2 days, or tell us about damage within 2 days of delivery. Refunds in 3 to 5 days.</span></li>
          <li><ShieldCheck size={20} /><span><b>Secure payment</b> with UPI and cards through Razorpay. No cash on delivery.</span></li>
        </ul>
      </section>
    </div>
  )
}

function Row({ title, href, items, eager }: { title: string; href: string; items: ReturnType<typeof useStore.getState>['products']; eager?: boolean }) {
  return (
    <section className="stack">
      <div className="section-head">
        <h2>{title}</h2>
        <a href={href}>See all</a>
      </div>
      {items.length ? (
        <div className="swipe">
          {items.map((p, i) => (
            <ProductCard key={p.id} p={p} eager={eager && i < 2} />
          ))}
        </div>
      ) : (
        <GridSkeleton n={2} />
      )}
    </section>
  )
}
