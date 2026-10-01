import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { mensagemErro } from '../lib/format'
import PageHeader from '../components/PageHeader'

export default function EntrarEquipe() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    if (!email || !senha || enviando) return
    setEnviando(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })
    setEnviando(false)
    if (error) setErro(mensagemErro(error))
  }

  return (
    <main className="screen" style={{ minHeight: '100dvh' }}>
      <PageHeader titulo="Equipe Runergy" voltar="/entrar" />
      <div className="stack" style={{ gap: 10, marginTop: 12 }}>
        <span className="pill neutral" style={{ alignSelf: 'flex-start' }}>ACESSO DA EQUIPE</span>
        <h1 className="display" style={{ fontSize: 'clamp(28px, 8.5vw, 36px)' }}>Entre para operar o ponto.</h1>
        <p className="lead">Use o e-mail e a senha da sua conta de equipe. Ainda não tem senha? Volte e entre com o código por e-mail: o modo equipe aparece sozinho no Início.</p>
      </div>
      <form className="stack" style={{ gap: 16 }} onSubmit={entrar}>
        <div className="field">
          <label htmlFor="eq-email">E-mail</label>
          <input id="eq-email" className="input" type="email" inputMode="email" autoComplete="username" autoCapitalize="none"
            placeholder="email@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="eq-senha">Senha</label>
          <input id="eq-senha" className="input" type="password" autoComplete="current-password"
            placeholder="Sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <div className="alert err" role="alert">{erro}</div>}
        <button className="btn btn-primary btn-block btn-lg" disabled={!email || !senha || enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
