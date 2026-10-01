import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { mensagemErro } from '../lib/format'
import { RMark } from '../components/Brand'

// Primeiro acesso: pede só o nome. O resto o atleta completa depois.
export default function BemVindo() {
  const { perfil, recarregarPerfil } = useAuth()
  const nav = useNavigate()
  const [nome, setNome] = useState(perfil?.nome || '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const n = nome.trim().replace(/\s+/g, ' ')
    if (n.length < 2 || salvando) return
    setSalvando(true); setErro('')
    const { error } = await supabase.from('perfis').update({ nome: n }).eq('id', perfil.id)
    if (error) { setErro(mensagemErro(error)); setSalvando(false); return }
    await recarregarPerfil()
    nav('/', { replace: true })
  }

  return (
    <main className="screen" style={{ minHeight: '100dvh' }}>
      <RMark size={56} />
      <div className="stack" style={{ gap: 10, marginTop: 24 }}>
        <span className="eyebrow">Bem-vindo à Runergy</span>
        <h1 className="display">Como podemos te chamar?</h1>
        <p className="lead">É o nome que a equipe vê quando você mostra o QR no ponto.</p>
      </div>
      <form className="stack" style={{ gap: 16 }} onSubmit={salvar}>
        <div className="field">
          <label htmlFor="nome">Seu nome</label>
          <input id="nome" className="input" autoComplete="name" autoCapitalize="words" placeholder="Seu nome"
            value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} />
        </div>
        {erro && <div className="alert err" role="alert">{erro}</div>}
        <button className="btn btn-primary btn-block btn-lg" disabled={nome.trim().length < 2 || salvando}>
          {salvando ? 'Salvando…' : 'Continuar'}
        </button>
      </form>
    </main>
  )
}
