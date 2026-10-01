import { createClient } from '@supabase/supabase-js'

const url = process.env.REACT_APP_SUPABASE_URL
const key = process.env.REACT_APP_SUPABASE_ANON_KEY

// Se a pessoa clicou no LINK do e-mail (em vez de digitar o código), o Supabase volta com a sessão
// ou com um erro no endereço (#error_code=otp_expired...). Guardamos o erro antes das rotas limparem a URL.
function lerErroDoLink() {
  try {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const q = new URLSearchParams(window.location.search)
    return h.get('error_code') || q.get('error_code') || null
  } catch (e) { return null }
}
export const erroDoLink = lerErroDoLink()

// A chave publishable é pública por natureza: a segurança fica nas regras (RLS) e funções do banco.
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'runergy-auth' },
})
