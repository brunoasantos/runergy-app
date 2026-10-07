import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { brl, fmtData, mensagemErro } from '../lib/format'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

const SITUACAO = { paga: ['Paga', 'ok'], pendente: ['Aguardando pagamento', 'warn'], cancelada: ['Cancelada', 'neutral'] }

/**
 * Recarga de créditos (assinantes Starter, Runner e Hero).
 * Os créditos da recarga ficam num saldo separado do plano e valem 60 dias; nas retiradas, o app usa primeiro
 * os créditos do plano e depois os da recarga. Pagamento avulso no Mercado Pago (Edge Function mp-recarga).
 */
export default function Recarga() {
  const { conta, recarregarPerfil } = useAuth()
  const [q, setQ] = useSearchParams()
  const voltouDoPagamento = q.get('r')
  const [pacotes, setPacotes] = useState(null)
  const [escolha, setEscolha] = useState('mais5')
  const [lista, setLista] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [retorno, setRetorno] = useState(voltouDoPagamento ? 'conferindo' : null) // conferindo | creditada | pendente

  // Pedido não pago some da tela depois de 2 dias (vira "Não concluída" só no painel)
  const carregarLista = useCallback(() => supabase.from('recargas').select('id, criado_em, creditos, restante, preco, status, valido_ate, origem, mp_link')
    .neq('status', 'expirada').order('criado_em', { ascending: false }).limit(10)
    .then(({ data }) => setLista((data || []).filter((r) => r.status !== 'pendente' || Date.now() - new Date(r.criado_em).getTime() < 47 * 3600e3))), [])

  useEffect(() => {
    supabase.from('recarga_pacotes').select('id, creditos, preco').eq('ativo', true).order('ordem')
      .then(({ data }) => { setPacotes(data || []); if (data?.length && !data.some((p) => p.id === 'mais5')) setEscolha(data[0].id) })
    carregarLista()
  }, [carregarLista])

  // Voltou do Mercado Pago: confere o pagamento (o aviso do MP também credita sozinho; aqui é a garantia)
  useEffect(() => {
    if (!voltouDoPagamento) return
    let vivo = true
    ;(async () => {
      for (let tentativa = 0; tentativa < 4 && vivo; tentativa++) {
        const { data } = await supabase.functions.invoke('mp-recarga', { body: { acao: 'conferir', id: voltouDoPagamento } })
        const { data: r } = await supabase.from('recargas').select('status').eq('id', voltouDoPagamento).maybeSingle()
        if (!vivo) return
        if (r?.status === 'paga' || data?.creditadas > 0) { setRetorno('creditada'); break }
        if (r?.status === 'cancelada') { setRetorno('cancelada'); break }
        if (tentativa === 3) setRetorno('pendente')
        else await new Promise((ok) => setTimeout(ok, 2500))
      }
      if (vivo) { await recarregarPerfil?.(); carregarLista() }
    })()
    return () => { vivo = false }
  }, [voltouDoPagamento]) // eslint-disable-line

  const pacote = (pacotes || []).find((p) => p.id === escolha)

  async function pagar() {
    if (!pacote || enviando) return
    setEnviando(true); setErro('')
    const { data, error } = await supabase.functions.invoke('mp-recarga', { body: { acao: 'criar', pacote: pacote.id } })
    if (error || !data?.link) {
      let codigo = ''
      try { codigo = (await error?.context?.json())?.erro || '' } catch (e) {}
      setErro(codigo ? mensagemErro({ message: codigo }) : 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.')
      setEnviando(false); return
    }
    window.location.href = data.link
  }

  if (!conta.podeRecarregar) {
    return (
      <>
        <main className="screen has-nav" style={{ gap: 14 }}>
          <PageHeader titulo="Recarregar créditos" voltar={-1} />
          <section className="card stack" style={{ gap: 12, textAlign: 'center', alignItems: 'center', padding: 24 }}>
            <span className="icon-tile" style={{ width: 64, height: 64, borderRadius: 18 }}><Icon name="bolt" size={32} /></span>
            <h1 className="h2">A recarga é para assinantes</h1>
            <p className="small" style={{ margin: 0, color: 'var(--text-2)' }}>Quem tem plano Starter, Runner ou Hero pode comprar créditos extras pelo app, mais baratos que no avulso.</p>
            <Link to="/planos" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>Ver planos</Link>
          </section>
        </main>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <main className="screen has-nav" style={{ gap: 14 }}>
        <PageHeader titulo="Recarregar créditos" voltar="/" />

        {retorno && (
          <div className={`alert ${retorno === 'creditada' ? 'ok' : retorno === 'cancelada' ? 'err' : 'warn'}`} role="status">
            {retorno === 'conferindo' && 'Confirmando seu pagamento…'}
            {retorno === 'creditada' && 'Pronto! Os créditos da recarga já estão no seu saldo.'}
            {retorno === 'pendente' && 'O pagamento ainda não foi confirmado. Assim que o Mercado Pago aprovar, os créditos entram sozinhos (Pix costuma levar segundos).'}
            {retorno === 'cancelada' && 'O pagamento não foi aprovado. Nada foi cobrado; tente de novo quando quiser.'}
            {retorno !== 'conferindo' && <button type="button" className="btn-link" style={{ marginLeft: 6, minHeight: 0, padding: 0 }} onClick={() => { setRetorno(null); q.delete('r'); setQ(q, { replace: true }) }}>Ok</button>}
          </div>
        )}

        <section className="card" aria-label="Seu saldo">
          <span className="label-caps">Seu saldo agora</span>
          <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <span className="num" style={{ fontSize: 'clamp(44px, 14vw, 56px)' }}>{conta.creditosTotal}</span>
            <span className="small" style={{ color: 'var(--text-2)' }}>créditos</span>
          </div>
          <span className="small" style={{ display: 'block', marginTop: 6, color: 'var(--text-2)' }}>
            {conta.creditosPlano} do plano{conta.saldoRecarga > 0 ? ` · ${conta.saldoRecarga} da recarga${conta.recargaVenceEm ? ` (até ${fmtData(conta.recargaVenceEm)})` : ''}` : ''}
          </span>
        </section>

        <div className="stack" role="radiogroup" aria-label="Pacotes de recarga" style={{ gap: 10 }}>
          {pacotes === null && [0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 72 }} />)}
          {(pacotes || []).map((p) => {
            const on = escolha === p.id
            const porCredito = Number(p.preco) / p.creditos
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} className={`card tight plano-op${on ? ' sel' : ''}`} onClick={() => setEscolha(p.id)}>
                <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}>
                  <strong style={{ fontSize: 17 }}>+{p.creditos} créditos</strong>
                  <strong style={{ whiteSpace: 'nowrap' }}>{brl(p.preco)}</strong>
                </div>
                <span className="small" style={{ color: 'var(--text-2)' }}>{brl(porCredito)} por crédito · no avulso sairia {brl(p.creditos * 3)}</span>
              </button>
            )
          })}
        </div>

        <div className="card tight row">
          <span className="icon-tile"><Icon name="clock" /></span>
          <span className="small" style={{ color: 'var(--text-2)' }}>Os créditos da recarga valem 60 dias e ficam separados do plano. Nas retiradas, usamos primeiro os créditos do plano.</span>
        </div>

        {erro && <div className="alert err" role="alert">{erro}</div>}
        <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!pacote || enviando} onClick={pagar}>
          {enviando ? 'Abrindo pagamento…' : pacote ? `Pagar ${brl(pacote.preco)}` : 'Escolha um pacote'}
        </button>
        <span className="tiny muted" style={{ textAlign: 'center', marginTop: -6 }}>Pagamento seguro no Mercado Pago (Pix ou cartão). Os créditos entram assim que o pagamento é aprovado.</span>

        {lista?.length > 0 && (
          <section className="stack" style={{ gap: 8 }} aria-label="Suas recargas">
            <span className="label-caps">Suas recargas</span>
            {lista.map((r) => {
              const [rot, cor] = SITUACAO[r.status] || [r.status, 'neutral']
              const vencida = r.status === 'paga' && r.valido_ate && new Date(r.valido_ate) < new Date()
              return (
                <div key={r.id} className={`card tight ${r.status === 'pendente' && r.mp_link ? 'stack' : 'row between'}`} style={{ gap: 10 }}>
                  <span className="stack" style={{ gap: 2 }}>
                    <strong className="small">+{r.creditos} créditos · {r.origem === 'cortesia' ? 'cortesia' : brl(r.preco)}</strong>
                    <span className="tiny muted">{fmtData(r.criado_em)}{r.status === 'pendente' ? ' · aguardando pagamento (o link vale 2 dias)' : ''}{r.status === 'paga' && r.valido_ate ? ` · ${vencida ? 'venceu' : 'vale até'} ${fmtData(r.valido_ate)} · restam ${r.restante}` : ''}</span>
                  </span>
                  {r.status === 'pendente' && r.mp_link
                    ? <a href={r.mp_link} className="btn btn-primary btn-sm btn-block" style={{ textDecoration: 'none' }}>Continuar pagamento</a>
                    : <span className={`pill ${vencida ? 'neutral' : cor}`}>{vencida ? 'Vencida' : r.origem === 'cortesia' && r.status === 'paga' ? 'Cortesia' : rot}</span>}
                </div>
              )
            })}
          </section>
        )}
      </main>
      <BottomNav />
    </>
  )
}
