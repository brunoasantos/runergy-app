import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { mensagemErro } from '../lib/format'
import { emailValido, mascaraTel } from '../lib/cadastro'
import PageHeader from '../components/PageHeader'
import CodigoForm from '../components/CodigoForm'

// Conta grátis: nome, e-mail, WhatsApp e senha. Endereço só quando assinar um plano.
// Com a confirmação de e-mail ligada no Supabase, chega um código de 6 dígitos (uma vez só).
export default function CriarConta() {
  const loc = useLocation()
  const [f, setF] = useState({ nome: '', email: loc.state?.email || '', telefone: '', senha: '' })
  const [aceite, setAceite] = useState(false)
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [jaExiste, setJaExiste] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const em = f.email.trim().toLowerCase()
  const forca = Math.min(3, (f.senha.length >= 8) + (/\d/.test(f.senha) && /[a-z]/i.test(f.senha)) + (f.senha.length >= 12 || /[^a-z0-9]/i.test(f.senha)))
  const ok = f.nome.trim().length >= 3 && emailValido(em) && f.telefone.replace(/\D/g, '').length >= 10 && f.senha.length >= 8 && aceite

  async function criar(e) {
    e.preventDefault()
    if (!ok || enviando) return
    setEnviando(true); setErro(''); setJaExiste(false)
    const { data, error } = await supabase.auth.signUp({
      email: em, password: f.senha,
      options: { data: { nome: f.nome.trim().replace(/\s+/g, ' '), telefone: f.telefone }, emailRedirectTo: window.location.origin },
    })
    setEnviando(false)
    if (error) {
      if (/already registered|already exists/i.test(error.message)) { setJaExiste(true); return }
      setErro(/Password/i.test(error.message) ? 'Senha fraca: use pelo menos 8 caracteres, com letras e números.' : mensagemErro(error)); return
    }
    // E-mail já cadastrado: o Supabase devolve um usuário sem identidades (não revela a conta)
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) { setJaExiste(true); return }
    if (!data?.session) setConfirmar(true)
    // com sessão: o AuthProvider percebe e as rotas levam para o início
  }

  if (confirmar) {
    return (
      <main className="screen" style={{ minHeight: '100dvh' }}>
        <PageHeader titulo="" voltar={null} />
        <div className="stack" style={{ gap: 10 }}>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 8.5vw, 36px)' }}>Confira seu e-mail</h1>
          <p className="lead">Mandamos um código de 6 dígitos para <strong style={{ color: 'var(--text)' }}>{em}</strong>. É só desta vez, para confirmar que o e-mail é seu. Confira também o spam.</p>
        </div>
        <CodigoForm email={em} tipo="signup" botao="Confirmar e entrar"
          reenviar={() => supabase.auth.resend({ type: 'signup', email: em })}
          onTrocarEmail={() => setConfirmar(false)} />
        <div className="card tight small" style={{ marginTop: 'auto', color: 'var(--text-2)' }}>Da próxima vez é só e-mail e senha.</div>
      </main>
    )
  }

  return (
    <main className="screen" style={{ minHeight: '100dvh' }}>
      <PageHeader titulo="" voltar="/entrar" />
      <div className="stack" style={{ gap: 8 }}>
        <h1 className="display" style={{ fontSize: 'clamp(28px, 8.5vw, 36px)' }}>Crie sua conta grátis</h1>
        <p className="lead">Leva 30 segundos. O endereço só pedimos quando você assinar um plano.</p>
      </div>
      <form className="stack" style={{ gap: 14 }} onSubmit={criar} noValidate>
        <div className="field"><label htmlFor="cc-nome">Nome completo</label>
          <input id="cc-nome" className="input" autoComplete="name" autoCapitalize="words" placeholder="Seu nome completo" value={f.nome} onChange={(e) => set('nome', e.target.value)} maxLength={80} /></div>
        <div className="field"><label htmlFor="cc-email">E-mail</label>
          <input id="cc-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="email@email.com" value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
        <div className="field"><label htmlFor="cc-tel">WhatsApp</label>
          <input id="cc-tel" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={f.telefone} onChange={(e) => set('telefone', mascaraTel(e.target.value))} /></div>
        <div className="field"><label htmlFor="cc-senha">Crie uma senha</label>
          <div style={{ position: 'relative' }}>
            <input id="cc-senha" className="input" type={verSenha ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 8 caracteres"
              value={f.senha} onChange={(e) => set('senha', e.target.value)} style={{ paddingRight: 84 }} />
            <button type="button" className="btn-link" onClick={() => setVerSenha((v) => !v)}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-2)' }}>{verSenha ? 'Ocultar' : 'Mostrar'}</button>
          </div>
          <div className="row" style={{ gap: 6 }} aria-label={`Força da senha: ${['fraca', 'fraca', 'média', 'forte'][forca]}`}>
            {[1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: f.senha && forca >= i ? 'var(--orange)' : 'var(--line-strong)' }} />)}
            <span className="tiny muted" style={{ marginLeft: 6, whiteSpace: 'nowrap' }}>{f.senha.length < 8 ? 'Mínimo 8 caracteres' : ['fraca', 'fraca', 'média', 'forte'][forca]}</span>
          </div>
        </div>
        <label className="row small" style={{ gap: 10, alignItems: 'flex-start', color: 'var(--text-2)', lineHeight: 1.45, cursor: 'pointer' }}>
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} style={{ width: 20, height: 20, margin: 0, accentColor: 'var(--orange)', flexShrink: 0 }} />
          <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span>
        </label>
        {jaExiste && <div className="alert warn" role="alert">Esse e-mail já tem conta na Runergy. <Link to="/entrar" state={{ email: em }}>Entrar</Link> ou use “Esqueci minha senha”.</div>}
        {erro && <div className="alert err" role="alert">{erro}</div>}
        <button className="btn btn-primary btn-block btn-lg" disabled={!ok || enviando}>{enviando ? 'Criando…' : 'Criar conta grátis'}</button>
      </form>
      <p className="small" style={{ textAlign: 'center', margin: '8px 0 0' }}>Já tem conta? <Link to="/entrar" state={{ email: em }} style={{ fontWeight: 800 }}>Entrar</Link></p>
    </main>
  )
}
