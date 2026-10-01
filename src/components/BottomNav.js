import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Icon from './Icon'

// Quem tem QR (Runner, Hero, atleta, equipe) vê "Meu QR" no centro; quem não tem vê "Planos".
export default function BottomNav() {
  const { conta } = useAuth()
  const cls = ({ isActive }) => (isActive ? 'active' : undefined)
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <NavLink to="/" end className={cls}><Icon name="home" />Início</NavLink>
      <NavLink to="/pontos" className={cls}><Icon name="pin" />Pontos</NavLink>
      {conta?.acessoQR ? (
        <NavLink to="/qr" className={({ isActive }) => 'qr' + (isActive ? ' active' : '')}>
          <span className="qr-dot"><Icon name="qr" size={24} /></span>Meu QR
        </NavLink>
      ) : (
        <NavLink to="/planos" className={({ isActive }) => 'qr' + (isActive ? ' active' : '')}>
          <span className="qr-dot"><Icon name="bolt" size={24} /></span>Planos
        </NavLink>
      )}
      <NavLink to="/historico" className={cls}><Icon name="clock" />Histórico</NavLink>
      <NavLink to="/perfil" className={cls}><Icon name="user" />Perfil</NavLink>
    </nav>
  )
}
