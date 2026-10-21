import { useState } from 'react'
import { ArrowRight, AtSign, Mail, MessageCircle, Phone, Search } from 'lucide-react'
import { GridSkeleton, ProductCard, SiteImg } from '../components/ui'
import { SECTIONS, inCategory } from '../lib/catalog'
import { EMAIL, PHONE, WHATSAPP, priceLabel } from '../lib/format'
import { go } from '../lib/route'
import { CATEGORY_IMAGES, ECO_CHIPS, HONEY_IMAGE, REVIEW_IMAGES, STORE_PAGES } from '../lib/site'
import { useStore } from '../lib/store'
import type { Product } from '../lib/types'

// Same sections and copy as the ecocart.co.in homepage; product rows come from the live catalogue.
const MARQUEE = ['Offers on UPI', 'Delivered across India', 'Track your order', '5-star rated on Google', 'Chemical-free', 'Supports small businesses', 'Secure Razorpay checkout', 'Based in Thiruvananthapuram']
const VALUES = [
  ['Healthy products', 'Chemical-free, pure, farm-sourced for better health.'],
  ['We promote small business', 'Supporting small business entrepreneurs through our platform.'],
  ['Sustainability', 'By buying our products, you contribute positively to nature.'],
  ['Best price', 'Best prices, durable products, maximum savings assured.'],
  ['Secure checkout', 'Secure payments via Razorpay and Shiprocket Checkout.'],
]
const HONEY = 'better-honey-a-delicious-fusion-of-honey-and-dry-fruits'
const Arrow = () => <ArrowRight size={16} />

export default function Home() {
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const [tab, setTab] = useState<'all' | 'eco' | 'gift'>('all')
  const [q, setQ] = useState('')
  const listed = products.filter((p) => p.in_stock)
  const sale = (l: Product[]) => [...l.filter((p) => p.on_sale), ...l.filter((p) => !p.on_sale)]
  const eco = sale(inCategory(listed, categories, 'eco-goods')).slice(0, 10)
  const gifts = sale(inCategory(listed, categories, 'gift')).slice(0, 8)
  const deals = tab === 'eco' ? eco : tab === 'gift' ? gifts : [...eco, ...gifts]
  const thobes = sale(inCategory(listed, categories, 'thobes-shirts-2')).slice(0, 10)
  const honey = products.find((p) => p.slug === HONEY)
  const count = (slug: string) => inCategory(products, categories, slug).length

  return (
    <div className="ec">
      <section className="hero">
        <div className="wrap">
          <span className="eyebrow"><i />Since 2021 · Made in Kerala</span>
          <h1>
            <span>Eco-friendly products</span>
            <span>&amp; personalised gifts,</span>
            <span className="serif grad">right from source.</span>
          </h1>
          <p className="lede">
            Chemical-free honey, coconut goods, spices and natural soaps from small Kerala makers, plus handmade gift hampers and premium thobes. Delivered across India.
          </p>
          <div className="ctas">
            <a className="btn" href="#/shop/eco-goods">Shop eco goods <Arrow /></a>
            <a className="btn ghost" href="#/shop/gift">Explore gifts</a>
          </div>
          <form
            className="hsearch"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              go(`#/search?q=${encodeURIComponent(q.trim())}`)
            }}
          >
            <label htmlFor="ec-s" className="sr-only">Search products</label>
            <input id="ec-s" type="search" enterKeyHint="search" placeholder="Search honey, coconut oil, thobes…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" aria-label="Search"><Search size={18} /></button>
          </form>
          <div className="stats">
            <div><b>{products.length ? `${products.length}+` : '94+'}</b><span>natural products</span></div>
            <div><b>5★</b><span>Google rating</span></div>
            <div><b>4–10</b><span>days, pan-India delivery</span></div>
            <div><b>2021</b><span>serving since</span></div>
          </div>
        </div>
      </section>

      <div className="mq" aria-hidden>
        <div className="mq-in">{[...MARQUEE, ...MARQUEE].map((t, i) => <span key={i}>{t}</span>)}</div>
      </div>

      <section className="sec" id="why">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="kick">Welcome to EcoCart</span>
              <h2>Why buy from us <span className="serif grad">♻</span></h2>
            </div>
            <p>Promoting health, supporting small businesses, and ensuring sustainability with the best prices and secure checkout.</p>
          </div>
          <div className="vals">
            {VALUES.map(([t, d], i) => (
              <div className="val" key={t}>
                <span className="n">0{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="shop">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="kick">Shop by category</span>
              <h2>Green goodies galore.</h2>
            </div>
            <a className="more" href="#/shop">View all products <Arrow /></a>
          </div>
          <div className="cats">
            {SECTIONS.map((s, i) => (
              <a key={s.slug} className={`cat${i === 0 ? ' big' : ''}`} href={`#/shop/${s.slug}`}>
                <SiteImg img={CATEGORY_IMAGES[s.slug]} alt={s.label} eager={i === 0} />
                <small>{s.slug === 'coconut-shell-products' ? 'HANDMADE' : `${count(s.slug) || ''} PRODUCTS`}</small>
                <h3>{s.label}</h3>
                <p>{s.hint}</p>
              </a>
            ))}
          </div>
          <nav className="chips" aria-label="Eco goods categories">
            {ECO_CHIPS.map(([slug, label]) => <a key={slug} href={`#/shop/${slug}`}>{label}</a>)}
          </nav>
        </div>
      </section>

      <section className="sec" id="honey">
        <div className="wrap spot">
          <a className="tilt" href={`#/p/${HONEY}`} aria-label="Better Honey"><SiteImg img={HONEY_IMAGE} alt="Better Honey with dry fruits by EcoCart" /></a>
          <div>
            <span className="kick">Top seller</span>
            <h2 style={{ marginTop: 10 }}>Better Honey <span className="serif grad">| A Delicious Fusion of Honey and Dry Fruits</span></h2>
            <p className="sub">Experience the exquisite taste of nature with our Better Honey, a top seller on Ecocart.</p>
            <ul className="clean ticks">
              <li>Pure honey with premium dry fruits</li>
              <li>No added sugar or preservatives</li>
              <li>A healthy gift for loved ones</li>
            </ul>
            <p className="bigprice">{honey ? priceLabel(honey) : '₹450 – ₹630'}</p>
            <div className="ctas">
              <a className="btn" href={`#/p/${HONEY}`}>Buy Better Honey <Arrow /></a>
              <a className="btn ghost" href={STORE_PAGES.betterHoney} target="_blank" rel="noopener">Read the story</a>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="deals">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="kick">The best discounts this week</span>
              <h2>Don't miss this week's sales</h2>
            </div>
            <div className="tabs" role="tablist" aria-label="Filter sales">
              {(['all', 'eco', 'gift'] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                  {t === 'all' ? 'All' : t === 'eco' ? 'Eco Goods' : 'Gifts'}
                </button>
              ))}
            </div>
          </div>
          <Row items={deals} eager />
        </div>
      </section>

      <section className="sec" id="thobes">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="kick">Get the best outfit of your life</span>
              <h2>Best seller products</h2>
            </div>
            <a className="more" href="#/shop/thobes-shirts-2">All thobes <Arrow /></a>
          </div>
          <Row items={thobes} />
        </div>
      </section>

      <section className="sec" id="reviews">
        <div className="wrap trust">
          <div>
            <span className="kick">Testimonials</span>
            <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
            <h2>We are proud to hold a 5-star rating on Google Business.</h2>
            <p className="muted" style={{ marginTop: 16 }}>
              Reflecting our commitment to excellence and customer satisfaction. Go ahead and place your orders for your loved ones with confidence.
            </p>
            <blockquote>
              “The product was worth the money. Tasty and healthy. Quality nuts and honey. Variety taste. Delivered before expected date. Very happy!”
              <cite>Nivedita, EcoCart customer</cite>
            </blockquote>
          </div>
          <div className="reviews">
            {REVIEW_IMAGES.map((img, i) => (
              <figure key={img.src}><SiteImg img={img} alt={`EcoCart customer review ${i + 1}`} /></figure>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="about">
        <div className="wrap">
          <div className="founder">
            <div>
              <span className="kick">#Trustme</span>
              <p className="big">
                Established in 2021, our <a href={STORE_PAGES.instagram} className="grad" target="_blank" rel="noopener">Instagram</a> showcases our passion for eco-friendly products. Over the years, we've garnered trust through delivering numerous orders with excellence.
              </p>
              <p className="sig"><b>Roshan Shaji</b> · Founder, EcoCart</p>
              <div className="ctas">
                <a className="btn ghost" href={STORE_PAGES.about} target="_blank" rel="noopener">About us</a>
                <a className="btn ghost" href={STORE_PAGES.blog} target="_blank" rel="noopener">Visit our blog</a>
              </div>
            </div>
            <div className="help">
              <a href={`tel:${PHONE.replace(/\s/g, '')}`}><Phone size={22} /><span>Call {PHONE.replace(/\D/g, '').slice(2)}<small>Mon – Fri, 9 AM – 6 PM</small></span></a>
              <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hi EcoCart, I have a question')}`} target="_blank" rel="noopener">
                <MessageCircle size={22} /><span>WhatsApp {PHONE}<small>Quick replies on orders</small></span>
              </a>
              <a href={`mailto:${EMAIL}`}><Mail size={22} /><span>{EMAIL}<small>Write to us anytime</small></span></a>
              <a href={STORE_PAGES.instagram} target="_blank" rel="noopener"><AtSign size={22} /><span>@ecocart.co.in<small>Follow us on Instagram</small></span></a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Row({ items, eager }: { items: Product[]; eager?: boolean }) {
  if (!items.length) return <GridSkeleton n={2} />
  return (
    <div className="swipe">
      {items.map((p, i) => <ProductCard key={p.id} p={p} eager={eager && i < 2} />)}
    </div>
  )
}
