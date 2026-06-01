import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SUPRIMENTOS } from '../lib/dados'
import { useApp } from '../App'

export default function Confirmacao() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { atleta } = useApp()
  const [animado, setAnimado] = useState(false)

  const totem = state?.totem
  const suprimento = state?.suprimento
  const sup = SUPRIMENTOS[suprimento]

  useEffect(() => {
    setTimeout(() => setAnimado(true), 100)
  }, [])

  if (!totem || !suprimento) { navigate('/home'); return null }

  const agora = new Date()
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const data = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', background:'white' }}>

      {/* Top verde */}
      <div style={{
        width:'100%', background:'#16A34A', padding:'40px 24px 60px', textAlign:'center',
        transition:'all 0.4s', opacity: animado ? 1 : 0, transform: animado ? 'none' : 'translateY(-20px)'
      }}>
        {/* Ícone */}
        <div style={{
          width:80, height:80, borderRadius:999, background:'rgba(255,255,255,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:40
        }}>
          {sup?.emoji}
        </div>
        <h2 style={{ color:'white', fontSize:22, marginBottom:8 }}>Retirada confirmada!</h2>
        <p style={{ color:'rgba(255,255,255,0.8)', fontSize:14 }}>
          Retire seu {sup?.label} no compartimento aberto abaixo.
        </p>
      </div>

      {/* Card flutuante */}
      <div style={{
        background:'white', borderRadius:24, padding:'24px 20px', margin:'-24px 20px 0',
        boxShadow:'0 4px 24px rgba(0,0,0,0.10)', width:'calc(100% - 40px)',
        transition:'all 0.4s 0.2s', opacity: animado ? 1 : 0, transform: animado ? 'none' : 'translateY(20px)'
      }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[
            { label:'Suprimento', valor: sup?.label },
            { label:'Totem',     valor: totem.nome },
            { label:'Código',    valor: totem.totem_code },
            { label:'Atleta',    valor: atleta.nome },
            { label:'Horário',   valor: `${hora} · ${data}` },
            { label:'Créditos restantes', valor: `${atleta.creditos} créditos` },
          ].map(({ label, valor }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #F5F4F0', paddingBottom:14 }}>
              <span style={{ fontSize:13, color:'#9C9A93' }}>{label}</span>
              <span style={{ fontSize:13, fontWeight:600, color:'#1a1a18', textAlign:'right', maxWidth:'55%' }}>{valor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instrução */}
      <div style={{
        margin:'20px 20px 0', background:'#FAECE7', borderRadius:16, padding:'14px 16px',
        display:'flex', gap:10, width:'calc(100% - 40px)'
      }}>
        <span style={{ fontSize:20 }}>👆</span>
        <p style={{ fontSize:12, color:'#712B13', lineHeight:1.6 }}>
          <strong>Ação necessária:</strong> O compartimento do totem foi desbloqueado. Retire seu {sup?.label} e feche a porta após retirar.
        </p>
      </div>

      {/* Botões */}
      <div style={{ padding:'20px 20px', width:'100%', display:'flex', flexDirection:'column', gap:10, marginTop:'auto' }}>
        <button className="btn btn-primary" onClick={() => navigate('/home')} style={{ height:52, borderRadius:14 }}>
          Voltar ao início
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/historico')} style={{ height:52, borderRadius:14 }}>
          Ver histórico completo
        </button>
      </div>

    </div>
  )
}
