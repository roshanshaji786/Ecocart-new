import { Factory, Hand, Leaf, MapPin, Package, Recycle, Sprout } from 'lucide-react'
import { useStore } from '../lib/store'
import { ProductCard } from '../components/ui'

const CHECKS = [
  { icon: Sprout, title: 'Material', text: 'What it is made of, down to the main ingredient or fibre.' },
  { icon: MapPin, title: 'Origin', text: 'Where it is grown or made, named as a place, not a slogan.' },
  { icon: Factory, title: 'Maker', text: 'Who makes it: a farm, a family kitchen, a co-op or a brand.' },
  { icon: Package, title: 'Packaging', text: 'What it ships in, and whether that packaging is plastic-free.' },
  { icon: Hand, title: 'Handmade', text: 'Only when people, not machines, do the main work.' },
  { icon: Recycle, title: 'End of life', text: 'Whether it breaks down naturally once you are done with it.' },
]

export default function Impact() {
  const eco = useStore((s) => s.eco)
  const impact = useStore((s) => s.impact)
  const products = useStore((s) => s.products)
  const cards = Object.values(eco)
  const count = (k: 'plastic_free' | 'handmade' | 'plant_based') => cards.filter((c) => c[k]).length
  const checked = products.filter((p) => eco[p.id])

  return (
    <div className="page">
      <section className="stack">
        <h1>Eco cards</h1>
        <p className="muted">
          Sustainability claims are easy to make and hard to check. So every EcoCart product gets an eco card, and a claim only appears on it once
          we've confirmed it. No green labels for show.
        </p>
      </section>

      <div className="facts">
        <div className="fact"><b>{cards.length}</b><span>products checked</span></div>
        <div className="fact"><b>{count('plastic_free')}</b><span>plastic-free</span></div>
        <div className="fact"><b>{count('handmade')}</b><span>handmade</span></div>
      </div>
      {cards.length === 0 && (
        <p className="notice">We've just started checking. Eco cards appear on products as each one is confirmed with its maker.</p>
      )}

      {impact.length > 0 && (
        <section className="stack">
          <h2>Our impact so far</h2>
          <div className="facts">
            {impact.map((s) => (
              <div className="fact" key={s.key} title={s.note}>
                <b>{Number(s.value).toLocaleString('en-IN')}{s.unit}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="stack">
        <h2>What we check</h2>
        <div className="tiles">
          {CHECKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="tile" style={{ minHeight: 0, gap: 8 }}>
              <Icon size={22} />
              <div><b>{title}</b><br /><span>{text}</span></div>
            </div>
          ))}
        </div>
      </section>

      {checked.length > 0 && (
        <section className="stack">
          <h2>Checked products</h2>
          <div className="grid">{checked.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <section className="card pad stack" style={{ background: 'var(--brand-soft)' }}>
        <h2 className="row" style={{ gap: 8 }}><Leaf size={20} /> Make or grow something good?</h2>
        <p className="small">Tell us about it at contact@ecocart.co.in.</p>
      </section>
    </div>
  )
}
