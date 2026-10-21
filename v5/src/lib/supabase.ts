import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key)

// Signed-in client: keeps the session (magic link) for wishlist, profile and admin.
export const supabase = createClient(url || 'http://localhost', key || 'missing', {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
})

// Public reads never carry a session, so an expired login can't blank the catalogue.
export const pub = createClient(url || 'http://localhost', key || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'pub' },
})
