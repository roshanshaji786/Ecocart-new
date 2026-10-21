import { useEffect, useState } from 'react'
import { Heart, LogOut, Mail, MessageCircle, Phone, Shield, User } from 'lucide-react'
import { ProductCard } from '../components/ui'
import { EMAIL, PHONE, WHATSAPP } from '../lib/format'
import { configured, supabase } from '../lib/supabase'
import { useStore } from '../lib/store'

type Profile = { full_name: string; phone: string; address: { line1: string; line2: string; city: string; state: string; pin: string } }
const blank: Profile = { full_name: '', phone: '', address: { line1: '', line2: '', city: '', state: 'Kerala', pin: '' } }

export default function Account() {
  const session = useStore((s) => s.session)
  const isAdmin = useStore((s) => s.isAdmin)
  const wishlist = useStore((s) => s.wishlist)
  const products = useStore((s) => s.products)
  const { openLogin } = useStore.getState()
  const saved = products.filter((p) => wishlist.includes(p.id))

  return (
    <div className="page">
      <h1>Account</h1>
      {session ? (
        <section className="card pad stack">
          <div className="row"><User size={20} /><b style={{ overflowWrap: 'anywhere' }}>{session.user.email}</b></div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {isAdmin && <a className="btn ghost" href="#/admin"><Shield size={18} /> Admin</a>}
            <button className="btn ghost" onClick={() => supabase.auth.signOut()}><LogOut size={18} /> Sign out</button>
          </div>
        </section>
      ) : (
        <section className="card pad stack">
          <h2>Sign in</h2>
          <p className="muted small">Save a wishlist and your delivery address. We email you a one-tap link; no password.</p>
          <button className="btn primary block" onClick={() => openLogin(true)} disabled={!configured}><Mail size={18} /> Sign in with email</button>
        </section>
      )}

      {session && (
        <section className="stack">
          <h2 className="row" style={{ gap: 8 }}><Heart size={20} /> Wishlist</h2>
          {saved.length ? <div className="grid">{saved.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <p className="muted small">Tap the heart on any product to save it here.</p>}
        </section>
      )}

      {session && <ProfileForm userId={session.user.id} />}


      <section className="card pad stack">
        <h2>Help</h2>
        <a className="row" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener" style={{ minHeight: 44 }}><MessageCircle size={18} /> WhatsApp {PHONE}</a>
        <a className="row" href={`tel:+${WHATSAPP}`} style={{ minHeight: 44 }}><Phone size={18} /> Call {PHONE}</a>
        <a className="row" href={`mailto:${EMAIL}`} style={{ minHeight: 44 }}><Mail size={18} /> {EMAIL}</a>
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Flat ₹55 shipping on every order, India only. Delivery in 4 to 10 days.</li>
          <li>Cancel within 2 days, or report damage within 2 days of delivery. Refunds in 3 to 5 days.</li>
          <li>Payment by UPI or card through Razorpay. No cash on delivery.</li>
        </ul>
      </section>
    </div>
  )
}

function ProfileForm({ userId }: { userId: string }) {
  const [p, setP] = useState<Profile>(blank)
  const [state, setState] = useState<'loading' | 'idle' | 'saving'>('loading')
  const toast = useStore((s) => s.toast)
  useEffect(() => {
    supabase.from('profiles').select('full_name,phone,address').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (data) setP({ full_name: data.full_name ?? '', phone: data.phone ?? '', address: { ...blank.address, ...(data.address ?? {}) } })
      setState('idle')
    })
  }, [userId])
  const a = p.address
  const setA = (k: keyof Profile['address'], v: string) => setP({ ...p, address: { ...a, [k]: v } })
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('saving')
    const { error } = await supabase.from('profiles').upsert({ user_id: userId, ...p, updated_at: new Date().toISOString() })
    setState('idle')
    toast(error ? 'Could not save. Try again.' : 'Address saved')
  }
  return (
    <form className="card pad stack" onSubmit={submit}>
      <h2>Delivery details</h2>
      <label className="field">Full name<input className="input" autoComplete="name" value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></label>
      <label className="field">Phone<input className="input" type="tel" inputMode="tel" autoComplete="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></label>
      <label className="field">Address<input className="input" autoComplete="address-line1" value={a.line1} onChange={(e) => setA('line1', e.target.value)} /></label>
      <input className="input" aria-label="Address line 2" autoComplete="address-line2" value={a.line2} onChange={(e) => setA('line2', e.target.value)} />
      <div className="row">
        <label className="field" style={{ flex: 1 }}>City<input className="input" autoComplete="address-level2" value={a.city} onChange={(e) => setA('city', e.target.value)} /></label>
        <label className="field" style={{ width: 120 }}>PIN<input className="input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="postal-code" value={a.pin} onChange={(e) => setA('pin', e.target.value)} /></label>
      </div>
      <label className="field">State<input className="input" autoComplete="address-level1" value={a.state} onChange={(e) => setA('state', e.target.value)} /></label>
      <button className="btn primary block" disabled={state !== 'idle'}>{state === 'saving' ? 'Saving…' : 'Save details'}</button>
    </form>
  )
}
