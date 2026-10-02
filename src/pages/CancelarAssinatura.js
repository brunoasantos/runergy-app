import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { brl, fmtData } from '../lib/format'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'

const MOTIVOS = [
  ['preco', 'Ficou caro para mim'],
  ['uso', 'Estou usando pouco'],
  ['ponto', 'Não tem ponto Runergy perto'],
  ['entrega', 'Problema com a entrega do kit'],
  ['outro', 'Outro motivo'],
]

/** Cancelar a assinatura pelo app: cancela no Mercado Pago na hora e mantém o plano até o fim do mês já pago. */
export default function CancelarAssinatura() {
  const { recarregarPerfil } = useAuth()
  const nav = useNavigate()
  const [ass, setAss] = useState(undefined)
  const [motivo, setMotivo] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState(null)

  useEffect(() => {
    supabase.rpc('minha_assinatura_v2').then(({ data }) => setAss((data || [])[0] || null))
  }, [])

  async function cancelar() {
    if (!motivo || enviando) return
    setEnviando(true); setErro('')
    const { data, error } = await supabase.functions.invoke('mp-cancelar', { body: { motivo, texto } })
    setEnviando(false)
    if (error || !data?.ok) { setErro('Não foi possível cancelar agora. Tente de novo em instantes ou fale com a gente.'); return }
    setFeito(data.acesso_ate)
    recarregarPerfil?.()
  }

  const ativa = ass && ass.status === 'ativo' && ass.pelo_mp

  return (
    <>
      <main className="screen has-nav" style={{ gap: 14 }}>
        <PageHeader titulo="Cancelar assinatura" voltar={-1} />

        {ass === undefined && <div className="skeleton" style={{ height: 120 }} />}

        {feito && (
          <section className="card stack" style={{ gap: 10 }}>
            <strong style={{ fontSize: 18 }}>Assinatura cancelada</strong>
            <span className="small" style={{ color: 'var(--text-2)' }}>
              {new Date(feito) > new Date()
                ? <>Você continua com o plano <strong>{ass?.plano_nome}</strong> e seus créditos até <strong>{fmtData(feito)}</strong>. Depois a conta vira Free e o app continua funcionando.</>
                : <>Sua conta voltou para Free. O app continua funcionando.</>}
            </span>
            <span className="small" style={{ color: 'var(--text-2)' }}>Nenhuma nova cobrança será feita no Mercado Pago.</span>
            <Link to="/" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>Voltar ao início</Link>
          </section>
        )}

        {!feito && ass === null && (
          <section className="card stack" style={{ gap: 10 }}>
            <span className="small" style={{ color: 'var(--text-2)' }}>Não encontramos uma assinatura ativa na sua conta.</span>
            <Link to="/perfil" className="btn btn-ghost btn-block" style={{ textDecoration: 'none' }}>Voltar</Link>
          </section>
        )}

        {!feito && ass && !ativa && (
          <section className="card stack" style={{ gap: 10 }}>
            <span className="small" style={{ color: 'var(--text-2)' }}>
              {ass.status === 'cancelado' && ass.acesso_ate
                ? `Esta assinatura já foi cancelada. Os benefícios continuam até ${fmtData(ass.acesso_ate)}.`
                : 'Esta assinatura não está ativa no momento.'}
            </span>
            <Link to="/perfil" className="btn btn-ghost btn-block" style={{ textDecoration: 'none' }}>Voltar</Link>
          </section>
        )}

        {!feito && ativa && (
          <>
            <section className="card stack" style={{ gap: 6 }}>
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <strong style={{ fontSize: 17 }}>{ass.plano_nome}</strong>
                <strong>{brl(ass.preco)}<span className="tiny" style={{ fontWeight: 600 }}>/mês</span></strong>
              </div>
              <span className="small" style={{ color: 'var(--text-2)' }}>
                Se cancelar, você continua com o plano e os créditos até o fim do mês já pago. Depois a conta vira Free: o app e o mapa de pontos continuam funcionando.
              </span>
            </section>

            <section className="stack" style={{ gap: 8 }} role="radiogroup" aria-label="Motivo do cancelamento">
              <span className="label-caps">Por que você quer cancelar?</span>
              {MOTIVOS.map(([id, rotulo]) => (
                <button key={id} type="button" role="radio" aria-checked={motivo === id} className={`card tight plano-op${motivo === id ? ' sel' : ''}`} onClick={() => setMotivo(id)}>
                  <span style={{ fontWeight: 700 }}>{rotulo}</span>
                </button>
              ))}
              <div className="field">
                <label htmlFor="cx-texto">Quer contar mais? (opcional)</label>
                <textarea id="cx-texto" className="input" rows={3} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Sua resposta ajuda a melhorar a Runergy" />
              </div>
            </section>

            {erro && <div className="alert err" role="alert">{erro}</div>}
            <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => nav(-1)}>Manter meu plano</button>
            <button type="button" className="btn btn-ghost btn-block" style={{ color: 'var(--err)' }} disabled={!motivo || enviando} onClick={cancelar}>
              {enviando ? 'Cancelando…' : 'Cancelar assinatura'}
            </button>
            {!motivo && <span className="tiny muted" style={{ textAlign: 'center' }}>Escolha um motivo para continuar.</span>}
          </>
        )}
      </main>
      <BottomNav />
    </>
  )
}
