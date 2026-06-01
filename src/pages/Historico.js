import React, { useState, useEffect } from 'react'
import { useApp } from '../App'
import { supabase } from '../lib/supabase'
import { SUPRIMENTOS } from '../lib/dados'
import BottomNav from '../components/BottomNav'
import StatusBar from '../components/StatusBar'

export default function Historico() {
  const { atleta } = useApp()
  const [retiradas, setRetiradas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const buscar = async () => {
      try {
        const { data, error } = await supabase
          .from('retiradas')
          .select('*')
          .eq('atleta_email', atleta.email)
          .order('criado_em', { ascending: false })
        if (data) setRetiradas(data)
      } catch (_) {
        // Offline: mostra vazio
      } finally {
        setLoading(false)
      }
    }
    buscar()
  }, [atleta.email])

  const agruparPorMes = (lista) => {
    const grupos = {}
    lista.forEach(r => {
      const d = new Date(r.criado_em)
      const chave = d.toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
      if (!grupos[chave]) grupos[chave] = []
      grupos[chave].push(r)
    })
    return grupos
  }

  const grupos = agruparPorMes(retiradas)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative' }}>
      <StatusBar />
      <div className="page" style={{ overflowY:'auto' }}>

        {/* Header */}
        <div style={{ padding:'12px 20px 16px', borderBottom:'1px solid #F0EEE8' }}>
          <h3 style={{ fontSize:18 }}>Histórico de retiradas</h3>
          {retiradas.length > 0 && (
            <p style={{ fontSize:13, color:'#9C9A93', marginTop:4 }}>{retiradas.length} retirada{retiradas.length !== 1 ? 's' : ''} no total</p>
          )}
        </div>

        <div style={{ padding:'16px 20px' }}>

          {/* Resumo do mês */}
          {retiradas.length > 0 && (() => {
            const mesAtual = new Date().toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
            const doMes = retiradas.filter(r => new Date(r.criado_em).toLocaleDateString('pt-BR', { month:'long', year:'numeric' }) === mesAtual)
            const contagem = {}
            doMes.forEach(r => { contagem[r.suprimento] = (contagem[r.suprimento] || 0) + 1 })
            return (
              <div style={{ background:'#1a1a18', borderRadius:18, padding:'16px 18px', marginBottom:20 }}>
                <p style={{ color:'#888780', fontSize:11, fontWeight:600, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Este mês</p>
                <div style={{ display:'flex', gap:16 }}>
                  <div>
                    <p style={{ color:'white', fontSize:28, fontWeight:700, lineHeight:1 }}>{doMes.length}</p>
                    <p style={{ color:'#888780', fontSize:11, marginTop:4 }}>retiradas</p>
                  </div>
                  <div style={{ height:'100%', width:1, background:'#333' }}/>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    {Object.entries(contagem).map(([k, v]) => (
                      <div key={k} style={{ background:'#2a2a28', borderRadius:10, padding:'6px 10px', textAlign:'center' }}>
                        <p style={{ fontSize:18 }}>{SUPRIMENTOS[k]?.emoji}</p>
                        <p style={{ color:'white', fontSize:13, fontWeight:700 }}>{v}x</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:'center', padding:'40px 0' }}>
              <div style={{ width:32, height:32, border:'3px solid #E2E0D8', borderTopColor:'#D85A30', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
              <p style={{ color:'#9C9A93', fontSize:13, marginTop:12 }}>Buscando retiradas...</p>
            </div>
          )}

          {/* Vazio */}
          {!loading && retiradas.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
              <h3 style={{ fontSize:16, marginBottom:8 }}>Nenhuma retirada ainda</h3>
              <p style={{ fontSize:13, color:'#9C9A93', marginBottom:24 }}>Escaneie um totem para fazer sua primeira retirada.</p>
            </div>
          )}

          {/* Lista agrupada */}
          {!loading && Object.entries(grupos).map(([mes, items]) => (
            <div key={mes} style={{ marginBottom:24 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#9C9A93', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                {mes}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {items.map((r, i) => {
                  const sup = SUPRIMENTOS[r.suprimento]
                  const d = new Date(r.criado_em)
                  return (
                    <div key={i} className="card" style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:14, background: r.suprimento === 'agua' ? '#DBEAFE' : r.suprimento === 'gel' ? '#FAECE7' : '#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                        {sup?.emoji || '💧'}
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontWeight:600, fontSize:14, color:'#1a1a18' }}>{sup?.label || r.suprimento}</p>
                        <p style={{ fontSize:12, color:'#9C9A93', marginTop:2 }}>{r.totem_nome || r.totem_code}</p>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontSize:12, fontWeight:600, color:'#1a1a18' }}>
                          {d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })}
                        </p>
                        <p style={{ fontSize:11, color:'#9C9A93' }}>
                          {d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
