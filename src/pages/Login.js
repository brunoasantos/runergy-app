import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { supabase } from '../lib/supabase'
import StatusBar from '../components/StatusBar'

const PLANOS = {
  basico:   { creditos: 8  },
  corredor: { creditos: 16 },
  elite:    { creditos: 30 },
}

export default function Login() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleLogin = async () => {
    if (!email.trim()) { setErro('Digite seu e-mail.'); return }
    setLoading(true)
    setErro('')
    try {
      const { data, error } = await supabase
        .from('atletas')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single()

      if (error || !data) {
        setErro('E-mail não encontrado. Crie uma conta primeiro.')
        return
      }

      login({ ...data, id: data.id || Date.now().toString() })
      navigate('/home')
    } catch (e) {
      setErro('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <StatusBar />
      <div style={{ padding: '20px 24px 40px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#D85A30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1a1a18' }}>Runergy</span>
        </div>

        <h2 style={{ marginBottom: 8 }}>Bem-vindo de volta 👋</h2>
        <p style={{ marginBottom: 32 }}>Entre com o e-mail cadastrado para continuar.</p>

        <div style={{ marginBottom: 20 }}>
          <label>E-mail</label>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {erro && <p style={{ color: 'red', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

        <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar →'}
        </button>

        <div style={{ marginTop: 'auto', paddingTop: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#9C9A93' }}>
            Não tem conta?{' '}
            <button onClick={() => navigate('/cadastro')} style={{ background: 'none', border: 'none', color: '#D85A30', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Criar agora
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}
