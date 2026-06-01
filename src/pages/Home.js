import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { supabase } from '../lib/supabase'
import { SUPRIMENTOS } from '../lib/dados'
import BottomNav from '../components/BottomNav'
import StatusBar from '../components/StatusBar'

export default function Home() {
  const { atleta } = useApp()
  const navigate = useNavigate()
  const [ultimaRetirada, setUltimaRetirada] = useState(null)

  useEffect(() => {
    const buscarUltima = async () => {
      try {
        const { data } = await supabase
          .from('retiradas')
          .select('*, totens(nome)')
          .eq('atleta_email', atleta.email)
          .order('criado_em', { ascending: false })
          .limit(1)
        if (data && data.length > 0) setUltimaRetirada(data[0])
      } catch (_) {}
    }
    buscarUltima()
  }, [atleta.email])

  const primeiroNome = atleta.nome.split(' ')[0]
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <StatusBar />
      <div className="page" style={{ overflowY: 'auto' }}>

        {/* Hero */}
        <div style={{ background: '#1a1a18', padding: '20px 24px 28px' }}>
          <p style={{ color: '#9C9A93', fontSize: 13, marginBottom: 4 }}>{saudacao},</p>
          <h2 style={{ color: 'white', fontSize: 24, marginBottom: 20 }}>{primeiroNome} 👋</h2>

          {/* Card de créditos */}
          <div style={{
            background: '#D85A30', borderRadius: 20, padding: '20px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <p style={{ color: '#FAECE7', fontSize: 12, marginBottom: 4 }}>Créditos disponíveis</p>
              <div style={{ fontSize: 40, fontWeight: 700, color: 'white', lineHeight: 1 }}>
                {atleta.creditos}
              </div>
              <p style={{ color: '#FAECE7', fontSize: 12, marginTop: 4 }}>
                Plano {atleta.plano.charAt(0).toUpperCase() + atleta.plano.slice(1)}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>⚡</div>
              <p style={{ color: '#FAECE7', fontSize: 11 }}>retiradas/mês</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 20px' }}>

          {/* Botão principal — Escanear */}
          <button
            className="btn btn-primary"
            onClick={() => navigate('/scanner')}
            style={{ height: 60, fontSize: 17, borderRadius: 18, marginBottom: 12 }}
          >
            <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <path d="M14 14h1v1h-1zM17 14h1v1h-1zM14 17h1v1h-1zM17 17h3v3h-3z"/>
            </svg>
            Escanear Totem
          </button>

          {/* Última retirada */}
          {ultimaRetirada && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6B6A65', marginBottom: 10 }}>Última retirada</p>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28 }}>{SUPRIMENTOS[ultimaRetirada.suprimento]?.emoji || '💧'}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#1a1a18', fontSize: 14 }}>
                    {SUPRIMENTOS[ultimaRetirada.suprimento]?.label}
                  </p>
                  <p style={{ fontSize: 12, color: '#9C9A93' }}>
                    {ultimaRetirada.totens?.nome || 'Totem Runergy'}
                  </p>
                </div>
                <p style={{ fontSize: 11, color: '#9C9A93' }}>
                  {new Date(ultimaRetirada.criado_em).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* Totens próximos (mock) */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6B6A65' }}>Totens próximos</p>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 0' }}>Ver mapa</button>
            </div>
            {[
              { nome: 'Beira-Mar Norte — KM 3', dist: '0,4 km', status: 'disponível' },
              { nome: 'Beira-Mar Norte — KM 6', dist: '3,1 km', status: 'disponível' },
              { nome: 'Parque da Luz — KM 2',   dist: '5,8 km', status: 'baixo estoque' },
            ].map((t, i) => (
              <div key={i} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: '#FAECE7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0
                }}>📍</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: '#1a1a18' }}>{t.nome}</p>
                  <p style={{ fontSize: 11, color: '#9C9A93' }}>{t.dist} de distância</p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                  background: t.status === 'disponível' ? '#DCFCE7' : '#FEF9C3',
                  color: t.status === 'disponível' ? '#15803D' : '#854D0E'
                }}>{t.status}</span>
              </div>
            ))}
          </div>

          {/* Dica */}
          <div style={{ background: '#FAECE7', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <p style={{ fontSize: 12, color: '#712B13', lineHeight: 1.6 }}>
              <strong>Dica:</strong> Planeje onde você vai retirar antes de sair de casa. O totem fica disponível mesmo com o app em segundo plano.
            </p>
          </div>

        </div>
      </div>
      <BottomNav />
    </div>
  )
}
