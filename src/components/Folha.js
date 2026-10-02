import React, { useEffect, useRef } from 'react'
import Icon from './Icon'

/** Modal centralizado. Fecha no ✕, no Esc ou tocando fora. */
export default function Folha({ titulo, onFechar, children, largura = 480 }) {
  const ref = useRef(null)
  useEffect(() => {
    const antes = document.activeElement
    // Esc fecha só a janela de cima (quando uma abre sobre outra)
    const tecla = (e) => { if (e.key === 'Escape' && ref.current && ref.current.parentElement === [...document.querySelectorAll('.folha-fundo')].pop()) onFechar() }
    document.addEventListener('keydown', tecla)
    const ov = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = ov; antes?.focus?.() }
  }, [onFechar])
  return (
    <div className="folha-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="folha" role="dialog" aria-modal="true" aria-label={titulo} tabIndex={-1} ref={ref} style={{ width: `min(${largura}px, 100%)` }}>
        <div className="row between" style={{ gap: 10 }}>
          <strong style={{ fontSize: 18 }}>{titulo}</strong>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onFechar}><Icon name="x" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
