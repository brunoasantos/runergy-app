import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePonto } from '../../lib/ponto'
import { mensagemErro, suprimento, SUPRIMENTOS } from '../../lib/format'
import EquipeBand from '../../components/EquipeBand'
import Icon from '../../components/Icon'

const MOTIVOS = {
  CODIGO_INVALIDO: 'QR não reconhecido.',
  CODIGO_EXPIRADO: 'Esse QR expirou. Peça para o atleta atualizar a tela.',
  CODIGO_JA_USADO: 'Esse QR já foi usado.',
  PLANO_SEM_ACESSO: 'Esta pessoa não tem acesso aos pontos (clientes: só os planos Runner e Hero).',
  SEM_CREDITOS: 'O atleta está sem créditos neste mês.',
}

export default function Validar() {
  const { state } = useLocation()
  const nav = useNavigate()
  const ponto = usePonto()
  const [item, setItem] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const disponiveis = ponto.ponto?.suprimentos || []
  useEffect(() => { if (item && !disponiveis.includes(item)) setItem(null) }, [disponiveis, item])

  if (!state?.codigo) return <Navigate to="/equipe" replace />
  const info = state.info || {}

  async function confirmar() {
    if (!item || enviando) return
    setEnviando(true); setErro('')
    const { data, error } = await supabase.rpc('confirmar_retirada', { p_codigo: state.codigo, p_totem_code: ponto.codigo, p_suprimento: item })
    setEnviando(false)
    if (error) { setErro(mensagemErro(error)); return }
    const r = Array.isArray(data) ? data[0] : data
    try { navigator.vibrate?.([60, 40, 60]) } catch (e) {}
    nav('/equipe', { replace: true, state: { ok: `${suprimento(item).label} entregue para ${(r?.atleta_nome || info.atleta_nome || 'o atleta').split(' ')[0]} · ${r?.creditos_restantes >= 9999 ? 'admin ilimitado' : `restam ${r?.creditos_restantes ?? '—'} créditos`}` } })
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

        {!info.valido ? (
          <>
            <div className="alert err">{MOTIVOS[info.motivo] || 'Não foi possível liberar a retirada.'}</div>
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 'auto' }} onClick={() => nav('/equipe', { replace: true })}>Escanear outro QR</button>
          </>
        ) : (
          <>
            <h2 className="h3">O que vai levar?</h2>
            <div className="supply-grid" role="group" aria-label="Escolha o item">
              {Object.keys(SUPRIMENTOS).map((s) => (
                <button key={s} className="supply" aria-pressed={item === s} disabled={!disponiveis.includes(s)} onClick={() => setItem(s)}>
                  <Icon name={suprimento(s).icon} size={32} />{suprimento(s).label}
                </button>
              ))}
            </div>
            {!ponto.ponto && <div className="alert warn">Escolha o ponto de operação no topo da tela.</div>}
            {erro && <div className="alert err" role="alert">{erro}</div>}
            <div className="stack" style={{ marginTop: 'auto', gap: 8 }}>
              <button className="btn btn-primary btn-block btn-lg" disabled={!item || enviando || !ponto.ponto} onClick={confirmar}>
                {enviando ? 'Confirmando…' : item ? `Confirmar entrega · ${suprimento(item).label}` : 'Escolha o item'}
              </button>
              <button className="btn btn-link" onClick={() => nav('/equipe', { replace: true })}>Cancelar</button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
