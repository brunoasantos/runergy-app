import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const slides = [
  {
    emoji: '🎒',
    title: 'Sua mochila invisível',
    sub: 'Hidratação e energia on-demand nas rotas de corrida. Sem carregar peso.',
    bg: '#1a1a18', textColor: '#fff', subColor: '#9C9A93',
  },
  {
    emoji: '📱',
    title: 'Escanear e retirar em 3 segundos',
    sub: 'Aproxime o celular do totem, escaneie o QR Code e siga a corrida sem parar o cronômetro.',
    bg: '#D85A30', textColor: '#fff', subColor: '#FAECE7',
  },
  {
    emoji: '⚡',
    title: 'Água, gel e eletrólitos\nonde você precisa',
    sub: 'Totens estrategicamente posicionados nas rotas de maior densidade de corredores.',
    bg: '#F5F4F0', textColor: '#1a1a18', subColor: '#6B6A65',
  },
]

export default function Onboarding() {
  const [cur, setCur] = useState(0)
  const navigate = useNavigate()
  const slide = slides[cur]

  return (
    <div style={{
      flex: 1, background: slide.bg, display: 'flex', flexDirection: 'column',
      transition: 'background 0.4s', minHeight: '100%'
    }}>
      {/* Skip */}
      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('/cadastro')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: slide.subColor, fontSize: 14, fontWeight: 500
        }}>Pular</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 80, marginBottom: 32 }}>{slide.emoji}</div>
        <h1 style={{ color: slide.textColor, fontSize: 28, fontWeight: 700, marginBottom: 16, whiteSpace: 'pre-line' }}>
          {slide.title}
        </h1>
        <p style={{ color: slide.subColor, fontSize: 15, lineHeight: 1.7 }}>{slide.sub}</p>
      </div>

      {/* Dots + Button */}
      <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === cur ? 24 : 8, height: 8, borderRadius: 999,
              background: i === cur ? '#D85A30' : slide.subColor,
              transition: 'all 0.3s', opacity: i === cur ? 1 : 0.4
            }}/>
          ))}
        </div>
        <button
          className="btn btn-primary"
          style={{ maxWidth: 320, background: cur === slides.length - 1 ? '#D85A30' : (slide.bg === '#D85A30' ? '#fff' : '#D85A30'),
                   color: cur === slides.length - 1 ? '#fff' : (slide.bg === '#D85A30' ? '#D85A30' : '#fff') }}
          onClick={() => cur < slides.length - 1 ? setCur(cur + 1) : navigate('/cadastro')}
        >
          {cur < slides.length - 1 ? 'Próximo' : 'Começar agora'}
        </button>
      </div>
    </div>
  )
}
