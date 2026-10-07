import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePonto } from '../../lib/ponto'
import { mensagemErro, suprimento, SUPRIMENTOS, rotuloCreditos } from '../../lib/format'
import EquipeBand from '../../components/EquipeBand'
import Icon from '../../components/Icon'

// Até 6 unidades por leitura do QR (trava contra toque errado; o banco confere de novo)
const MAX_ITENS = 6

const MOTIVOS = {
  CODIGO_INVALIDO: 'QR não reconhecido.',
  CODIGO_EXPIRADO: 'Esse QR expirou. Peça para o atleta atualizar a tela.',
  CODIGO_JA_USADO: 'Esse QR já foi usado.',
  PLANO_SEM_ACESSO: 'Esta pessoa não tem acesso aos pontos (clientes: planos Starter, Runner e Hero, ou recarga válida).',
  SEM_CREDITOS: 'O atleta está sem créditos neste mês.',
  LIMITE_DIARIO: 'Conta admin já usou 10 créditos hoje (limite diário). Libera amanhã.',
}

export default function Validar() {
  const { state } = useLocation()
  const nav = useNavigate()
  const ponto = usePonto()
  const [qtd, setQtd] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const disponiveis = ponto.ponto?.suprimentos || []
  // Item que saiu do ponto escolhido deixa de contar
  useEffect(() => {
    setQtd((q) => Object.fromEntries(Object.entries(q).filter(([s]) => disponiveis.includes(s))))
  }, [disponiveis])

  if (!state?.codigo) return <Navigate to="/equipe" replace />
  const info = state.info || {}
  const semLimite = info.creditos >= 9999 || info.plano === 'demo'
  const escolhidos = Object.entries(qtd).filter(([, q]) => q > 0)
  const unidades = escolhidos.reduce((t, [, q]) => t + q, 0)
  const custo = escolhidos.reduce((t, [s, q]) => t + q * suprimento(s).peso, 0)
  const saldo = info.creditos ?? 0
  const podeMais = (s) => disponiveis.includes(s) && unidades < MAX_ITENS && (semLimite || custo + suprimento(s).peso <= saldo)
  const muda = (s, d) => { setErro(''); setQtd((q) => ({ ...q, [s]: Math.max(0, (q[s] || 0) + d) })) }
  const resumo = escolhidos.map(([s, q]) => `${q} ${suprimento(s).label}`).join(' + ')

  async function confirmar() {
    if (!unidades || enviando) return
    setEnviando(true); setErro('')
    const itens = escolhidos.map(([s, q]) => ({ suprimento: s, qtd: q }))
    const { data, error } = await supabase.rpc('confirmar_retirada_varios', { p_codigo: state.codigo, p_totem_code: ponto.codigo, p_itens: itens })
    setEnviando(false)
    if (error) { setErro(mensagemErro(error)); return }
    const r = Array.isArray(data) ? data[0] : data
    try { navigator.vibrate?.([60, 40, 60]) } catch (e) {}
    nav('/equipe', { replace: true, state: { ok: `${resumo} para ${(r?.atleta_nome || info.atleta_nome || 'o atleta').split(' ')[0]} · ${r?.creditos_restantes >= 9999 ? 'admin ilimitado' : `restam ${r?.creditos_restantes ?? '—'} créditos`}` } })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <EquipeBand ponto={ponto} voltar="/equipe" />
      <main className="screen" style={{ paddingTop: 16 }}>
        <section className="card row" aria-live="polite">
          <span style={{ width: 52, height: 52, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: info.valido ? 'var(--ok-bg)' : 'var(--err-bg)', color: info.valido ? 'var(--ok)' : 'var(--err)' }}>
            <Icon name={info.valido ? 'check' : 'x'} size={28} stroke={2.6} />
          </span>
          <div className="grow">
            <div className="tiny" style={{ fontWeight: 800, letterSpacing: '0.08em', color: info.valido ? 'var(--ok)' : 'var(--err)' }}>
              {info.valido ? 'CÓDIGO VÁLIDO' : 'NÃO LIBERADO'}
            </div>
            <div className="h2 ellipsis">{info.atleta_nome || 'Atleta'}</div>
            {info.plano_nome && <div className="small muted">{info.plano_nome} · {info.creditos >= 9999 ? 'ilimitado' : `${info.creditos} créditos`}</div>}
          </div>
        </section>
        {info.plano === 'demo' && <div className="alert warn small">Conta de demonstração: o crédito desconta (e recarrega sozinho), mas o estoque do ponto não muda. Não entregue produto por esta conta.</div>}

        {!info.valido ? (
          <>
            <div className="alert err">{MOTIVOS[info.motivo] || 'Não foi possível liberar a retirada.'}</div>
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 'auto' }} onClick={() => nav('/equipe', { replace: true })}>Escanear outro QR</button>
          </>
        ) : (
          <>
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <h2 className="h3">O que vai levar?</h2>
              <span className="small muted">até {MAX_ITENS} itens</span>
            </div>
            <div className="stack" style={{ gap: 8 }} role="group" aria-label="Escolha os itens">
              {(disponiveis.length ? disponiveis : Object.keys(SUPRIMENTOS)).map((s) => {
                const q = qtd[s] || 0
                const fora = !disponiveis.includes(s)
                return (
                  <div key={s} className="card tight row" style={{ gap: 12, opacity: fora ? 0.45 : 1 }}>
                    <span style={{ color: 'var(--orange)', display: 'inline-flex' }}><Icon name={suprimento(s).icon} size={22} /></span>
                    <div className="grow">
                      <div style={{ fontWeight: 800 }}>{suprimento(s).label}</div>
                      <div className="small muted">{fora ? 'Não tem neste ponto' : rotuloCreditos(suprimento(s).peso)}</div>
                    </div>
                    <div className="stepper">
                      <button type="button" aria-label={`Menos ${suprimento(s).label}`} onClick={() => muda(s, -1)} disabled={!q}><Icon name="minus" size={18} /></button>
                      <span aria-live="polite" style={{ minWidth: 24, textAlign: 'center', fontWeight: 900, fontSize: 18 }}>{q}</span>
                      <button type="button" aria-label={`Mais ${suprimento(s).label}`} onClick={() => muda(s, 1)} disabled={!podeMais(s)}
                        style={podeMais(s) ? { background: 'var(--orange)', color: 'var(--on-orange)' } : undefined}><Icon name="plus" size={18} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
            {unidades > 0 && (
              <div className="card tight row between" aria-live="polite" style={{ gap: 12 }}>
                <span className="small" style={{ fontWeight: 700 }}>{unidades} {unidades === 1 ? 'item' : 'itens'} · {rotuloCreditos(custo)}</span>
                <span className="small muted">{semLimite ? (info.plano === 'demo' ? 'demonstração' : 'admin ilimitado') : `fica com ${saldo - custo}`}</span>
              </div>
            )}
            {!ponto.ponto && <div className="alert warn">Escolha o ponto de operação no topo da tela.</div>}
            {erro && <div className="alert err" role="alert">{erro}</div>}
            <div className="stack" style={{ marginTop: 'auto', gap: 8 }}>
              <button className="btn btn-primary btn-block btn-lg" disabled={!unidades || enviando || !ponto.ponto} onClick={confirmar}>
                {enviando ? 'Confirmando…' : unidades ? `Confirmar · ${rotuloCreditos(custo)}` : 'Escolha os itens'}
              </button>
              <button className="btn btn-link" onClick={() => nav('/equipe', { replace: true })}>Cancelar</button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
