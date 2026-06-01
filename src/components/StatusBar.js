import React from 'react'

export default function StatusBar() {
  const now = new Date()
  const h = now.getHours().toString().padStart(2,'0')
  const m = now.getMinutes().toString().padStart(2,'0')
  return (
    <div className="status-bar">
      <span>{h}:{m}</span>
      <span style={{display:'flex',gap:4,alignItems:'center'}}>
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M1 6l5 5 6-6 6 6 5-5"/></svg>
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
        🔋
      </span>
    </div>
  )
}
