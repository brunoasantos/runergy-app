import { useEffect, useState, useCallback } from 'react'

// Padrão: claro. O usuário muda para escuro (ou automático) quando quiser.
// Chave v2: ignora o 'auto' que a versão anterior gravava sozinha; mantém escolhas explícitas.
const KEY = 'runergy_tema_v2' // 'light' | 'dark' | 'auto'
const KEY_V1 = 'runergy_tema'
const PADRAO = 'light'

function lerPreferencia() {
  try {
    const v2 = localStorage.getItem(KEY)
    if (v2) return v2
    const v1 = localStorage.getItem(KEY_V1)
    return v1 === 'dark' ? 'dark' : PADRAO
  } catch (e) { return PADRAO }
}

function resolve(pref) {
  if (pref === 'light' || pref === 'dark') return pref
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(pref) {
  const t = resolve(pref)
  document.documentElement.setAttribute('data-theme', t)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', t === 'dark' ? '#121212' : '#F4F4F2')
  return t
}

export function useTheme() {
  const [pref, setPref] = useState(lerPreferencia)
  const [theme, setTheme] = useState(() => resolve(pref))

  useEffect(() => {
    setTheme(apply(pref))
    try { localStorage.setItem(KEY, pref) } catch (e) {}
    if (pref !== 'auto' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setTheme(apply('auto'))
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on)
    return () => (mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on))
  }, [pref])

  const toggle = useCallback(() => setPref(theme === 'dark' ? 'light' : 'dark'), [theme])
  return { pref, setPref, theme, toggle }
}
