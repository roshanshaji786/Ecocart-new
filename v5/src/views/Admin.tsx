import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import { Empty, Photo, Sheet } from '../components/ui'
import { date } from '../lib/format'
import { supabase } from '../lib/supabase'
import { useStore } from '../lib/store'
import type { Eco, Product } from '../lib/types'

type Run = { id: number; ran_at: string; ok: boolean; products: number; images: number; message: string }
const blankEco = (product_id: number): Eco => ({
  product_id, material: null, origin: null, maker: null, packaging: null, plastic_free: null, handmade: null,
  plant_based: null, biodegradable: null, certifications: [], notes: null, verified: false,
})

export default function Admin() {
  const isAdmin = useStore((s) => s.isAdmin)
  const session = useStore((s) => s.session)
  const products = useStore((s) => s.products)
  const [all, setAll] = useState<Record<number, Eco>>({})
  const [runs, setRuns] = useState<Run[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'todo' | 'draft' | 'verified' | 'all'>('todo')
  const [editing, setEditing] = useState<Product | null>(null)
  const [syncing, setSyncing] = useState(false)
  const toast = useStore((s) => s.toast)

  const reload = async () => {
    const [e, r] = await Promise.all([
      supabase.from('product_eco').select('*'),
      supabase.from('sync_runs').select('*').order('id', { ascending: false }).limit(5),
    ])
    setAll(Object.fromEntries(((e.data as Eco[]) ?? []).map((x) => [x.product_id, x])))
    setRuns((r.data as Run[]) ?? [])
  }
  useEffect(() => { if (isAdmin) void reload() }, [isAdmin])

  const list = useMemo(() => {
    const w = q.toLowerCase()
    return products.filter((p) => {
      const e = all[p.id]
      const state = e?.verified ? 'verified' : e ? 'draft' : 'todo'
      return (filter === 'all' || filter === state || (filter === 'todo' && state === 'draft')) && p.name.toLowerCase().includes(w)
    })
  }, [products, all, q, filter])

  if (!session || !isAdmin)
    return (
      <div className="page">
        <Empty icon={<ShieldAlert size={40} />} title="Admins only">
          <p className="muted">Sign in with an EcoCart admin email to edit eco cards.</p>
          <a className="btn ghost" href="#/account">Go to account</a>
        </Empty>
      </div>
    )

  const sync = async () => {
    setSyncing(true)
    const { data, error } = await supabase.functions.invoke('sync-catalog?images=40', { method: 'POST' })
    setSyncing(false)
    toast(error ? 'Sync failed. See the log below.' : `Synced ${data.products} products, ${data.images} photos`)
    void reload()
    void useStore.getState().refresh()
  }
  const verified = Object.values(all).filter((e) => e.verified).length

  return (
    <div className="page">
      <h1>Admin</h1>
      <section className="card pad stack">
        <div className="row between">
          <h2>Catalogue sync</h2>
          <button className="btn ghost" onClick={sync} disabled={syncing}><RefreshCw size={17} /> {syncing ? 'Syncing…' : 'Sync now'}</button>
        </div>
        <p className="small muted">Products, prices and stock are copied from ecocart.co.in every night at 3:30 AM. Edit products there; edit eco cards here.</p>
        <table className="admin">
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{date(r.ran_at)} {new Date(r.ran_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>{r.ok ? '✓' : '✗'} {r.products} products, {r.images} photos</td>
                <td className="muted">{r.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="stack">
        <h2>Eco cards · {verified} of {products.length} checked</h2>
        <div className="search"><Search size={18} /><input className="input" type="search" placeholder="Find a product" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="pills">
          {(['todo', 'draft', 'verified', 'all'] as const).map((f) => (
            <button key={f} className="pill" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {{ todo: 'To check', draft: 'Drafts', verified: 'Checked', all: 'All' }[f]}
            </button>
          ))}
        </div>
        <div className="card">
          {list.map((p) => {
            const e = all[p.id]
            return (
              <button key={p.id} className="line" onClick={() => setEditing(p)} style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'left', padding: 12, gridTemplateColumns: '48px 1fr 24px', alignItems: 'center' }}>
                <span style={{ position: 'relative', width: 48, height: 56, overflow: 'hidden', borderRadius: 8 }}><Photo img={p.images[0]} /></span>
                <span className="small">{p.name}<br /><span className="tiny muted">{e?.verified ? 'Checked' : e ? 'Draft' : 'No card yet'}</span></span>
                {e?.verified ? <CheckCircle2 size={20} color="var(--brand-2)" /> : <Circle size={20} color="var(--muted)" />}
              </button>
            )
          })}
        </div>
      </section>

      <Sheet open={!!editing} onClose={() => setEditing(null)} label="Edit eco card">
        {editing && (
          <EcoForm
            key={editing.id}
            p={editing}
            initial={all[editing.id] ?? blankEco(editing.id)}
            onSaved={(e) => { setAll({ ...all, [e.product_id]: e }); setEditing(null) }}
          />
        )}
      </Sheet>
    </div>
  )
}

function EcoForm({ p, initial, onSaved }: { p: Product; initial: Eco; onSaved: (e: Eco) => void }) {
  const [e, setE] = useState<Eco>(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const saveEco = useStore((s) => s.saveEco)
  const text = (k: 'material' | 'origin' | 'maker' | 'packaging', label: string, ph: string) => (
    <label className="field">{label}<input className="input" placeholder={ph} value={e[k] ?? ''} onChange={(ev) => setE({ ...e, [k]: ev.target.value || null })} /></label>
  )
  const flag = (k: 'plastic_free' | 'handmade' | 'plant_based' | 'biodegradable', label: string) => (
    <label className="check"><input type="checkbox" checked={e[k] === true} onChange={(ev) => setE({ ...e, [k]: ev.target.checked ? true : null })} /> {label}</label>
  )
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setBusy(true)
    const msg = await saveEco(e)
    setBusy(false)
    if (msg) setErr(msg)
    else onSaved(e)
  }
  return (
    <form className="stack" onSubmit={submit}>
      <h2 style={{ fontSize: 19 }}>{p.name}</h2>
      {text('material', 'Material', 'e.g. Coconut shell')}
      {text('origin', 'Made in', 'e.g. Thrissur, Kerala')}
      {text('maker', 'Made by', 'e.g. Family workshop, 4 people')}
      {text('packaging', 'Packaging', 'e.g. Glass jar, paper label')}
      <div className="eco-list">{flag('plastic_free', 'Plastic-free')}{flag('handmade', 'Handmade')}{flag('plant_based', 'Plant-based')}{flag('biodegradable', 'Biodegradable')}</div>
      <label className="field">Certifications (comma separated)
        <input className="input" placeholder="e.g. FSSAI, India Organic" value={e.certifications.join(', ')} onChange={(ev) => setE({ ...e, certifications: ev.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
      </label>
      <label className="field">Note for shoppers<textarea className="input" value={e.notes ?? ''} onChange={(ev) => setE({ ...e, notes: ev.target.value || null })} /></label>
      <label className="check" style={{ background: 'var(--brand-soft)', borderRadius: 12, padding: '4px 12px' }}>
        <input type="checkbox" checked={e.verified} onChange={(ev) => setE({ ...e, verified: ev.target.checked })} />
        <span><b>I've checked these facts</b><br /><span className="tiny muted">Only checked cards are shown to shoppers.</span></span>
      </label>
      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Saving…' : 'Save eco card'}</button>
    </form>
  )
}
