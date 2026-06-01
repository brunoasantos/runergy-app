import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'

export default function Splash() {
  const navigate = useNavigate()
  const { atleta } = useApp()

  useEffect(() => {
    const t = setTimeout(() => {
      navigate(atleta ? '/home' : '/onboarding')
    }, 1800)
    return () => clearTimeout(t)
  }, [atleta, navigate])

  return (
    <div style={{
      flex: 1, background: '#1a1a18', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: '#D85A30', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <span style={{ fontSize: 32, fontWeight: 700, color: 'white', letterSpacing: -1 }}>Runergy</span>
      </div>
      <p style={{ color: '#888780', fontSize: 14 }}>A mochila invisível do atleta urbano</p>

      {/* Loader */}
      <div style={{ marginTop: 40 }}>
        <div style={{
          width: 32, height: 32, border: '3px solid #333',
          borderTopColor: '#D85A30', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
