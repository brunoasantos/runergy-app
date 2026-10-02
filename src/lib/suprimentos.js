import { supabase } from './supabase'
import { SUPRIMENTOS } from './format'

/** Lê nome, peso (créditos) e preço avulso de cada item na tabela `suprimentos` e atualiza SUPRIMENTOS. */
export async function sincronizarSuprimentos() {
  try {
    const { data } = await supabase.from('suprimentos').select('id, nome, peso, preco_avulso')
    for (const s of data || []) {
      // Item novo cadastrado no painel: entra com ícone genérico
      if (!SUPRIMENTOS[s.id]) SUPRIMENTOS[s.id] = { label: s.nome, detalhe: '', icon: 'bolt' }
      else SUPRIMENTOS[s.id].label = s.nome
      SUPRIMENTOS[s.id].peso = s.peso
      SUPRIMENTOS[s.id].preco = Number(s.preco_avulso)
    }
  } catch (e) { /* mantém os valores padrão */ }
}
