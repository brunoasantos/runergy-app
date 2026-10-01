import React, { useCallback, useEffect, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const show = useCallback((texto, tipo = 'ok') => setToast({ texto, tipo, id: Date.now() }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])
  const el = toast ? <div className={`toast ${toast.tipo}`} role="status" aria-live="polite">{toast.texto}</div> : null
  return [el, show]
}
