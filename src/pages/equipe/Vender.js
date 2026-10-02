import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePonto } from '../../lib/ponto'
import { brl, fmtHora, mensagemErro, suprimento } from '../../lib/format'
import { mascaraTel } from '../../lib/cadastro'
import EquipeBand from '../../components/EquipeBand'
import Icon from '../../components/Icon'

const FORMAS = [['pix', 'Pix'], ['dinheiro', 'Dinheiro'], ['cartao', 'Cartão']]
export const NOME_FORMA = Object.fromEntries(FORMAS)

/** Venda avulsa (cliente sem plano): escolhe itens, forma de pagamento e registra. Baixa do estoque na hora. */
export default function Vender() {
  const ponto = usePonto()
  const nav = useNavigate()
  const itens = ponto.ponto?.suprimentos || []
  const [qtd, setQtd] = useState({})
  const [forma, setForma] = useState('pix')
  const [wpp, setWpp] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState(null)

  const linhas = useMemo(() => itens.map((s) => ({ s, q: qtd[s] || 0, preco: suprimento(s).preco || 0 })), [itens, qtd])
  const total = linhas.reduce((a, l) => a + l.q * l.preco, 0)
  const quantidade = linhas.reduce((a, l) => a + l.q, 0)
  const muda = (s, d) => setQtd((x) => ({ ...x, [s]: Math.max(0, Math.min(50, (x[s] || 0) + d)) }))

  async function registrar() {
    if (!quantidade || enviando || !ponto.codigo) return
    setEnviando(true); setErro('')
    const p_itens = linhas.filter((l) => l.q > 0).map((l) => ({ suprimento: l.s, qtd: l.q }))
    const { data, error } = await supabase.rpc('registrar_venda', { p_totem_code: ponto.codigo, p_itens, p_forma: forma, p_whatsapp: wpp || null })
    setEnviando(false)
    if (error) { setErro(mensagemErro(error)); return }
    const r = Array.isArray(data) ? data[0] : data
    try { navigator.vibrate?.([60, 40, 60]) } catch (e) {}
    setFeito({ total: Number(r?.total ?? total), resumo: linhas.filter((l) => l.q > 0).map((l) => `${l.q} ${suprimento(l.s).label}`).join(' · '), forma, hora: new Date() })
  }

  function novaVenda() { setFeito(null); setQtd({}); setWpp(''); setForma('pix'); setErro('') }

  if (feito) {
    return (
      <main className="screen confirm-screen" style={{ minHeight: '100dvh', position: 'relative', overflow: 'hidden', paddingTop: 'calc(var(--safe-top) + 56px)' }}>
        <div style={{ width: 84, height: 84, borderRadius: 999, background: '#121212', color: '#FF5A00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={42} stroke={2.6} />
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(38px, 12vw, 48px)' }}>Venda<br />registrada.</h1>
        <section className="card-dark stack" style={{ gap: 12 }} aria-label="Resumo da venda">
          <div className="row between small" style={{ gap: 16 }}><span style={{ color: '#B5B5B5' }}>Itens</span><strong style={{ textAlign: 'right' }}>{feito.resumo}</strong></div>
          <div className="row between small"><span style={{ color: '#B5B5B5' }}>Pagamento</span><strong>{NOME_FORMA[feito.forma]}</strong></div>
          <div className="row between small"><span style={{ color: '#B5B5B5' }}>Horário</span><strong>{fmtHora(feito.hora)}</strong></div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <span className="small" style={{ color: '#B5B5B5' }}>Total</span>
            <span className="num" style={{ fontSize: 30, color: '#FF7A33' }}>{brl(feito.total)}</span>
          </div>
        </section>
        <div className="small" style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 18, padding: 14, lineHeight: 1.5 }}>
          <strong>Dica:</strong> com o Runner esse cliente teria 10 créditos por mês. Mostre o app e convide para assinar.
        </div>
        <div className="stack" style={{ marginTop: 'auto', gap: 10, paddingBottom: 'var(--safe-bottom)' }}>
          <button type="button" className="btn btn-block btn-lg" style={{ background: '#121212', color: '#FFFFFF' }} onClick={novaVenda}>Nova venda</button>
          <Link to="/equipe/painel" className="btn btn-link" style={{ color: '#121212' }}>Voltar ao painel</Link>
        </div>
      </main>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <EquipeBand ponto={ponto} voltar="/equipe/painel" />
      <main className="screen" style={{ paddingTop: 16, gap: 12 }}>
        <h1 className="display" style={{ fontSize: 'clamp(26px, 7.5vw, 32px)' }}>Nova venda</h1>
        {!ponto.ponto && <div className="alert warn">Escolha o ponto de operação no topo da tela.</div>}

        <span className="label-caps">Itens</span>
        {linhas.map((l) => (
          <div key={l.s} className="card tight row" style={{ gap: 12 }}>
            <span style={{ color: 'var(--orange)', display: 'inline-flex' }}><Icon name={suprimento(l.s).icon} size={22} /></span>
            <div className="grow">
              <div style={{ fontWeight: 800 }}>{suprimento(l.s).label}</div>
              <div className="small muted">{brl(l.preco)}</div>
            </div>
            <div className="stepper">
              <button type="button" aria-label={`Menos ${suprimento(l.s).label}`} onClick={() => muda(l.s, -1)} disabled={!l.q}><Icon name="minus" size={18} /></button>
              <span aria-live="polite" style={{ minWidth: 24, textAlign: 'center', fontWeight: 900, fontSize: 18 }}>{l.q}</span>
              <button type="button" aria-label={`Mais ${suprimento(l.s).label}`} onClick={() => muda(l.s, 1)} style={{ background: 'var(--orange)', color: 'var(--on-orange)' }}><Icon name="plus" size={18} /></button>
            </div>
          </div>
        ))}

        <span className="label-caps" style={{ marginTop: 6 }}>Pagamento</span>
        <div role="radiogroup" aria-label="Forma de pagamento" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {FORMAS.map(([k, v]) => (
            <button key={k} type="button" role="radio" aria-checked={forma === k} onClick={() => setForma(k)} className="btn"
              style={forma === k ? { background: 'var(--text)', color: 'var(--bg)', border: '2px solid var(--text)' } : { background: 'var(--surface)', color: 'var(--text)', border: '2px solid var(--surface-2)' }}>{v}</button>
          ))}
        </div>
        {forma === 'pix' && <span className="tiny muted">Cliente paga no QR Pix da Runergy do ponto. Confira o comprovante antes de registrar.</span>}

        <div className="field" style={{ marginTop: 4 }}>
          <label htmlFor="v-wpp">WhatsApp do cliente (opcional, para convidar)</label>
          <input id="v-wpp" className="input" type="tel" inputMode="tel" placeholder="(00) 00000-0000" value={wpp} onChange={(e) => setWpp(mascaraTel(e.target.value))} />
        </div>

        {erro && <div className="alert err" role="alert">{erro}</div>}
        <div className="stack" style={{ marginTop: 'auto', gap: 8, paddingTop: 8 }}>
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <span className="small muted">Total · {quantidade} {quantidade === 1 ? 'item' : 'itens'}</span>
            <span className="num" style={{ fontSize: 26 }}>{brl(total)}</span>
          </div>
          <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!quantidade || enviando || !ponto.ponto} onClick={registrar}>
            {enviando ? 'Registrando…' : quantidade ? `Recebi ${brl(total)} · registrar venda` : 'Escolha os itens'}
          </button>
          <button type="button" className="btn btn-link" onClick={() => nav('/equipe/painel')}>Cancelar</button>
        </div>
      </main>
    </div>
  )
}
