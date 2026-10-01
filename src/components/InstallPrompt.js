import React, { useEffect, useState } from 'react'
import Icon from './Icon'

// Convite para instalar o app na tela inicial.
// Android/Chrome: botão nativo. iPhone: instrução (Compartilhar → Adicionar à Tela de Início).
export default function InstallPrompt() {
  const [evt, setEvt] = useState(null)
  const [fechado, setFechado] = useState(() => {
    try { return localStorage.getItem('runergy_install_fechado') === '1' } catch (e) { return false }
  })
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent)

  useEffect(() => {
    const on = (e) => { e.preventDefault(); setEvt(e) }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])

  if (standalone || fechado || (!evt && !ios)) return null
  const fechar = () => { setFechado(true); try { localStorage.setItem('runergy_install_fechado', '1') } catch (e) {} }

  return (
    <div className="card tight install-banner">
      <div className="icon-tile"><Icon name="download" /></div>
      <div className="grow">
        <div style={{ fontWeight: 800, fontSize: 15 }}>Instale o app</div>
        <div className="small muted">
          {evt ? 'Abra a Runergy direto da tela inicial.' : <>Toque em <Icon name="share" size={14} /> e depois em “Adicionar à Tela de Início”.</>}
        </div>
      </div>
      {evt && <button className="btn btn-primary" style={{ minHeight: 44, padding: '10px 14px', fontSize: 14 }} onClick={async () => { evt.prompt(); await evt.userChoice; setEvt(null) }}>Instalar</button>}
      <button className="icon-btn" aria-label="Fechar" onClick={fechar} style={{ background: 'transparent' }}><Icon name="x" size={18} /></button>
    </div>
  )
}
