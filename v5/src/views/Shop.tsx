import { useMemo, useState } from 'react'
import { Leaf, PackageSearch, Search } from 'lucide-react'
import { Empty, GridSkeleton, ProductCard } from '../components/ui'
import { SECTIONS, inCategory, searchProducts } from '../lib/catalog'
import { go } from '../lib/route'
import { useStore } from '../lib/store'

type Sort = 'featured' | 'low' | 'high'

export default function Shop({ category, query, searchMode }: { category?: string; query?: string; searchMode?: boolean }) {
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const eco = useStore((s) => s.eco)
  const [q, setQ] = useState(query ?? '')
  const [sort, setSort] = useState<Sort>('featured')
  const [ecoOnly, setEcoOnly] = useState(false)
  const [inStock, setInStock] = useState(true)

  const list = useMemo(() => {
    let l = searchProducts(inCategory(products, categories, category), categories, q)
    if (ecoOnly) l = l.filter((p) => eco[p.id])
    if (inStock) l = l.filter((p) => p.in_stock)
    if (sort !== 'featured') l = [...l].sort((a, b) => ((a.price ?? 0) - (b.price ?? 0)) * (sort === 'low' ? 1 : -1))
    return l
  }, [products, categories, category, q, ecoOnly, inStock, sort, eco])

  const title = category ? (SECTIONS.find((s) => s.slug === category)?.label ?? categories.find((c) => c.slug === category)?.name ?? 'Shop') : searchMode ? 'Search' : 'Shop'

  return (
    <div className="page">
      <h1>{title}</h1>
      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          ;(document.activeElement as HTMLElement)?.blur()
        }}
      >
        <Search size={18} />
        <input
          className="input"
          type="search"
          enterKeyHint="search"
          placeholder="Search products"
          aria-label="Search products"
          value={q}
          autoFocus={searchMode}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <nav className="pills" aria-label="Sections">
        <a className="pill" href="#/shop" aria-current={!category}>All</a>
        {SECTIONS.map((s) => (
          <a key={s.slug} className="pill" href={`#/shop/${s.slug}`} aria-current={category === s.slug}>
            {s.label}
          </a>
        ))}
      </nav>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="pill" aria-pressed={ecoOnly} onClick={() => setEcoOnly(!ecoOnly)}>
          <Leaf size={15} /> Eco checked
        </button>
        <button className="pill" aria-pressed={inStock} onClick={() => setInStock(!inStock)}>
          In stock
        </button>
        <select className="pill" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ marginLeft: 'auto' }}>
          <option value="featured">Newest</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
      </div>
      {!products.length ? (
        <GridSkeleton n={6} />
      ) : list.length ? (
        <>
          <p className="muted small">{list.length} products</p>
          <div className="grid">
            {list.map((p, i) => (
              <ProductCard key={p.id} p={p} eager={i < 4} />
            ))}
          </div>
        </>
      ) : (
        <Empty icon={<PackageSearch size={40} />} title="Nothing matches yet">
          <p className="muted">
            {ecoOnly ? "We're still checking products for eco cards. Turn off \"Eco checked\" to see everything." : 'Try a shorter word, or browse all products.'}
          </p>
          <button className="btn ghost" onClick={() => { setQ(''); setEcoOnly(false); go('#/shop') }}>
            Show all products
          </button>
        </Empty>
      )}
    </div>
  )
}
