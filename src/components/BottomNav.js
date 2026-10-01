import React from 'react'
import { NavLink } from 'react-router-dom'
import Icon from './Icon'

export default function BottomNav() {
  const cls = ({ isActive }) => (isActive ? 'active' : undefined)
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <NavLink to="/" end className={cls}><Icon name="home" />Início</NavLink>
      <NavLink to="/qr" className={({ isActive }) => 'qr' + (isActive ? ' active' : '')}>
        <span className="qr-dot"><Icon name="qr" size={24} /></span>Meu QR
      </NavLink>
      <NavLink to="/historico" className={cls}><Icon name="clock" />Histórico</NavLink>
      <NavLink to="/perfil" className={cls}><Icon name="user" />Perfil</NavLink>
    </nav>
  )
}
