import { useEffect, useState, useCallback } from 'react'

const KEY = 'runergy_tema' // 'auto' | 'light' | 'dark'

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
  const [pref, setPref] = useState(() => {
    try { return localStorage.getItem(KEY) || 'auto' } catch (e) { return 'auto' }
  })
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
