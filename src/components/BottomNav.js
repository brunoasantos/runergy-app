import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const IconHome = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
  </svg>
)
const IconScan = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <path d="M14 14h1v1h-1zM17 14h1v1h-1zM14 17h1v1h-1zM17 17h3v3h-3z"/>
  </svg>
)
const IconHistory = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
  </svg>
)
const IconUser = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const items = [
    { path: '/home',      label: 'Início',   Icon: IconHome    },
    { path: '/scanner',   label: 'Escanear', Icon: IconScan    },
    { path: '/historico', label: 'Histórico',Icon: IconHistory },
    { path: '/perfil',    label: 'Perfil',   Icon: IconUser    },
  ]

  return (
    <nav className="bottom-nav">
      {items.map(({ path, label, Icon }) => (
        <button
          key={path}
          className={`nav-item ${pathname === path ? 'active' : ''}`}
          onClick={() => navigate(path)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
