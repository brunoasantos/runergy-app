import React from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'

export default function PageHeader({ titulo, voltar = -1, direita }) {
  const nav = useNavigate()
  return (
    <div className="row between" style={{ minHeight: 44 }}>
      {voltar !== null ? (
        <button className="icon-btn" aria-label="Voltar" onClick={() => nav(voltar)}><Icon name="back" size={20} /></button>
      ) : <span style={{ width: 44 }} />}
      <span className="h3" style={{ textAlign: 'center' }}>{titulo}</span>
      {direita || <span style={{ width: 44 }} />}
    </div>
  )
}
