import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '../App'
import { supabase } from '../lib/supabase'
import { SUPRIMENTOS } from '../lib/dados'
import BottomNav from '../components/BottomNav'
import StatusBar from '../components/StatusBar'

const POR_PAGINA = 6

export default function Historico() {
  const { atleta } = useApp()
  const [retiradas, setRetiradas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState(null)   // 'agua' | 'gel' | 'eletrolito' | null
  const [filtroTotem, setFiltroTotem] = useState(null) // totem_code | null
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    const buscar = async () => {
      try {
        const { data } = await supabase
          .from('retiradas')
          .select('*')
          .eq('atleta_email', atleta.email)
          .order('criado_em', { ascending: false })
        if (data) setRetiradas(data)
      } catch (_) {}
      finally { setLoading(false) }
    }
    buscar()
  }, [atleta.email])

  // Totens únicos usados pelo atleta
  const totensUsados = useMemo(() => {
    const map = {}
    retiradas.forEach(r => { map[r.totem_code] = r.totem_nome || r.totem_code })
    return Object.entries(map)
  }, [retiradas])

  // Contagem por tipo (mês atual)
  const contagemMes = useMemo(() => {
    const mesAtual = new Date().toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
    const doMes = retiradas.filter(r =>
      new Date(r.criado_em).toLocaleDateString('pt-BR', { month:'long', year:'numeric' }) === mesAtual
    )
    const c = {}
    doMes.forEach(r => { c[r.suprimento] = (c[r.suprimento] || 0) + 1 })
    return { doMes, c }
  }, [retiradas])

  // Lista filtrada
  const filtradas = useMemo(() => {
    let list = [...retiradas]
    if (filtroTipo)  list = list.filter(r => r.suprimento === filtroTipo)
    if (filtroTotem) list = list.filter(r => r.totem_code === filtroTotem)
    return list
  }, [retiradas, filtroTipo, filtroTotem])

  // Agrupamento por mês da lista filtrada
  const grupos = useMemo(() => {
    const g = {}
    filtradas.forEach(r => {
      const chave = new Date(r.criado_em).toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
      if (!g[chave]) g[chave] = []
      g[chave].push(r)
    })
    return g
  }, [filtradas])

  // Paginação — aplica sobre itens planos
  const itensPlanados = useMemo(() => filtradas, [filtradas])
  const totalPaginas  = Math.max(1, Math.ceil(itensPlanados.length / POR_PAGINA))
  const paginaAtual   = Math.min(pagina, totalPaginas)
  const visiveisIds   = new Set(
    itensPlanados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA).map(r => r.id)
  )

  const alternarTipo = (tipo) => {
    setFiltroTipo(f => f === tipo ? null : tipo)
    setPagina(1)
  }
  const alternarTotem = (code) => {
    setFiltroTotem(f => f === code ? null : code)
    setPagina(1)
  }

  const limparFiltros = () => { setFiltroTipo(null); setFiltroTotem(null); setPagina(1) }

  const temFiltro = filtroTipo || filtroTotem

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative' }}>
      <StatusBar />
      <div className="page" style={{ overflowY:'auto' }}>

        {/* Header */}
        <div style={{ padding:'12px 20px 16px', borderBottom:'1px solid #F0EEE8' }}>
          <h3 style={{ fontSize:18 }}>Histórico de retiradas</h3>
          {retiradas.length > 0 && (
            <p style={{ fontSize:13, color:'#9C9A93', marginTop:4 }}>
              {filtradas.length} de {retiradas.length} retirada{retiradas.length !== 1 ? 's' : ''}
              {temFiltro ? ' (filtrado)' : ' no total'}
            </p>
          )}
        </div>

        <div style={{ padding:'16px 20px' }}>

          {/* Resumo do mês com filtro por tipo */}
          {retiradas.length > 0 && (
            <div style={{ background:'#1a1a18', borderRadius:18, padding:'16px 18px', marginBottom:16 }}>
              <p style={{ color:'#888780', fontSize:11, fontWeight:600, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Este mês — toque para filtrar
              </p>
              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                <div>
                  <p style={{ color:'white', fontSize:28, fontWeight:700, lineHeight:1 }}>{contagemMes.doMes.length}</p>
                  <p style={{ color:'#888780', fontSize:11, marginTop:4 }}>retiradas</p>
                </div>
                <div style={{ width:1, alignSelf:'stretch', background:'#333' }}/>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {Object.entries(contagemMes.c).map(([k, v]) => (
                    <button key={k} onClick={() => alternarTipo(k)} style={{
                      background: filtroTipo === k ? SUPRIMENTOS[k]?.cor + '33' : '#2a2a28',
                      border: filtroTipo === k ? `2px solid ${SUPRIMENTOS[k]?.cor}` : '2px solid transparent',
                      borderRadius:12, padding:'8px 12px', textAlign:'center',
                      cursor:'pointer', transition:'all 0.15s'
                    }}>
                      <p style={{ fontSize:20 }}>{SUPRIMENTOS[k]?.emoji}</p>
                      <p style={{ color:'white', fontSize:13, fontWeight:700 }}>{v}x</p>
                      <p style={{ color:'#888780', fontSize:10 }}>{SUPRIMENTOS[k]?.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filtro por totem */}
          {totensUsados.length > 1 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:12, fontWeight:600, color:'#9C9A93', marginBottom:8 }}>Filtrar por totem:</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {totensUsados.map(([code, nome]) => (
                  <button key={code} onClick={() => alternarTotem(code)} style={{
                    padding:'6px 12px', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer',
                    background: filtroTotem === code ? '#FAECE7' : '#F5F4F0',
                    border: filtroTotem === code ? '1.5px solid #D85A30' : '1.5px solid #E2E0D8',
                    color: filtroTotem === code ? '#D85A30' : '#6B6A65',
                    transition:'all 0.15s'
                  }}>
                    📍 {nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Limpar filtros */}
          {temFiltro && (
            <button onClick={limparFiltros} style={{
              background:'none', border:'none', color:'#D85A30', fontSize:13,
              cursor:'pointer', marginBottom:12, fontWeight:600, padding:0
            }}>
              ✕ Limpar filtros
            </button>
          )}

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
              <p style={{ fontSize:13, color:'#9C9A93' }}>Escaneie um totem para fazer sua primeira retirada.</p>
            </div>
          )}

          {/* Sem resultado com filtro */}
          {!loading && retiradas.length > 0 && filtradas.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
              <p style={{ fontSize:14, color:'#9C9A93' }}>Nenhuma retirada com esses filtros.</p>
            </div>
          )}

          {/* Lista agrupada — só itens da página */}
          {!loading && Object.entries(grupos).map(([mes, items]) => {
            const itemsPagina = items.filter(r => visiveisIds.has(r.id))
            if (itemsPagina.length === 0) return null
            return (
              <div key={mes} style={{ marginBottom:24 }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#9C9A93', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                  {mes}
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {itemsPagina.map((r, i) => {
                    const sup = SUPRIMENTOS[r.suprimento]
                    const d = new Date(r.criado_em)
                    return (
                      <div key={i} className="card" style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{
                          width:44, height:44, borderRadius:14, flexShrink:0,
                          background: r.suprimento === 'agua' ? '#DBEAFE' : r.suprimento === 'gel' ? '#FAECE7' : '#DCFCE7',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22
                        }}>
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
            )
          })}

          {/* Paginação */}
          {!loading && filtradas.length > POR_PAGINA && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, marginBottom:16 }}>
              <p style={{ fontSize:12, color:'#9C9A93' }}>
                {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, filtradas.length)} de {filtradas.length}
              </p>
              <div style={{ display:'flex', gap:6 }}>
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  style={{
                    padding:'6px 14px', borderRadius:999, fontSize:13, fontWeight:600, cursor:'pointer',
                    background: paginaAtual === 1 ? '#F5F4F0' : '#FAECE7',
                    border: paginaAtual === 1 ? '1px solid #E2E0D8' : '1px solid #D85A30',
                    color: paginaAtual === 1 ? '#C0BEB8' : '#D85A30',
                  }}
                >← Anterior</button>
                <span style={{ padding:'6px 14px', fontSize:13, color:'#1a1a18', fontWeight:700 }}>
                  {paginaAtual}/{totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  style={{
                    padding:'6px 14px', borderRadius:999, fontSize:13, fontWeight:600, cursor:'pointer',
                    background: paginaAtual === totalPaginas ? '#F5F4F0' : '#FAECE7',
                    border: paginaAtual === totalPaginas ? '1px solid #E2E0D8' : '1px solid #D85A30',
                    color: paginaAtual === totalPaginas ? '#C0BEB8' : '#D85A30',
                  }}
                >Próximo →</button>
              </div>
            </div>
          )}

        </div>
      </div>

      <BottomNav />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
