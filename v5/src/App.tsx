import { lazy, Suspense, useEffect, useState } from 'react'
import { Home as HomeIcon, Leaf, Menu, Search, ShoppingBag, ShoppingCart, Store, User, X } from 'lucide-react'
import LoginSheet from './components/LoginSheet'
import { parse, type Route } from './lib/route'
import { useStore } from './lib/store'
import { EMAIL, PHONE } from './lib/format'
import { LOGO, STORE_PAGES } from './lib/site'
import { SiteImg } from './components/ui'
import Home from './views/Home'
import Shop from './views/Shop'
import Product from './views/Product'
import Cart from './views/Cart'
import Impact from './views/Impact'
import Account from './views/Account'

const YEAR = new Date().getFullYear()
const Admin = lazy(() => import('./views/Admin'))

const TABS = [
  { name: 'home', href: '#/', label: 'Home', Icon: HomeIcon },
  { name: 'shop', href: '#/shop', label: 'Shop', Icon: Store },
  { name: 'impact', href: '#/impact', label: 'Eco cards', Icon: Leaf },
  { name: 'cart', href: '#/cart', label: 'Cart', Icon: ShoppingBag },
  { name: 'account', href: '#/account', label: 'Account', Icon: User },
]

export default function App() {
  const [route, setRoute] = useState<Route>(parse)
  const cartCount = useStore((s) => s.cart.reduce((n, l) => n + l.qty, 0))
  const toasts = useStore((s) => s.toasts)
  const netError = useStore((s) => s.netError)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    void useStore.getState().boot()
    const onHash = () => {
      setRoute(parse())
      setMenu(false)
    }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  const active = route.name === 'p' || route.name === 'search' ? 'shop' : route.name === 'admin' ? 'account' : route.name

  return (
    <>
      <div className="glow" aria-hidden />
      <p className="bar">Delivered across India · Call or WhatsApp <a href={`tel:${PHONE.replace(/\s/g, '')}`}>{PHONE}</a></p>
      <header className="nav">
        <a className="logo" href="#/" aria-label="EcoCart home">
          <SiteImg img={LOGO} alt="ecocart.co.in" eager />
          <span>EcoCart</span>
        </a>
        <nav className="links" aria-label="Main">
          <a href="#/shop" aria-current={route.name === 'shop' && !route.param ? 'page' : undefined}>Shop</a>
          <a href="#/shop/eco-goods">Eco Goods</a>
          <a href="#/shop/gift">Gifts</a>
          <a href="#/shop/thobes-shirts-2">Thobes</a>
          <a href="#/p/better-honey-a-delicious-fusion-of-honey-and-dry-fruits">Better Honey</a>
          <a href="#/impact">Eco cards</a>
          <a href={STORE_PAGES.blog} target="_blank" rel="noopener">Blog</a>
        </nav>
        <div className="tools">
          <a className="ic" href="#/search" aria-label="Search"><Search size={19} /></a>
          <a className="ic" href="#/account" aria-label="Account"><User size={19} /></a>
          <a className="ic" href="#/cart" aria-label={`Cart, ${cartCount} items`}>
            <ShoppingCart size={19} />
            {cartCount > 0 && <b>{cartCount}</b>}
          </a>
          <button className="ic menu-btn" type="button" aria-label="Open menu" onClick={() => setMenu(true)}><Menu size={19} /></button>
        </div>
      </header>
      {menu && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => (e.target as HTMLElement).closest('a') && setMenu(false)}>
          <button className="ic x" type="button" aria-label="Close menu" onClick={() => setMenu(false)}><X size={19} /></button>
          <a href="#/shop">Shop all</a>
          <a href="#/shop/eco-goods">Eco Goods</a>
          <a href="#/shop/gift">Gifts</a>
          <a href="#/shop/thobes-shirts-2">Thobes</a>
          <a href="#/shop/women">Women</a>
          <a href="#/p/better-honey-a-delicious-fusion-of-honey-and-dry-fruits">Better Honey</a>
          <a href="#/impact">Eco cards</a>
          <a href={STORE_PAGES.blog} target="_blank" rel="noopener">Blog</a>
          <a href="#/account">My account</a>
          <a href={STORE_PAGES.contact} target="_blank" rel="noopener">Contact</a>
        </div>
      )}

      <main>
        {netError && <p className="notice" style={{ margin: '12px 16px 0' }}>You're offline or our server is slow. Showing saved products.</p>}
        <View route={route} />
      </main>

      <footer className="site">
        <div className="in">
          <div className="fcols">
            <div>
              <a className="logo" href="#/"><SiteImg img={LOGO} alt="EcoCart logo" /><span style={{ display: 'inline' }}>EcoCart</span></a>
              <p className="muted" style={{ marginTop: 16, fontSize: 15, maxWidth: 320 }}>Eco friendly products, personalised gifts and natural foods, right from source. Kerala, India.</p>
            </div>
            <div>
              <h4>Shop</h4>
              <ul>
                <li><a href="#/shop">All products</a></li>
                <li><a href="#/shop/eco-goods">Eco Goods</a></li>
                <li><a href="#/shop/gift">Gifts</a></li>
                <li><a href="#/shop/men">Men</a></li>
                <li><a href="#/shop/women">Women</a></li>
                <li><a href="#/impact">Eco cards</a></li>
              </ul>
            </div>
            <div>
              <h4>Let us help you</h4>
              <ul>
                <li><a href={STORE_PAGES.orders} target="_blank" rel="noopener">Your orders</a></li>
                <li><a href={STORE_PAGES.tracking} target="_blank" rel="noopener">Track your order</a></li>
                <li><a href={STORE_PAGES.shipping} target="_blank" rel="noopener">Shipping and delivery</a></li>
                <li><a href={STORE_PAGES.returns} target="_blank" rel="noopener">Returns &amp; replacements</a></li>
                <li><a href={STORE_PAGES.faq} target="_blank" rel="noopener">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><a href={STORE_PAGES.about} target="_blank" rel="noopener">About us</a></li>
                <li><a href={`mailto:${EMAIL}`}>Contact</a></li>
                <li><a href={STORE_PAGES.blog} target="_blank" rel="noopener">Blog</a></li>
                <li><a href={STORE_PAGES.privacy} target="_blank" rel="noopener">Privacy policy</a></li>
                <li><a href={STORE_PAGES.terms} target="_blank" rel="noopener">Terms and conditions</a></li>
              </ul>
            </div>
          </div>
          <div className="fine">
            <span>Copyright {YEAR} © EcoCart. All rights reserved.</span>
            <span>We accept UPI, cards &amp; net banking via Razorpay</span>
          </div>
        </div>
      </footer>

      <nav className="tabbar" aria-label="Main">
        {TABS.map(({ name, href, label, Icon }) => (
          <a key={name} href={href} aria-current={active === name ? 'page' : undefined}>
            <Icon size={22} strokeWidth={active === name ? 2.4 : 1.9} />
            {label}
            {name === 'cart' && cartCount > 0 && <span className="badge">{cartCount}</span>}
          </a>
        ))}
      </nav>

      <LoginSheet />
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
      </div>
    </>
  )
}

function View({ route }: { route: Route }) {
  switch (route.name) {
    case 'shop':
      return <Shop key={route.param ?? 'all'} category={route.param} />
    case 'search':
      return <Shop key="search" searchMode query={route.query.get('q') ?? ''} />
    case 'p':
      return <Product slug={route.param} />
    case 'cart':
      return <Cart />
    case 'impact':
      return <Impact />
    case 'account':
      return <Account />
    case 'admin':
      return (
        <Suspense fallback={<div className="page"><div className="skeleton" style={{ height: 240 }} /></div>}>
          <Admin />
        </Suspense>
      )
    default:
      return <Home />
  }
}
