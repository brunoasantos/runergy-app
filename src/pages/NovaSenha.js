import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { mensagemErro } from '../lib/format'
import { PEDIR_NOVA_SENHA } from '../lib/cadastro'
import PageHeader from '../components/PageHeader'

// Definir senha nova: depois do "Esqueci minha senha" ou pelo Perfil.
export default function NovaSenha() {
  const nav = useNavigate()
  let obrigatoria = false
  try { obrigatoria = sessionStorage.getItem(PEDIR_NOVA_SENHA) === '1' } catch (e) {}
  const [senha, setSenha] = useState('')
  const [conf, setConf] = useState('')
  const [ver, setVer] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const valido = senha.length >= 8 && senha === conf

  async function salvar(e) {
    e.preventDefault()
    if (!valido || enviando) return
    setEnviando(true); setErro('')
    const { error } = await supabase.auth.updateUser({ password: senha })
    setEnviando(false)
    if (error) { setErro(/different from the old/i.test(error.message) ? 'A senha nova precisa ser diferente da atual.' : /Password/i.test(error.message) ? 'Senha fraca: use pelo menos 8 caracteres, com letras e números.' : mensagemErro(error)); return }
    try { sessionStorage.removeItem(PEDIR_NOVA_SENHA) } catch (e2) {}
    setOk(true)
    setTimeout(() => nav('/', { replace: true }), 1200)
  }

  return (
    <main className="screen" style={{ minHeight: '100dvh' }}>
      <PageHeader titulo="Senha" voltar={obrigatoria ? null : '/perfil'} />
      <div className="stack" style={{ gap: 8 }}>
        <h1 className="display" style={{ fontSize: 'clamp(28px, 8.5vw, 36px)' }}>Crie sua senha nova</h1>
        <p className="lead">Use pelo menos 8 caracteres. Da próxima vez é só e-mail e senha.</p>
      </div>
      <form className="stack" style={{ gap: 14 }} onSubmit={salvar}>
        <div className="field"><label htmlFor="ns-1">Senha nova</label>
          <input id="ns-1" className="input" type={ver ? 'text' : 'password'} autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus /></div>
        <div className="field"><label htmlFor="ns-2">Repita a senha</label>
          <input id="ns-2" className="input" type={ver ? 'text' : 'password'} autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} /></div>
        <label className="row small" style={{ gap: 8, color: 'var(--text-2)' }}><input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--orange)' }} />Mostrar senha</label>
        {conf && senha !== conf && <div className="alert warn">As duas senhas não são iguais.</div>}
        {erro && <div className="alert err" role="alert">{erro}</div>}
        {ok && <div className="alert ok" role="status">Senha salva.</div>}
        <button className="btn btn-primary btn-block btn-lg" disabled={!valido || enviando}>{enviando ? 'Salvando…' : 'Salvar senha'}</button>
      </form>
    </main>
  )
}
