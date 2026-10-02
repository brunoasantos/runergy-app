import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/** O que cada ponto tem agora: { [totem_code]: { [suprimento]: { disponivel, poucos, controlado } } } */
export function useDisponibilidade() {
  const [mapa, setMapa] = useState({})
  useEffect(() => {
    let vivo = true
    supabase.rpc('itens_dos_pontos').then(({ data }) => {
      if (!vivo || !data) return
      const m = {}
      for (const r of data) (m[r.totem_code] ||= {})[r.suprimento] = r
      setMapa(m)
    })
    return () => { vivo = false }
  }, [])
  return mapa
}

/** Texto curto do estado de um item no ponto. */
export function estadoItem(info) {
  if (!info) return ''
  if (!info.disponivel) return 'esgotou'
  if (info.poucos) return 'últimas unidades'
  return ''
}
