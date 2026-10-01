import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase, erroDoLink } from '../lib/supabase'
import { mensagemErro } from '../lib/format'
import { emailValido, PEDIR_NOVA_SENHA } from '../lib/cadastro'
import { RMark, Streaks } from '../components/Brand'
import Icon from '../components/Icon'
import CodigoForm from '../components/CodigoForm'
import { useTema } from '../lib/temaCtx'

// Telas:
//   senha    → e-mail + senha (padrão)
//   pedir    → e-mail para receber código (entrar sem senha ou "esqueci minha senha")
//   codigo   → digitar o código (tipo email ou signup)
export default function Entrar() {
  const tema = useTema()
  const loc = useLocation()
  const [tela, setTela] = useState('senha')
  const [motivo, setMotivo] = useState('entrar') // entrar | esqueci | confirmar
  const [email, setEmail] = useState(loc.state?.email || '')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState(erroDoLink ? 'Esse link do e-mail expirou ou já foi usado. Entre com e-mail e senha ou peça um código.' : '')
  const [enviando, setEnviando] = useState(false)
  const em = email.trim().toLowerCase()

  async function entrarComSenha(e) {
    e.preventDefault()
    if (!emailValido(em) || !senha || enviando) return
    try { sessionStorage.removeItem(PEDIR_NOVA_SENHA) } catch (e) {}
    setEnviando(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email: em, password: senha })
    if (error && /Email not confirmed/i.test(error.message)) {
      // Conta criada (no app ou no checkout do site) mas e-mail ainda não confirmado: manda o código
      const r = await supabase.auth.resend({ type: 'signup', email: em })
      setEnviando(false)
      if (r.error) { setErro(mensagemErro(r.error)); return }
      setMotivo('confirmar'); setTela('codigo'); return
    }
    setEnviando(false)
    if (error) setErro(/Invalid login credentials/i.test(error.message)
      ? 'E-mail ou senha incorretos. Se você nunca criou uma senha, use "Entrar com código no e-mail".'
      : mensagemErro(error))
  }

  async function pedirCodigo(e) {
    e?.preventDefault()
    if (!emailValido(em) || enviando) return
    setEnviando(true); setErro('')
    const { error } = await supabase.auth.signInWithOtp({
      email: em,
      // "Esqueci minha senha" só para quem já tem conta; "entrar com código" pode criar a conta grátis
      options: { shouldCreateUser: motivo !== 'esqueci', emailRedirectTo: window.location.origin },
    })
    setEnviando(false)
    if (error) {
      setErro(/signups not allowed|not found|user not found/i.test(error.message) ? 'Não encontramos uma conta com esse e-mail. Crie sua conta grátis.' : mensagemErro(error))
      return
    }
    setTela('codigo')
  }

  const reenviar = () => (motivo === 'confirmar'
    ? supabase.auth.resend({ type: 'signup', email: em })
    : supabase.auth.signInWithOtp({ email: em, options: { shouldCreateUser: motivo !== 'esqueci', emailRedirectTo: window.location.origin } }))

  const irPara = (t, m) => { setTela(t); if (m) setMotivo(m); setErro('') }

  const textos = {
    senha: 'Entre para ver seu QR, seus créditos e os pontos perto de você.',
    pedir: motivo === 'esqueci' ? 'Digite seu e-mail. Mandamos um código de 6 dígitos e você cria uma senha nova.' : 'Digite seu e-mail. Mandamos um código de 6 dígitos para você entrar sem senha.',
    codigo: null,
  }

  return (
    <main className="screen" style={{ position: 'relative', overflow: 'hidden', minHeight: '100dvh' }}>
      <Streaks scale={0.62} style={{ right: -40, top: -70 }} />
      <div className="row between" style={{ position: 'relative' }}>
        {tela === 'senha'
          ? <RMark size={56} />
          : <button className="icon-btn" aria-label="Voltar" onClick={() => irPara('senha', 'entrar')}><Icon name="back" size={20} /></button>}
        <button className="icon-btn" onClick={tema.toggle} aria-label={tema.theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
          <Icon name={tema.theme === 'dark' ? 'sun' : 'moon'} size={20} />
        </button>
      </div>

      <div className="stack" style={{ marginTop: 'clamp(8px, 4vh, 36px)', position: 'relative', gap: 10 }}>
        <h1 className="display">{tela === 'senha' ? <>Sua mochila<br />invisível.</> : motivo === 'esqueci' ? 'Nova senha' : motivo === 'confirmar' ? 'Confirme seu e-mail' : 'Entrar com código'}</h1>
        <p className="lead">
          {tela === 'codigo'
            ? <>Mandamos um código para <strong style={{ color: 'var(--text)' }}>{em}</strong>.{motivo === 'confirmar' ? ' É só desta vez, para confirmar que o e-mail é seu.' : ''} Confira também o spam.</>
            : textos[tela]}
        </p>
      </div>

      {tela === 'senha' && (
        <>
          <form className="stack" style={{ gap: 14 }} onSubmit={entrarComSenha}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" className="input" type="email" inputMode="email" autoComplete="username" autoCapitalize="none"
                placeholder="email@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <label htmlFor="senha">Senha</label>
                <button type="button" className="btn-link" style={{ minHeight: 0, padding: 0, fontSize: 13 }} onClick={() => irPara('pedir', 'esqueci')}>Esqueci minha senha</button>
              </div>
              <div style={{ position: 'relative' }}>
                <input id="senha" className="input" type={verSenha ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="Sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} style={{ paddingRight: 84 }} />
                <button type="button" className="btn-link" onClick={() => setVerSenha((v) => !v)}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-2)' }}>
                  {verSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            {erro && <div className="alert err" role="alert">{erro}</div>}
            <button className="btn btn-primary btn-block btn-lg" disabled={!emailValido(em) || !senha || enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          <div className="row" style={{ gap: 12, color: 'var(--text-3)', fontSize: 12, fontWeight: 700 }} aria-hidden="true">
            <span className="grow" style={{ height: 1, background: 'var(--line-strong)' }} />OU<span className="grow" style={{ height: 1, background: 'var(--line-strong)' }} />
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => irPara('pedir', 'entrar')}>Entrar com código no e-mail</button>
          <div className="card tight row" style={{ gap: 12 }}>
            <div className="grow stack" style={{ gap: 2 }}>
              <strong style={{ fontSize: 15 }}>Ainda não tem conta?</strong>
              <span className="small" style={{ color: 'var(--text-2)' }}>Grátis. Veja os pontos e assine quando quiser.</span>
            </div>
            <Link to="/criar-conta" state={{ email: em }} className="btn btn-dark btn-sm" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>Criar conta</Link>
          </div>
        </>
      )}

      {tela === 'pedir' && (
        <form className="stack" style={{ gap: 16 }} onSubmit={pedirCodigo}>
          <div className="field">
            <label htmlFor="email2">E-mail</label>
            <input id="email2" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoFocus
              placeholder="email@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {erro && <div className="alert err" role="alert">{erro}{/Crie sua conta/.test(erro) && <> <Link to="/criar-conta" state={{ email: em }}>Criar conta</Link></>}</div>}
          <button className="btn btn-primary btn-block btn-lg" disabled={!emailValido(em) || enviando}>
            {enviando ? 'Enviando…' : 'Receber código'}
          </button>
        </form>
      )}

      {tela === 'codigo' && (
        <CodigoForm key={motivo + em} email={em} tipo={motivo === 'confirmar' ? 'signup' : 'email'} reenviar={reenviar}
          botao={motivo === 'esqueci' ? 'Continuar' : 'Entrar'}
          antesDeVerificar={() => { try { if (motivo === 'esqueci') sessionStorage.setItem(PEDIR_NOVA_SENHA, '1') } catch (e) {} }}
          onTrocarEmail={() => irPara('pedir')} />
      )}

      <div className="stack" style={{ marginTop: 'auto', alignItems: 'center', gap: 6, paddingTop: 16 }}>
        <Link to="/entrar/equipe" className="btn-link" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Sou da equipe Runergy
        </Link>
        <p className="tiny muted" style={{ margin: 0, textAlign: 'center' }}>
          Ao entrar você concorda com os Termos de Uso e a Política de Privacidade.
        </p>
      </div>
    </main>
  )
}
