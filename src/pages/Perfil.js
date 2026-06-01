import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import BottomNav from '../components/BottomNav'
import StatusBar from '../components/StatusBar'

const PLANOS = {
  basico:   { nome: 'Básico',   preco: 'R$29/mês', creditos: 8,  cor: '#6B6A65' },
  corredor: { nome: 'Corredor', preco: 'R$49/mês', creditos: 16, cor: '#D85A30' },
  elite:    { nome: 'Elite',    preco: 'R$79/mês', creditos: 30, cor: '#1a1a18' },
}

export default function Perfil() {
  const { atleta, logout } = useApp()
  const navigate = useNavigate()
  const plano = PLANOS[atleta.plano] || PLANOS.corredor
  const inicial = atleta.nome.charAt(0).toUpperCase()
  const pct = Math.round((atleta.creditos / plano.creditos) * 100)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative' }}>
      <StatusBar />
      <div className="page" style={{ overflowY:'auto' }}>

        {/* Header */}
        <div style={{ background:'#1a1a18', padding:'20px 24px 32px', textAlign:'center' }}>
          <div style={{ width:72, height:72, borderRadius:999, background:'#D85A30', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:28, fontWeight:700, color:'white' }}>
            {inicial}
          </div>
          <h2 style={{ color:'white', fontSize:20, marginBottom:4 }}>{atleta.nome}</h2>
          <p style={{ color:'#888780', fontSize:13 }}>{atleta.email}</p>
        </div>

        <div style={{ padding:'0 20px 24px' }}>

          {/* Card do plano */}
          <div style={{ background: plano.cor === '#D85A30' ? '#FAECE7' : '#F5F4F0', borderRadius:18, padding:'18px', margin:'20px 0', border:`2px solid ${plano.cor}20` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div>
                <p style={{ fontSize:11, color:'#9C9A93', fontWeight:600, marginBottom:4 }}>PLANO ATUAL</p>
                <p style={{ fontWeight:700, fontSize:18, color:'#1a1a18' }}>Runergy {plano.nome}</p>
                <p style={{ fontSize:13, color:'#6B6A65' }}>{plano.preco}</p>
              </div>
              <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:999, background: plano.cor, color:'white' }}>
                ATIVO
              </span>
            </div>
            {/* Barra de créditos */}
            <p style={{ fontSize:12, color:'#6B6A65', marginBottom:8 }}>
              Créditos: <strong style={{ color:'#1a1a18' }}>{atleta.creditos}</strong> de {plano.creditos} restantes
            </p>
            <div style={{ background:'rgba(0,0,0,0.08)', borderRadius:999, height:8 }}>
              <div style={{ background: plano.cor, height:8, borderRadius:999, width:`${pct}%`, transition:'width 0.4s' }}/>
            </div>
          </div>

          {/* Itens de menu */}
          {[
            { emoji:'📋', label:'Meu plano & créditos', sub:'Gerenciar assinatura' },
            { emoji:'📍', label:'Totens favoritos',     sub:'Seus pontos frequentes' },
            { emoji:'🔔', label:'Notificações',          sub:'Alertas de estoque e promoções' },
            { emoji:'🔒', label:'Segurança',             sub:'Senha e dispositivos' },
            { emoji:'❓', label:'Ajuda',                 sub:'FAQ e suporte' },
          ].map(({ emoji, label, sub }) => (
            <button key={label} style={{
              width:'100%', background:'none', border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', gap:14, padding:'14px 0',
              borderBottom:'1px solid #F0EEE8', textAlign:'left'
            }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'#F5F4F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                {emoji}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:600, fontSize:14, color:'#1a1a18' }}>{label}</p>
                <p style={{ fontSize:12, color:'#9C9A93', marginTop:2 }}>{sub}</p>
              </div>
              <svg width="16" height="16" fill="none" stroke="#C0BEB8" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ))}

          {/* Versão */}
          <p style={{ textAlign:'center', fontSize:11, color:'#C0BEB8', marginTop:20, marginBottom:16 }}>
            Runergy v0.1.0 · Protótipo MVP
          </p>

          {/* Logout */}
          <button onClick={handleLogout} style={{
            width:'100%', padding:'14px', borderRadius:14,
            border:'1.5px solid #FECACA', background:'#FEF2F2',
            color:'#DC2626', fontSize:14, fontWeight:600, cursor:'pointer'
          }}>
            Sair da conta
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
