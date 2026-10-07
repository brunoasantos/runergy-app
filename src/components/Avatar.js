import React, { useEffect, useState } from 'react'
import { useFotoUrl } from '../lib/foto'

/** Foto da pessoa (círculo). Sem foto, ou se não carregar, mostra a inicial do nome. */
export default function Avatar({ nome, path, size = 44, fontSize, style, className }) {
  const url = useFotoUrl(path)
  const [falhou, setFalhou] = useState(false)
  useEffect(() => { setFalhou(false) }, [url])
  const mostrar = url && !falhou
  return (
    <span className={className} aria-hidden="true" style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0, overflow: 'hidden',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--orange)', color: 'var(--on-orange)', fontWeight: 900,
      fontSize: fontSize || Math.round(size * 0.4), ...style,
    }}>
      {mostrar
        ? <img src={url} alt="" width={size} height={size} onError={() => setFalhou(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : (nome || 'R').trim().charAt(0).toUpperCase()}
    </span>
  )
}
