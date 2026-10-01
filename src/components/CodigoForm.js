import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mensagemErro } from '../lib/format'

const ESPERA = 60 // segundos para pedir outro código

/**
 * Digitar o código de 6 dígitos que chegou por e-mail.
 * tipo: 'email' (entrar sem senha / esqueci a senha) ou 'signup' (confirmar conta nova).
 * reenviar: função que pede outro código ao Supabase.
 */
export default function CodigoForm({ email, tipo = 'email', reenviar, onTrocarEmail, botao = 'Entrar', antesDeVerificar }) {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [restante, setRestante] = useState(ESPERA)
  const ref = useRef(null)

  useEffect(() => { ref.current?.focus() }, [])
  useEffect(() => {
    if (restante <= 0) return
    const t = setTimeout(() => setRestante((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [restante])

  async function verificar(e) {
    e?.preventDefault()
    const token = codigo.replace(/\D/g, '')
    if (token.length < 6 || enviando) return
    setEnviando(true); setErro('')
    antesDeVerificar?.()
    const { error } = await supabase.auth.verifyOtp({ email, token, type: tipo })
    setEnviando(false)
    if (error) setErro(mensagemErro(error))
    // sucesso: o AuthProvider percebe a sessão e as rotas seguem sozinhas
  }

  async function pedirOutro() {
    if (restante > 0 || enviando) return
    setEnviando(true); setErro('')
    const { error } = await reenviar()
    setEnviando(false)
    if (error) { setErro(mensagemErro(error)); return }
    setCodigo(''); setRestante(ESPERA)
  }

  return (
    <form className="stack" style={{ gap: 16 }} onSubmit={verificar}>
      <div className="field">
        <label htmlFor="codigo">Código do e-mail</label>
        <input id="codigo" ref={ref} className="input code-input" inputMode="numeric" autoComplete="one-time-code"
          pattern="[0-9]*" placeholder="••••••" value={codigo} maxLength={8}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))} />
      </div>
      {erro && <div className="alert err" role="alert">{erro}</div>}
      <button className="btn btn-primary btn-block btn-lg" disabled={codigo.length < 6 || enviando}>
        {enviando ? 'Conferindo…' : botao}
      </button>
      <div className="row between">
        {onTrocarEmail ? <button type="button" className="btn-link" onClick={onTrocarEmail}>Trocar e-mail</button> : <span />}
        <button type="button" className="btn-link" disabled={restante > 0 || enviando} onClick={pedirOutro} style={{ opacity: restante > 0 ? 0.6 : 1 }}>
          {restante > 0 ? `Reenviar em 0:${String(restante).padStart(2, '0')}` : 'Reenviar código'}
        </button>
      </div>
    </form>
  )
}
