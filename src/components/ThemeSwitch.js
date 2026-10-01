import React from 'react'

export default function ThemeSwitch({ tema }) {
  const opts = [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']]
  return (
    <div className="segmented" role="group" aria-label="Tema do app">
      {opts.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={tema.pref === v} onClick={() => tema.setPref(v)}>{l}</button>
      ))}
    </div>
  )
}
