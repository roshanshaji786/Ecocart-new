import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { configured, supabase } from '../lib/supabase'
import { useStore } from '../lib/store'
import { Sheet } from './ui'

export default function LoginSheet() {
  const open = useStore((s) => s.loginOpen)
  const openLogin = useStore((s) => s.openLogin)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configured) return
    setState('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: location.origin + '/' + location.hash },
    })
    if (error) {
      setError(error.message.includes('rate') ? 'Too many tries. Please wait a minute and try again.' : error.message)
      setState('error')
    } else setState('sent')
  }

  return (
    <Sheet open={open} onClose={() => openLogin(false)} label="Sign in">
      {state === 'sent' ? (
        <div className="stack" style={{ textAlign: 'center', justifyItems: 'center', padding: '8px 0 12px' }}>
          <MailCheck size={40} color="var(--brand)" />
          <h2>Check your email</h2>
          <p className="muted">
            We sent a sign-in link to <b>{email}</b>. Open it on this phone and you'll be signed in.
          </p>
          <button className="link-btn" onClick={() => setState('idle')}>
            Use a different email
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={send}>
          <h2>Sign in</h2>
          <p className="muted small">No password needed. We'll email you a one-tap link to save your wishlist and address.</p>
          <label className="field">
            Email
            <input
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {state === 'error' && <p style={{ color: 'var(--danger)' }}>{error}</p>}
          <button className="btn primary block" disabled={state === 'sending' || !configured}>
            {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
          </button>
        </form>
      )}
    </Sheet>
  )
}
