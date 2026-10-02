import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePonto } from '../../lib/ponto'
import { brl, inicioDoDiaSP, mensagemErro, suprimento } from '../../lib/format'
import EquipeBand from '../../components/EquipeBand'
import Icon from '../../components/Icon'

/** Fechamento do dia: conta o que sobrou no ponto, confere o caixa e registra. Diferença vira perda/ajuste com o nome de quem fechou. */
export default function Fechar() {
  const ponto = usePonto()
  const itens = ponto.ponto?.suprimentos || []
  const [esperado, setEsperado] = useState(null)
  const [vendas, setVendas] = useState(null)
  const [contado, setContado] = useState({})
  const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState(null)

  useEffect(() => {
    if (!ponto.codigo) return
    supabase.from('estoque_ponto').select('suprimento, quantidade').eq('totem_code', ponto.codigo)
      .then(({ data }) => setEsperado(Object.fromEntries((data || []).map((r) => [r.suprimento, r.quantidade]))))
    supabase.from('vendas').select('total, forma_pagamento').eq('totem_code', ponto.codigo).gte('criado_em', inicioDoDiaSP())
      .then(({ data }) => {
        const v = data || []
        const soma = (f) => v.filter((x) => !f || x.forma_pagamento === f).reduce((a, x) => a + Number(x.total), 0)
        setVendas({ n: v.length, total: soma(), pix: soma('pix'), dinheiro: soma('dinheiro'), cartao: soma('cartao') })
      })
  }, [ponto.codigo])

  const preenchidos = itens.filter((s) => contado[s] !== undefined && contado[s] !== '')
  async function fechar() {
    if (!preenchidos.length || enviando) return
    setEnviando(true); setErro('')
    const p_contagem = Object.fromEntries(preenchidos.map((s) => [s, Number(contado[s])]))
    const { data, error } = await supabase.rpc('fechar_dia', { p_totem_code: ponto.codigo, p_contagem, p_obs: obs || null })
    setEnviando(false)
    if (error) { setErro(mensagemErro(error)); return }
    const r = Array.isArray(data) ? data[0] : data
    setFeito({ diferencas: r?.diferencas ?? 0, linhas: preenchidos.map((s) => ({ s, esp: esperado?.[s], cont: Number(contado[s]) })) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <EquipeBand ponto={ponto} voltar="/equipe/painel" />
      <main className="screen" style={{ paddingTop: 16, gap: 12 }}>
        <h1 className="display" style={{ fontSize: 'clamp(26px, 7.5vw, 32px)' }}>Fechar o dia</h1>

        {feito ? (
          <>
            <section className="card stack" style={{ gap: 10 }}>
              <strong style={{ fontSize: 18 }}>{feito.diferencas ? `Dia fechado com ${feito.diferencas} diferença${feito.diferencas > 1 ? 's' : ''}` : 'Dia fechado, estoque bateu'}</strong>
              {feito.linhas.map(({ s, esp, cont }) => (
                <div key={s} className="row between small"><span>{suprimento(s).label}</span>
                  <strong style={{ color: esp != null && cont < esp ? 'var(--err)' : undefined }}>{cont}{esp != null && cont !== esp ? ` (esperado ${esp})` : ''}</strong></div>
              ))}
              {feito.diferencas > 0 && <span className="tiny muted">As diferenças ficaram registradas no estoque com o seu nome.</span>}
            </section>
            <Link to="/equipe/painel" className="btn btn-primary btn-block btn-lg" style={{ textDecoration: 'none' }}>Voltar ao painel</Link>
          </>
        ) : (
          <>
            <span className="small muted">Conte o que sobrou de cada item e digite abaixo. Itens sem controle começam a ser controlados a partir desta contagem.</span>
            {itens.map((s) => (
              <div key={s} className="card tight row" style={{ gap: 12 }}>
                <span style={{ color: 'var(--orange)', display: 'inline-flex' }}><Icon name={suprimento(s).icon} size={22} /></span>
                <div className="grow">
                  <div style={{ fontWeight: 800 }}>{suprimento(s).label}</div>
                  <div className="small muted">{esperado === null ? '…' : esperado[s] != null ? `Sistema espera ${esperado[s]}` : 'Sem controle ainda'}</div>
                </div>
                <div className="field" style={{ width: 96 }}>
                  <label className="sr-only" htmlFor={`f-${s}`}>Contei de {suprimento(s).label}</label>
                  <input id={`f-${s}`} className="input" inputMode="numeric" placeholder="Contei" value={contado[s] ?? ''} onChange={(e) => setContado((x) => ({ ...x, [s]: e.target.value.replace(/\D/g, '').slice(0, 4) }))} style={{ textAlign: 'center', fontWeight: 800 }} />
                </div>
              </div>
            ))}

            <section className="card stack" style={{ gap: 6 }} aria-label="Caixa do dia">
              <strong>Caixa do dia</strong>
              {!vendas ? <div className="skeleton" style={{ height: 60 }} /> : vendas.n === 0 ? <span className="small muted">Nenhuma venda avulsa hoje.</span> : (
                <>
                  <div className="row between small"><span>Vendas avulsas ({vendas.n})</span><strong>{brl(vendas.total)}</strong></div>
                  <div className="row between small"><span>Pix</span><span>{brl(vendas.pix)}</span></div>
                  <div className="row between small"><span>Cartão</span><span>{brl(vendas.cartao)}</span></div>
                  <div className="row between small" style={{ fontWeight: 800 }}><span>Dinheiro (conferir na gaveta)</span><span>{brl(vendas.dinheiro)}</span></div>
                </>
              )}
            </section>

            <div className="field"><label htmlFor="f-obs">Observação (opcional)</label>
              <input id="f-obs" className="input" placeholder="Ex.: 2 géis vencidos descartados" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={200} /></div>

            {erro && <div className="alert err" role="alert">{erro}</div>}
            <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!preenchidos.length || enviando || !ponto.ponto} onClick={fechar}>
              {enviando ? 'Fechando…' : preenchidos.length ? 'Fechar o dia' : 'Digite a contagem'}
            </button>
            <Link to="/equipe/painel" className="btn btn-link" style={{ textAlign: 'center' }}>Cancelar</Link>
          </>
        )}
      </main>
    </div>
  )
}
