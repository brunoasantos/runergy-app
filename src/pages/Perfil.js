import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useTema } from '../lib/temaCtx'
import { brl, mensagemErro, LINK_PLANOS } from '../lib/format'
import BottomNav from '../components/BottomNav'
import ThemeSwitch from '../components/ThemeSwitch'
import Icon from '../components/Icon'

export default function Perfil() {
  const { perfil, ehEquipe, sair, recarregarPerfil } = useAuth()
  const tema = useTema()
  const plano = perfil.planos || {}
  const maxCred = Math.max(plano.creditos_mes || 0, perfil.creditos || 0, 1)
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(perfil.nome || '')
  const [erro, setErro] = useState('')

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
          <div className="streaks" aria-hidden="true" style={{ right: 0, top: -10, width: 60, height: 140 }}><i style={{ right: 20, width: 12, height: 140, opacity: 0.8 }} /></div>
          <span className="label-caps">Seu plano</span>
          <div className="row" style={{ alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span className="num" style={{ fontSize: 34, textTransform: 'uppercase' }}>{plano.nome || 'Grátis'}</span>
            {plano.preco > 0 && <span className="small" style={{ color: 'var(--text-2)' }}>{brl(plano.preco)}/mês</span>}
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="row between small"><span style={{ color: 'var(--text-2)' }}>Créditos disponíveis</span><strong>{perfil.creditos}{plano.creditos_mes ? ` de ${plano.creditos_mes}` : ''}</strong></div>
            <div className="bar"><span style={{ width: `${Math.min(100, Math.round((perfil.creditos / maxCred) * 100))}%` }} /></div>
            <span className="tiny muted">{plano.acesso_totem ? 'Acesso a todos os pontos Runergy.' : 'Sem acesso aos pontos — disponível no plano Hero.'}</span>
          </div>
          <a href={LINK_PLANOS} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-block">
            {plano.acesso_totem ? 'Ver planos' : 'Quero ser Hero'}
          </a>
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
          <div className="list-link" aria-disabled="true">
            <span style={{ color: 'var(--orange)' }}><Icon name="watch" size={20} /></span><span className="grow">Relógio e Wallet</span><span className="pill neutral">Em breve</span>
          </div>
          <a className="list-link" href="https://www.instagram.com/runergy.app/" target="_blank" rel="noopener noreferrer">
            <span style={{ color: 'var(--orange)' }}><Icon name="help" size={20} /></span><span className="grow">Ajuda e contato</span><Icon name="chevron" size={18} />
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
