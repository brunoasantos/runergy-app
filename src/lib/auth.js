import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

const PERFIL_COLS = 'id, email, nome, tipo, papel, plano, creditos, planos ( id, nome, preco, creditos_mes, acesso_totem )'

const NOME_PAPEL = { operador: 'Operador', supervisor: 'Supervisor', admin: 'Admin' }

/**
 * Resumo do que a pessoa tem (regras em DOC_TECNICA §2):
 *  cliente → plano Grátis/Starter/Runner/Hero (Runner e Hero têm QR; regra em planos.acesso_totem)
 *  atleta  → QR + 20 créditos/mês
 *  equipe  → QR + 10 créditos/mês; admin ilimitado
 */
export function resumoConta(perfil) {
  if (!perfil) return null
  const tipo = perfil.tipo || 'cliente'
  const plano = perfil.planos || {}
  const ilimitado = tipo === 'equipe' && perfil.papel === 'admin'
  const creditosMes = ilimitado ? null : tipo === 'equipe' ? 10 : tipo === 'atleta' ? 20 : (plano.creditos_mes || 0)
  return {
    tipo,
    ilimitado,
    creditosMes,
    acessoQR: tipo !== 'cliente' || !!plano.acesso_totem,
    rotulo: tipo === 'atleta' ? 'Atleta Runergy' : tipo === 'equipe' ? `Equipe · ${NOME_PAPEL[perfil.papel] || ''}` : (plano.nome || 'Grátis'),
    planoCliente: plano.nome || 'Grátis',
    precoCliente: tipo === 'cliente' ? (plano.preco || 0) : 0,
  }
}

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
    conta: resumoConta(perfil),
    carregando,
    ehEquipe: !!perfil && ['equipe', 'operador', 'supervisor', 'admin'].includes(perfil.papel),
    recarregarPerfil: () => carregarPerfil(session?.user?.id),
    sair,
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
