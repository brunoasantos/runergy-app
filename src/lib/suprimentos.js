import { supabase } from './supabase'
import { SUPRIMENTOS } from './format'

/** Lê peso (créditos) e preço avulso de cada item na tabela `suprimentos` e atualiza SUPRIMENTOS. */
export async function sincronizarSuprimentos() {
  try {
    const { data } = await supabase.from('suprimentos').select('id, nome, peso, preco_avulso')
    for (const s of data || []) {
      if (!SUPRIMENTOS[s.id]) continue
      SUPRIMENTOS[s.id].peso = s.peso
      SUPRIMENTOS[s.id].preco = Number(s.preco_avulso)
    }
  } catch (e) { /* mantém os valores padrão */ }
}
