import { useEffect, useState, type ReactNode } from 'react'
import { ImageOff, Leaf } from 'lucide-react'
import { offPercent, priceLabel, rupees, thumbOf } from '../lib/format'
import { useStore } from '../lib/store'
import type { Img, Product } from '../lib/types'
import type { SiteImage } from '../lib/site'

export function Photo({ img, full, eager, className }: { img?: Img; full?: boolean; eager?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false)
  const src = full ? img?.mirror || img?.src : thumbOf(img)
  if (!src || failed)
    return (
      <div className="ph-fallback" aria-hidden>
        <ImageOff size={28} />
      </div>
    )
  return (
    <img
      className={className}
      src={src}
      alt={img?.alt ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      width={full ? 800 : 400}
      height={full ? 800 : 500}
      onError={() => setFailed(true)}
    />
  )
}

export function Price({ p }: { p: Product }) {
  const off = offPercent(p)
  return (
    <div className="price">
      {off > 0 && <s>{rupees(p.regular_price)}</s>}
      {priceLabel(p)}
    </div>
  )
}

export function ProductCard({ p, eager }: { p: Product; eager?: boolean }) {
  const eco = useStore((s) => s.eco[p.id])
  const off = offPercent(p)
  const simple = p.variations.length === 0 && Boolean(p.price) && p.in_stock
  return (
    <article className="pcard">
      <a href={`#/p/${p.slug}`}>
        <div className="ph">
          <Photo img={p.images[0]} eager={eager} />
          {!p.in_stock ? <span className="tag out">Sold out</span> : off >= 5 ? <span className="tag">-{off}%</span> : null}
          {eco && (
            <span className="tag eco" title="Verified eco card">
              <Leaf size={12} /> Eco
            </span>
          )}
        </div>
        <h3 className="name">{p.name}</h3>
      </a>
      <Price p={p} />
      {simple ? (
        <button className="btn sm" onClick={() => useStore.getState().addToCart(p.id, 1)}>Add to basket</button>
      ) : (
        <a className="btn sm ghost" href={`#/p/${p.slug}`}>{p.in_stock ? 'Choose options' : 'Read more'}</a>
      )}
    </article>
  )
}

// A homepage image served from Storage, falling back to ecocart.co.in (without a referrer).
export function SiteImg({ img, alt, className, eager }: { img: SiteImage; alt: string; className?: string; eager?: boolean }) {
  const [src, setSrc] = useState(img.src)
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => src !== img.fallback && setSrc(img.fallback)}
    />
  )
}

export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="grab" />
        {children}
      </div>
    </>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <h2>{title}</h2>
      {children}
    </div>
  )
}

export function GridSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="stack" style={{ gap: 8 }}>
          <div className="skeleton" style={{ aspectRatio: '4/5' }} />
          <div className="skeleton" style={{ height: 16 }} />
          <div className="skeleton" style={{ height: 16, width: '50%' }} />
        </div>
      ))}
    </div>
  )
}
