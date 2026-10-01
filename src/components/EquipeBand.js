import React from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function EquipeBand({ ponto, voltar = '/' }) {
  const { pontos, codigo, setCodigo } = ponto
  return (
    <header className="band">
      <div className="row" style={{ gap: 10, minWidth: 0 }}>
        <Link to={voltar} aria-label="Sair do modo equipe" style={{ color: 'var(--band-text)', display: 'inline-flex', minWidth: 44, minHeight: 44, alignItems: 'center' }}>
          <Icon name="back" size={20} />
        </Link>
        <span className="band-title">MODO EQUIPE</span>
      </div>
      <label className="sr-only" htmlFor="ponto">Ponto de operação</label>
      <select id="ponto" value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={!pontos.length}>
        {pontos.map((p) => <option key={p.totem_code} value={p.totem_code}>{p.nome}</option>)}
      </select>
    </header>
  )
}
