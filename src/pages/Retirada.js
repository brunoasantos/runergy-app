import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../App'
import { SUPRIMENTOS } from '../lib/dados'
import { supabase } from '../lib/supabase'
import StatusBar from '../components/StatusBar'

export default function Retirada() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { atleta, atualizarCreditos } = useApp()
  const totem = state?.totem

  const [selecionado, setSelecionado] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!totem) { navigate('/scanner'); return null }

  const handleConfirmar = async () => {
    if (!selecionado) return
    if (atleta.creditos <= 0) { alert('Sem créditos disponíveis. Renove seu plano.'); return }

    setLoading(true)
    try {
      const retirada = {
        atleta_email: atleta.email,
        atleta_nome: atleta.nome,
        totem_code: totem.totem_code,
        totem_nome: totem.nome,
        suprimento: selecionado,
        criado_em: new Date().toISOString(),
      }

      // Salva no Supabase
      try {
        await supabase.from('retiradas').insert([retirada])
      } catch (_) {}

      // Debita crédito
      atualizarCreditos(atleta.creditos - 1)

      navigate('/confirmacao', { state: { totem, suprimento: selecionado, retirada } })
    } finally {
      setLoading(false)
    }
  }

  const supDisponiveis = totem.suprimentos || ['agua','gel','eletrolito']

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <StatusBar />

      {/* Header */}
      <div style={{ padding:'8px 20px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => navigate('/scanner')} style={{ background:'#F5F4F0', border:'none', borderRadius:12, width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="18" height="18" fill="none" stroke="#1a1a18" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h3>O que vai retirar?</h3>
      </div>

      <div style={{ flex:1, padding:'0 20px 24px', display:'flex', flexDirection:'column' }}>

        {/* Info do totem */}
        <div style={{ background:'#F5F4F0', borderRadius:14, padding:'12px 14px', marginBottom:24, display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:22 }}>📍</span>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#1a1a18' }}>{totem.nome}</p>
            <p style={{ fontSize:11, color:'#9C9A93' }}>{totem.totem_code}</p>
          </div>
        </div>

        {/* Créditos */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={{ fontSize:14, fontWeight:600, color:'#1a1a18' }}>Escolha o suprimento</p>
          <span style={{ fontSize:12, color:'#D85A30', fontWeight:600 }}>⚡ {atleta.creditos} créditos</span>
        </div>

        {/* Opções */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:'auto' }}>
          {supDisponiveis.map(key => {
            const sup = SUPRIMENTOS[key]
            if (!sup) return null
            const sel = selecionado === key
            return (
              <button key={key} onClick={() => setSelecionado(key)} style={{
                padding:'20px 18px', borderRadius:18,
                border: `2px solid ${sel ? sup.cor : '#E2E0D8'}`,
                background: sel ? (key === 'agua' ? '#DBEAFE' : key === 'gel' ? '#FAECE7' : '#DCFCE7') : 'white',
                cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                display:'flex', alignItems:'center', gap:16
              }}>
                <div style={{ fontSize:36 }}>{sup.emoji}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:700, fontSize:16, color:'#1a1a18' }}>{sup.label}</p>
                  <p style={{ fontSize:12, color:'#6B6A65', marginTop:2 }}>
                    {key === 'agua' && 'Copo 200ml — Hidratação rápida'}
                    {key === 'gel' && 'Sachê 40g — Energia imediata'}
                    {key === 'eletrolito' && 'Sache 20g — Reposição de sais'}
                  </p>
                </div>
                {sel && <div style={{ width:24, height:24, borderRadius:999, background:sup.cor, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="14" height="14" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                </div>}
              </button>
            )
          })}
        </div>

        {/* Aviso sem créditos */}
        {atleta.creditos <= 0 && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
            <p style={{ fontSize:13, color:'#DC2626' }}>⚠️ Você não tem créditos disponíveis. Renove seu plano para continuar.</p>
          </div>
        )}

        <div style={{ marginTop:24 }}>
          <button
            className="btn btn-primary"
            onClick={handleConfirmar}
            disabled={!selecionado || loading || atleta.creditos <= 0}
            style={{ height:56, fontSize:16, borderRadius:16, opacity: (!selecionado || atleta.creditos <= 0) ? 0.5 : 1 }}
          >
            {loading ? 'Confirmando...' : selecionado ? `Confirmar retirada de ${SUPRIMENTOS[selecionado]?.label}` : 'Selecione um suprimento'}
          </button>
          <p style={{ textAlign:'center', fontSize:11, color:'#9C9A93', marginTop:10 }}>
            1 crédito será debitado do seu plano
          </p>
        </div>

      </div>
    </div>
  )
}
