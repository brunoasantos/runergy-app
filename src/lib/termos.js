import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Termos de Uso e Política de Privacidade (páginas no site). A versão vigente fica no banco (termos_versoes);
// o aceite de cada pessoa fica em termos_aceites, gravado pela função aceitar_termos.
export const TERMOS_URL = 'https://www.runergyapp.com/termos'
export const PRIVACIDADE_URL = 'https://www.runergyapp.com/privacidade'
export const VERSAO_TERMOS = 1

let aceitouId = null // quem já aceitou nesta sessão (evita consultar a cada tela)

/** Situação do aceite da pessoa logada: null (carregando) | { ok: true } | { ok: false, versao } */
export function useTermos(userId, meta) {
  const [st, setSt] = useState(() => (userId && aceitouId === userId ? { ok: true } : null))
  useEffect(() => {
    if (!userId) return undefined
    if (aceitouId === userId) { setSt({ ok: true }); return undefined }
    let vivo = true
    setSt(null)
    supabase.rpc('meus_termos').then(async ({ data, error }) => {
      if (!vivo) return
      const t = data?.[0]
      // Falha de rede/consulta não trava o app: pergunta de novo na próxima abertura
      if (error || !t) { setSt({ ok: true }); return }
      if (t.aceita) { aceitouId = userId; setSt({ ok: true }); return }
      // Aceitou na hora de criar a conta (app ou site): só registra
      if (Number(meta?.termos_versao) === t.versao_atual) {
        const r = await supabase.rpc('aceitar_termos', { p_versao: t.versao_atual, p_origem: meta?.termos_origem || 'cadastro' })
        if (!vivo) return
        if (!r.error) { aceitouId = userId; setSt({ ok: true }); return }
      }
      setSt({ ok: false, versao: t.versao_atual })
    })
    return () => { vivo = false }
  }, [userId]) // eslint-disable-line
  async function aceitar() {
    const { error } = await supabase.rpc('aceitar_termos', { p_versao: st?.versao, p_origem: 'app' })
    if (error) return false
    aceitouId = userId; setSt({ ok: true }); return true
  }
  return [st, aceitar]
}
