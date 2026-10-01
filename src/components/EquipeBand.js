import React from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { useTema } from '../lib/temaCtx'
import { salvarModo } from '../lib/modo'

export default function EquipeBand({ ponto, voltar = '/' }) {
  const { pontos, codigo, setCodigo } = ponto
  const tema = useTema()
  const escuro = tema?.theme === 'dark'
  return (
    <header className="band">
      <div className="row" style={{ gap: 10, minWidth: 0 }}>
        <Link to={voltar} onClick={() => { if (voltar === '/') salvarModo('atleta') }} aria-label="Sair do modo equipe" style={{ color: 'var(--band-text)', display: 'inline-flex', minWidth: 44, minHeight: 44, alignItems: 'center' }}>
          <Icon name="back" size={20} />
        </Link>
        <span className="band-title"><span className="band-modo">MODO </span>EQUIPE</span>
      </div>
      <label className="sr-only" htmlFor="ponto">Ponto de operação</label>
      <div className="row" style={{ gap: 6, minWidth: 0, flex: '0 1 auto', justifyContent: 'flex-end' }}>
        <select id="ponto" value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={!pontos.length}>
          {pontos.map((p) => <option key={p.totem_code} value={p.totem_code}>{p.nome}</option>)}
        </select>
        <button type="button" className="band-icon" onClick={tema?.toggle} aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}>
          <Icon name={escuro ? 'sun' : 'moon'} size={18} />
        </button>
      </div>
    </header>
  )
}
