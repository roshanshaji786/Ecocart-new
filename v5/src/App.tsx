import { lazy, Suspense, useEffect, useState } from 'react'
import { Home as HomeIcon, Leaf, Search, ShoppingBag, Store, User } from 'lucide-react'
import LoginSheet from './components/LoginSheet'
import { parse, type Route } from './lib/route'
import { useStore } from './lib/store'
import { EMAIL, PHONE } from './lib/format'
import Home from './views/Home'
import Shop from './views/Shop'
import Product from './views/Product'
import Cart from './views/Cart'
import Impact from './views/Impact'
import Account from './views/Account'

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

  useEffect(() => {
    void useStore.getState().boot()
    const onHash = () => setRoute(parse())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  const active = route.name === 'p' || route.name === 'search' ? 'shop' : route.name === 'admin' ? 'account' : route.name

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/" aria-label="EcoCart home">
          <img src="/favicon.svg" alt="" width={30} height={30} />
          EcoCart
        </a>
        <span className="spacer" />
        <a className="icon-btn" href="#/search" aria-label="Search"><Search size={22} /></a>
        <a className="icon-btn" href="#/cart" aria-label={`Cart, ${cartCount} items`}>
          <ShoppingBag size={22} />
          {cartCount > 0 && <span className="badge" style={{ top: 2, left: 26 }}>{cartCount}</span>}
        </a>
      </header>

      <main>
        {netError && <p className="notice" style={{ margin: '12px 16px 0' }}>You're offline or our server is slow. Showing saved products.</p>}
        <View route={route} />
        <footer className="site">
          <b style={{ color: 'var(--text)' }}>EcoCart (ecocart.co.in)</b>
          <span>Thiruvananthapuram, Kerala · <a href={`mailto:${EMAIL}`}>{EMAIL}</a> · {PHONE}</span>
          <span>Flat ₹55 shipping across India · UPI & cards via Razorpay · No COD</span>
        </footer>
      </main>

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
