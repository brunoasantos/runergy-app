import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

const PERFIL_COLS = 'id, email, nome, papel, plano, creditos, planos ( id, nome, preco, creditos_mes, acesso_totem )'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)

  const carregarPerfil = useCallback(async (uid) => {
    if (!uid) { setPerfil(null); return null }
    const { data, error } = await supabase.from('perfis').select(PERFIL_COLS).eq('id', uid).maybeSingle()
    if (error) { console.warn('perfil', error.message); return null }
    setPerfil(data)
    return data
  }, [])

  useEffect(() => {
    let ativo = true
    // Limpa o cadastro do app antigo (v1), que guardava dados no navegador
    try { localStorage.removeItem('runergy_atleta') } catch (e) {}

    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return
      setSession(data.session)
      if (data.session) await carregarPerfil(data.session.user.id)
      if (ativo) setCarregando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s)
      if (!s) setPerfil(null)
      else setTimeout(() => carregarPerfil(s.user.id), 0)
    })
    return () => { ativo = false; sub.subscription.unsubscribe() }
  }, [carregarPerfil])

  // Atualiza créditos/plano quando o app volta para a tela
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible' && session) carregarPerfil(session.user.id) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [session, carregarPerfil])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }, [])

  const value = {
    session,
    user: session?.user || null,
    perfil,
    carregando,
    ehEquipe: !!perfil && ['equipe', 'admin'].includes(perfil.papel),
    recarregarPerfil: () => carregarPerfil(session?.user?.id),
    sair,
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
