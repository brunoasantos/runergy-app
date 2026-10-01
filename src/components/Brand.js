import React from 'react'

export function Wordmark({ width = 150 }) {
  return (
    <span style={{ display: 'inline-block', width }}>
      <img className="wordmark on-dark" src="/brand/wordmark_dark.png" alt="Runergy" width={width} />
      <img className="wordmark on-light" src="/brand/wordmark_light.png" alt="Runergy" width={width} />
    </span>
  )
}

export function RMark({ size = 56, alt = 'Runergy' }) {
  return <img src="/brand/r_mark.png" alt={alt} width={size} style={{ width: size, height: 'auto' }} />
}

// Linhas de velocidade inspiradas no corte do R
export function Streaks({ style, scale = 1, opacity = 1 }) {
  const s = (n) => n * scale
  return (
    <div className="streaks" style={{ width: s(220), height: s(300), opacity, ...style }} aria-hidden="true">
      <i style={{ right: s(50), width: s(20), height: s(300) }} />
      <i style={{ right: s(98), top: s(30), width: s(8), height: s(260), opacity: 0.5 }} />
      <i style={{ right: s(128), top: s(70), width: s(4), height: s(200), opacity: 0.28 }} />
    </div>
  )
}
