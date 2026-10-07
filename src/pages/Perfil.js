import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useTema } from '../lib/temaCtx'
import { brl, fmtData, mensagemErro } from '../lib/format'
import BottomNav from '../components/BottomNav'
import ThemeSwitch from '../components/ThemeSwitch'
import Icon from '../components/Icon'
import { TERMOS_URL } from '../lib/termos'

export default function Perfil() {
  const { perfil, ehEquipe, conta, sair, recarregarPerfil } = useAuth()
  const tema = useTema()
  const maxCred = Math.max(conta.creditosMes || 0, conta.creditosTotal || 0, 1)
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(perfil.nome || '')
  const [erro, setErro] = useState('')
  const [ass, setAss] = useState(null)
  useEffect(() => {
    if (conta.tipo !== 'cliente') return
    supabase.rpc('minha_assinatura_v2').then(({ data }) => setAss((data || [])[0] || null))
  }, [conta.tipo, perfil.plano])
  const cancelada = ass && ass.status === 'cancelado' && ass.acesso_ate && new Date(ass.acesso_ate) > new Date()

  async function salvarNome(e) {
    e.preventDefault()
    const n = nome.trim().replace(/\s+/g, ' ')
    if (n.length < 2) return
    const { error } = await supabase.from('perfis').update({ nome: n }).eq('id', perfil.id)
    if (error) { setErro(mensagemErro(error)); return }
    await recarregarPerfil(); setEditando(false); setErro('')
  }

  return (
    <>
      <main className="screen has-nav">
        <div className="row" style={{ gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, background: 'var(--orange)', color: 'var(--on-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, flexShrink: 0 }}>
            {(perfil.nome || 'R').charAt(0).toUpperCase()}
          </div>
          <div className="grow">
            <div className="h2 ellipsis">{perfil.nome}</div>
            <div className="small muted ellipsis">{perfil.email}</div>
          </div>
        </div>

        <section className="card accent stack" style={{ gap: 14 }} aria-label="Seu plano">
          <div className="streaks" aria-hidden="true" style={{ right: 0, top: -10, width: 60, height: 96 }}><i style={{ right: 20, width: 12, height: 96, opacity: 0.8 }} /></div>
          <span className="label-caps">{conta.tipo === 'cliente' ? 'Seu plano' : 'Seu acesso'}</span>
          <div className="row" style={{ alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span className="num" style={{ fontSize: 'clamp(26px, 8vw, 34px)', textTransform: 'uppercase' }}>{conta.rotulo}</span>
            {conta.precoCliente > 0 && <span className="small" style={{ color: 'var(--text-2)' }}>{brl(conta.precoCliente)}/mês{conta.kitEmCasa ? ' + frete' : ''}</span>}
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="row between small"><span style={{ color: 'var(--text-2)' }}>Créditos disponíveis</span><strong>{conta.ilimitado ? 'Ilimitado' : `${conta.creditosTotal}${!conta.saldoRecarga && conta.creditosMes && perfil.creditos <= conta.creditosMes ? ` de ${conta.creditosMes}` : ''}`}</strong></div>
            <div className="bar"><span style={{ width: conta.ilimitado ? '100%' : `${Math.min(100, Math.round((conta.creditosTotal / maxCred) * 100))}%` }} /></div>
            {conta.saldoRecarga > 0 && <div className="row between small"><span style={{ color: 'var(--text-2)' }}>Recarga{conta.recargaVenceEm ? ` · vale até ${fmtData(conta.recargaVenceEm)}` : ''}</span><strong>{conta.saldoRecarga}</strong></div>}
            <span className="tiny muted">{conta.kitEmCasa ? 'Kit em casa todo mês. O acesso aos pontos vem nos planos Starter, Runner e Hero.' : conta.acessoQR ? `Acesso a todos os pontos Runergy.${conta.creditosMes ? (perfil.tipo === 'cliente' && perfil.plano === 'hero' ? ` Todo dia 1º entram ${conta.creditosMes} e o que sobrar (até 30) continua com você.` : ` Renova para ${conta.creditosMes} no dia 1º de cada mês.`) : ''}` : 'Sem acesso aos pontos: disponível nos planos Starter, Runner e Hero.'}</span>
          </div>
          {ass && ass.status === 'ativo' && ass.plano_agendado && <div className="alert warn small">Muda para <strong>{ass.plano_agendado.charAt(0).toUpperCase() + ass.plano_agendado.slice(1)}</strong> em {fmtData(ass.troca_em)}. Para desfazer, abra Ver planos.</div>}
          {cancelada && <div className="alert warn small">Assinatura cancelada. Seus benefícios continuam até <strong>{fmtData(ass.acesso_ate)}</strong>; depois a conta vira Free.</div>}
          {conta.podeRecarregar && (
            <Link to="/recarga" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>Recarregar créditos</Link>
          )}
          {conta.tipo === 'cliente' && (
            <Link to="/planos" className="btn btn-ghost btn-block" style={{ textDecoration: 'none' }}>
              {cancelada ? 'Assinar de novo' : 'Ver planos'}
            </Link>
          )}
          {conta.tipo === 'cliente' && (conta.kitEmCasa || ['runner', 'hero'].includes(perfil.plano)) && (
            <Link to="/kit" className="btn btn-ghost btn-block" style={{ textDecoration: 'none' }}>{conta.kitEmCasa ? 'Meu kit' : 'Meus brindes'}</Link>
          )}
          {ass && ass.status === 'ativo' && ass.pelo_mp && (
            <Link to="/assinatura/cancelar" className="small" style={{ textAlign: 'center', color: 'var(--text-2)', fontWeight: 600 }}>Cancelar assinatura</Link>
          )}
        </section>

        {ehEquipe && (
          <Link to="/equipe" className="btn btn-dark btn-block"><Icon name="scan" />Entrar no modo equipe</Link>
        )}

        <section className="stack" style={{ gap: 10 }} aria-label="Aparência">
          <span className="label-caps">Aparência</span>
          <ThemeSwitch tema={tema} />
        </section>

        <section aria-label="Conta">
          {editando ? (
            <form className="stack" style={{ gap: 10, padding: '8px 0' }} onSubmit={salvarNome}>
              <div className="field">
                <label htmlFor="p-nome">Seu nome</label>
                <input id="p-nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} autoComplete="name" />
              </div>
              {erro && <div className="alert err">{erro}</div>}
              <div className="row" style={{ gap: 10 }}>
                <button type="button" className="btn btn-ghost grow" onClick={() => { setEditando(false); setNome(perfil.nome || '') }}>Cancelar</button>
                <button className="btn btn-primary grow">Salvar</button>
              </div>
            </form>
          ) : (
            <button className="list-link" onClick={() => setEditando(true)}>
              <span style={{ color: 'var(--orange)' }}><Icon name="user" size={20} /></span><span className="grow">Editar nome</span><Icon name="chevron" size={18} />
            </button>
          )}
          <Link className="list-link" to="/nova-senha" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--orange)' }}><Icon name="keyboard" size={20} /></span><span className="grow">Alterar senha</span><Icon name="chevron" size={18} />
          </Link>
          <div className="list-link" aria-disabled="true">
            <span style={{ color: 'var(--orange)' }}><Icon name="watch" size={20} /></span><span className="grow">Relógio e Wallet</span><span className="pill neutral">Em breve</span>
          </div>
          <a className="list-link" href="https://www.instagram.com/runergy.app/" target="_blank" rel="noopener noreferrer">
            <span style={{ color: 'var(--orange)' }}><Icon name="help" size={20} /></span><span className="grow">Ajuda e contato</span><Icon name="chevron" size={18} />
          </a>
          <a className="list-link" href={TERMOS_URL} target="_blank" rel="noopener noreferrer">
            <span style={{ color: 'var(--orange)' }}><Icon name="check" size={20} /></span><span className="grow">Termos e privacidade</span><Icon name="chevron" size={18} />
          </a>
        </section>

        <button className="btn btn-link" onClick={sair} style={{ alignSelf: 'center', color: 'var(--err)' }}>
          <Icon name="logout" size={18} /> Sair da conta
        </button>
        <p className="tiny muted" style={{ textAlign: 'center', margin: 0 }}>Runergy v2.0 · KEEP YOUR PACE.</p>
      </main>
      <BottomNav />
    </>
  )
}
