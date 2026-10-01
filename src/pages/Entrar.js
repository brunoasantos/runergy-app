import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { mensagemErro } from '../lib/format'
import { RMark, Streaks } from '../components/Brand'
import Icon from '../components/Icon'
import { useTema } from '../lib/temaCtx'

const ESPERA = 60 // segundos para pedir outro código

export default function Entrar() {
  const tema = useTema()
  const [etapa, setEtapa] = useState('email') // email | codigo
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [restante, setRestante] = useState(0)
  const codigoRef = useRef(null)

  useEffect(() => {
    if (restante <= 0) return
    const t = setTimeout(() => setRestante((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [restante])

  useEffect(() => { if (etapa === 'codigo') codigoRef.current?.focus() }, [etapa])

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())

  async function pedirCodigo(e) {
    e?.preventDefault()
    if (!emailValido || enviando) return
    setEnviando(true); setErro('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    })
    setEnviando(false)
    if (error) { setErro(mensagemErro(error)); return }
    setEtapa('codigo'); setCodigo(''); setRestante(ESPERA)
  }

  async function verificar(e) {
    e?.preventDefault()
    const token = codigo.replace(/\D/g, '')
    if (token.length < 6 || enviando) return
    setEnviando(true); setErro('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' })
    setEnviando(false)
    if (error) setErro(mensagemErro(error))
    // sucesso: o AuthProvider percebe a sessão e as rotas levam para o início
  }

  function digitarCodigo(v) {
    const so = v.replace(/\D/g, '').slice(0, 8)
    setCodigo(so)
  }

  return (
    <main className="screen" style={{ position: 'relative', overflow: 'hidden', minHeight: '100dvh' }}>
      <Streaks scale={0.62} style={{ right: -40, top: -70 }} />
      <div className="row between" style={{ position: 'relative' }}>
        <RMark size={56} />
        <button className="icon-btn" onClick={tema.toggle} aria-label={tema.theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
          <Icon name={tema.theme === 'dark' ? 'sun' : 'moon'} size={20} />
        </button>
      </div>

      <div className="stack" style={{ marginTop: 'clamp(12px, 6vh, 48px)', position: 'relative', gap: 12 }}>
        <h1 className="display">Sua mochila<br />invisível.</h1>
        <p className="lead">
          {etapa === 'email'
            ? 'Entre com seu e-mail. Mandamos um código de 6 dígitos — sem senha para lembrar.'
            : <>Mandamos um código para <strong style={{ color: 'var(--text)' }}>{email.trim().toLowerCase()}</strong>. Confira também o spam.</>}
        </p>
      </div>

      {etapa === 'email' ? (
        <form className="stack" style={{ gap: 16, marginTop: 8 }} onSubmit={pedirCodigo}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none"
              placeholder="email@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {erro && <div className="alert err" role="alert">{erro}</div>}
          <button className="btn btn-primary btn-block btn-lg" disabled={!emailValido || enviando}>
            {enviando ? 'Enviando…' : 'Receber código'}
          </button>
        </form>
      ) : (
        <form className="stack" style={{ gap: 16, marginTop: 8 }} onSubmit={verificar}>
          <div className="field">
            <label htmlFor="codigo">Código do e-mail</label>
            <input id="codigo" ref={codigoRef} className="input code-input" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9]*" placeholder="••••••" value={codigo} onChange={(e) => digitarCodigo(e.target.value)} maxLength={8} />
          </div>
          {erro && <div className="alert err" role="alert">{erro}</div>}
          <button className="btn btn-primary btn-block btn-lg" disabled={codigo.length < 6 || enviando}>
            {enviando ? 'Conferindo…' : 'Entrar'}
          </button>
          <div className="row between">
            <button type="button" className="btn-link" onClick={() => { setEtapa('email'); setErro('') }}>Trocar e-mail</button>
            <button type="button" className="btn-link" disabled={restante > 0 || enviando} onClick={pedirCodigo}
              style={{ opacity: restante > 0 ? 0.6 : 1 }}>
              {restante > 0 ? `Reenviar em 0:${String(restante).padStart(2, '0')}` : 'Reenviar código'}
            </button>
          </div>
        </form>
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
