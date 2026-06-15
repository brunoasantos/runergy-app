import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { supabase } from '../lib/supabase'
import StatusBar from '../components/StatusBar'

const PLANOS = [
  {
    id: 'gratis',
    nome: 'Explorar grátis',
    preco: 'Grátis',
    creditos: 0,
    cor: '#9C9A93',
    descricao: 'Conheça o app sem compromisso',
  },
  {
    id: 'starter',
    nome: 'Starter',
    preco: 'R$29,90/mês',
    creditos: 8,
    cor: '#6B6A65',
    descricao: '6 géis + 2 isotônicos + 2 pré-treinos',
  },
  {
    id: 'runner',
    nome: 'Runner',
    preco: 'R$49,90/mês',
    creditos: 16,
    cor: '#D85A30',
    popular: true,
    descricao: 'Starter + camiseta + boné + meia',
  },
  {
    id: 'hero',
    nome: 'Hero',
    preco: 'R$69,90/mês',
    creditos: 30,
    cor: '#1a1a18',
    descricao: 'Runner + óculos + acesso aos totens',
  },
]

export default function Cadastro() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [plano, setPlano] = useState('runner')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleCadastro = async () => {
    if (!nome.trim() || !email.trim()) { setErro('Preencha nome e e-mail.'); return }
    setLoading(true)
    setErro('')
    try {
      const p = PLANOS.find(p => p.id === plano)
      const atleta = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        plano: p.id,
        creditos: p.creditos,
        criado_em: new Date().toISOString(),
      }
      try {
        await supabase.from('atletas').insert([atleta])
      } catch (_) {}
      login({ ...atleta, id: Date.now().toString() })
      navigate('/home')
    } catch (e) {
      setErro('Erro ao cadastrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <StatusBar />
      <div style={{ padding: '20px 24px 40px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#D85A30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#1a1a18' }}>Runergy</span>
          </div>
          <h2 style={{ marginBottom: 6 }}>Criar sua conta</h2>
          <p>Explore grátis ou escolha um plano para começar.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div>
            <label>Nome completo</label>
            <input placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <label>E-mail</label>
            <input type="email" placeholder="email@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ marginBottom: 10 }}>Escolha seu acesso</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PLANOS.map(p => (
              <button key={p.id} onClick={() => setPlano(p.id)} style={{
                padding: '14px 16px', borderRadius: 14,
                border: `2px solid ${plano === p.id ? p.cor : '#E2E0D8'}`,
                background: plano === p.id
                  ? p.id === 'runner' ? '#FAECE7'
                  : p.id === 'hero'   ? '#F5F4F0'
                  : p.id === 'gratis' ? '#F5F4F0'
                  : '#F5F4F0'
                  : 'white',
                cursor: 'pointer', textAlign: 'left', position: 'relative',
                transition: 'all 0.15s',
              }}>
                {p.popular && (
                  <span style={{ position: 'absolute', top: -10, right: 12, background: '#D85A30', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                    MAIS POPULAR
                  </span>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a18' }}>
                      {p.id === 'gratis' ? '👀 ' : ''}{p.nome}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B6A65', marginTop: 2 }}>{p.descricao}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: p.cor, textAlign: 'right', minWidth: 80 }}>
                    {p.preco}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Aviso plano grátis */}
        {plano === 'gratis' && (
          <div style={{ background: '#F5F4F0', border: '1px solid #E2E0D8', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#6B6A65', lineHeight: 1.6 }}>
              👀 No acesso grátis você pode explorar o app mas não pode fazer retiradas nos totens nem receber kits. Para ativar, assine um plano a qualquer momento.
            </p>
          </div>
        )}

        {erro && <p style={{ color: 'red', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

        <button className="btn btn-primary" onClick={handleCadastro} disabled={loading}
          style={{ background: plano === 'gratis' ? '#9C9A93' : '#D85A30' }}>
          {loading ? 'Criando conta...' : plano === 'gratis' ? 'Explorar grátis →' : 'Criar conta →'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#9C9A93' }}>
          {plano === 'gratis' ? 'Você pode assinar um plano depois.' : 'Sem cartão de crédito. Cancele quando quiser.'}
        </p>
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#9C9A93' }}>
            Já tem conta?{' '}
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#D85A30', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
