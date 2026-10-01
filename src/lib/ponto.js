import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const KEY = 'runergy_ponto'

// Ponto (totem) em que a equipe está operando — fica salvo no aparelho
export function usePonto() {
  const [pontos, setPontos] = useState([])
  const [codigo, setCodigo] = useState(() => { try { return localStorage.getItem(KEY) || '' } catch (e) { return '' } })

  useEffect(() => {
    supabase.from('totens').select('totem_code, nome, suprimentos').eq('ativo', true).order('totem_code')
      .then(({ data }) => {
        const lista = data || []
        setPontos(lista)
        if (lista.length && !lista.find((p) => p.totem_code === codigo)) setCodigo(lista[0].totem_code)
      })
  }, [])

  useEffect(() => { try { if (codigo) localStorage.setItem(KEY, codigo) } catch (e) {} }, [codigo])

  return { pontos, codigo, setCodigo, ponto: pontos.find((p) => p.totem_code === codigo) || null }
}
