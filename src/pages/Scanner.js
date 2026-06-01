import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TOTENS_MOCK } from '../lib/dados'
import StatusBar from '../components/StatusBar'

export default function Scanner() {
  const navigate = useNavigate()
  const [fase, setFase] = useState('idle') // idle | scanning | found | manual
  const [totemSelecionado, setTotemSelecionado] = useState(null)
  const [pulseAnim, setPulseAnim] = useState(false)

  const simularScan = () => {
    setFase('scanning')
    setPulseAnim(true)
    // Simula 2s de leitura e encontra o totem RUNERGY-001
    setTimeout(() => {
      const totem = TOTENS_MOCK[0]
      setTotemSelecionado(totem)
      setFase('found')
      setPulseAnim(false)
    }, 2000)
  }

  const selecionarManual = (totem) => {
    setTotemSelecionado(totem)
    setFase('found')
  }

  const confirmar = () => {
    navigate('/retirada', { state: { totem: totemSelecionado } })
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: fase === 'scanning' ? '#1a1a18' : 'white' }}>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12, background: fase === 'scanning' ? '#1a1a18' : 'white' }}>
        <button onClick={() => navigate('/home')} style={{
          background: fase === 'scanning' ? '#333' : '#F5F4F0',
          border: 'none', borderRadius: 12, width: 36, height: 36,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="18" height="18" fill="none" stroke={fase === 'scanning' ? 'white' : '#1a1a18'} strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h3 style={{ color: fase === 'scanning' ? 'white' : '#1a1a18' }}>Escanear Totem</h3>
      </div>

      {/* Viewfinder / Scanner */}
      {(fase === 'idle' || fase === 'scanning') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a18', padding: '0 32px' }}>

          {/* Frame do scanner */}
          <div style={{ position: 'relative', marginBottom: 32 }}>
            <div style={{
              width: 240, height: 240, borderRadius: 24, border: '2px solid #444',
              position: 'relative', overflow: 'hidden',
              background: fase === 'scanning' ? 'rgba(216,90,48,0.05)' : 'transparent'
            }}>
              {/* Cantos */}
              {[{top:0,left:0},{top:0,right:0},{bottom:0,left:0},{bottom:0,right:0}].map((pos, i) => (
                <div key={i} style={{
                  position:'absolute', width:28, height:28, ...pos,
                  borderTop: (pos.top === 0) ? '3px solid #D85A30' : 'none',
                  borderBottom: (pos.bottom === 0) ? '3px solid #D85A30' : 'none',
                  borderLeft: (pos.left === 0) ? '3px solid #D85A30' : 'none',
                  borderRight: (pos.right === 0) ? '3px solid #D85A30' : 'none',
                  borderRadius: pos.top === 0 && pos.left === 0 ? '8px 0 0 0' : pos.top === 0 ? '0 8px 0 0' : pos.left === 0 ? '0 0 0 8px' : '0 0 8px 0'
                }}/>
              ))}

              {/* QR mock */}
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {fase === 'scanning' ? (
                  <div style={{ textAlign:'center' }}>
                    <div style={{ width:48, height:48, border:'4px solid #333', borderTopColor:'#D85A30', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
                    <p style={{ color:'#888', fontSize:12, marginTop:12 }}>Lendo QR Code...</p>
                  </div>
                ) : (
                  <div style={{ opacity: 0.3 }}>
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="#888">
                      <rect x="10" y="10" width="30" height="30" rx="4"/>
                      <rect x="15" y="15" width="20" height="20" rx="2" fill="#1a1a18"/>
                      <rect x="60" y="10" width="30" height="30" rx="4"/>
                      <rect x="65" y="15" width="20" height="20" rx="2" fill="#1a1a18"/>
                      <rect x="10" y="60" width="30" height="30" rx="4"/>
                      <rect x="15" y="65" width="20" height="20" rx="2" fill="#1a1a18"/>
                      <rect x="60" y="60" width="10" height="10" rx="2"/>
                      <rect x="75" y="60" width="15" height="10" rx="2"/>
                      <rect x="60" y="75" width="15" height="10" rx="2"/>
                      <rect x="80" y="75" width="10" height="15" rx="2"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          <p style={{ color:'#888780', fontSize:14, textAlign:'center', marginBottom:32 }}>
            {fase === 'scanning' ? 'Aproxime o celular ao totem...' : 'Aponte a câmera para o QR Code\ndo totem Runergy'}
          </p>

          {fase === 'idle' && (
            <>
              <button className="btn btn-primary" onClick={simularScan} style={{ maxWidth:280 }}>
                📷 Simular leitura do QR Code
              </button>
              <button
                onClick={() => setFase('manual')}
                style={{ background:'none', border:'none', color:'#888780', fontSize:13, cursor:'pointer', marginTop:16 }}
              >
                Selecionar totem manualmente
              </button>
            </>
          )}
        </div>
      )}

      {/* Seleção manual */}
      {fase === 'manual' && (
        <div style={{ flex:1, padding:'8px 20px' }}>
          <p style={{ fontSize:13, color:'#6B6A65', marginBottom:14 }}>Totens disponíveis na sua área:</p>
          {TOTENS_MOCK.map(t => (
            <button key={t.totem_code} onClick={() => selecionarManual(t)} style={{
              width:'100%', padding:'16px', borderRadius:14, border:'1.5px solid #E2E0D8',
              background:'white', cursor:'pointer', textAlign:'left', marginBottom:10,
              display:'flex', alignItems:'center', gap:12
            }}>
              <span style={{ fontSize:24 }}>📍</span>
              <div>
                <p style={{ fontWeight:600, fontSize:14, color:'#1a1a18' }}>{t.nome}</p>
                <p style={{ fontSize:12, color:'#9C9A93' }}>{t.totem_code} · {t.cidade}, {t.estado}</p>
              </div>
            </button>
          ))}
          <button onClick={() => setFase('idle')} style={{ background:'none', border:'none', color:'#D85A30', cursor:'pointer', fontSize:13, marginTop:4 }}>
            ← Voltar para o scanner
          </button>
        </div>
      )}

      {/* Totem encontrado */}
      {fase === 'found' && totemSelecionado && (
        <div style={{ flex:1, padding:'20px 20px', display:'flex', flexDirection:'column' }}>
          {/* Success */}
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ width:64, height:64, borderRadius:999, background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:32 }}>
              ✅
            </div>
            <h3 style={{ fontSize:18, marginBottom:4 }}>Totem identificado!</h3>
            <p style={{ fontSize:13, color:'#6B6A65' }}>Selecione o que deseja retirar</p>
          </div>

          {/* Info do totem */}
          <div className="card" style={{ marginBottom:20, borderLeft:'3px solid #D85A30', borderRadius:'0 14px 14px 0', paddingLeft:14 }}>
            <p style={{ fontSize:11, color:'#D85A30', fontWeight:600, marginBottom:4 }}>TOTEM RUNERGY</p>
            <p style={{ fontWeight:700, fontSize:15, color:'#1a1a18' }}>{totemSelecionado.nome}</p>
            <p style={{ fontSize:12, color:'#9C9A93' }}>{totemSelecionado.totem_code} · {totemSelecionado.cidade}</p>
          </div>

          <button className="btn btn-primary" onClick={confirmar} style={{ height:56, fontSize:16, borderRadius:16 }}>
            Escolher suprimento →
          </button>
          <button onClick={() => setFase('idle')} style={{ background:'none', border:'none', color:'#9C9A93', cursor:'pointer', fontSize:13, marginTop:12, textAlign:'center' }}>
            Escanear outro totem
          </button>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
