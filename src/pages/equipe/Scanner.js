import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { supabase } from '../../lib/supabase'
import { usePonto } from '../../lib/ponto'
import { mensagemErro, inicioDoDiaSP } from '../../lib/format'
import EquipeBand from '../../components/EquipeBand'
import Icon from '../../components/Icon'
import { useToast } from '../../components/Toast'

export default function Scanner() {
  const nav = useNavigate()
  const loc = useLocation()
  const ponto = usePonto()
  const [toastEl, toast] = useToast()
  const [camEstado, setCamEstado] = useState('iniciando') // iniciando | ativa | erro | pausada
  const [camErro, setCamErro] = useState('')
  const [digitando, setDigitando] = useState(false)
  const [curto, setCurto] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [hoje, setHoje] = useState(null)
  const leitor = useRef(null)
  const ocupado = useRef(false)

  // Mensagem de sucesso vinda da tela de validação
  useEffect(() => {
    if (loc.state?.ok) { toast(loc.state.ok, 'ok'); nav('.', { replace: true, state: null }) }
  }, [loc.state, nav, toast])

  const abrirCodigo = useCallback(async (texto) => {
    if (ocupado.current) return
    const codigo = (texto || '').trim()
    if (!codigo.startsWith('RNG1.')) { toast('Esse QR não é da Runergy.', 'err'); return }
    ocupado.current = true
    try { navigator.vibrate?.(40) } catch (e) {}
    const { data, error } = await supabase.rpc('consultar_codigo', { p_codigo: codigo })
    if (error) { toast(mensagemErro(error), 'err'); ocupado.current = false; return }
    const info = Array.isArray(data) ? data[0] : data
    nav('/equipe/validar', { state: { codigo, info } })
  }, [nav, toast])

  // Câmera traseira lendo QR
  useEffect(() => {
    if (digitando) return
    let parado = false
    const h = new Html5Qrcode('leitor', { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] })
    leitor.current = h
    h.start(
      { facingMode: 'environment' },
      { fps: 12, qrbox: (w, hh) => { const s = Math.floor(Math.min(w, hh) * 0.72); return { width: s, height: s } }, aspectRatio: 1 },
      (texto) => abrirCodigo(texto),
      () => {}
    ).then(() => { if (!parado) setCamEstado('ativa') })
      .catch((e) => {
        if (parado) return
        setCamEstado('erro')
        const m = String(e?.message || e)
        setCamErro(/Permission|NotAllowed/i.test(m)
          ? 'A câmera foi bloqueada. Libere o acesso à câmera nas configurações do navegador e recarregue.'
          : 'Não foi possível abrir a câmera neste aparelho. Use “Digitar código”.')
      })
    return () => {
      parado = true
      const hh = leitor.current
      if (hh && hh.isScanning) hh.stop().then(() => hh.clear()).catch(() => {})
    }
  }, [digitando, abrirCodigo])

  // Contadores rápidos do dia neste ponto
  useEffect(() => {
    if (!ponto.codigo) return
    const desde = inicioDoDiaSP()
    supabase.from('retiradas').select('suprimento', { count: 'exact' }).eq('totem_code', ponto.codigo).gte('criado_em', desde).neq('origem', 'demo')
      .then(({ data, count }) => setHoje({ total: count || 0, gel: (data || []).filter((r) => r.suprimento === 'gel').length, agua: (data || []).filter((r) => r.suprimento === 'agua').length }))
  }, [ponto.codigo, loc.key])

  async function enviarCurto(e) {
    e.preventDefault()
    const c = curto.replace(/[^0-9a-fA-F]/g, '')
    if (c.length !== 6 || buscando) return
    setBuscando(true)
    const { data, error } = await supabase.rpc('buscar_codigo_curto', { p_curto: c })
    setBuscando(false)
    if (error) { toast(mensagemErro(error), 'err'); return }
    abrirCodigo(data)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <EquipeBand ponto={ponto} />
      <main className="screen" style={{ paddingTop: 16 }}>
        {!digitando ? (
          <>
            <div className="camera" aria-label="Câmera para ler o QR do atleta">
              <div id="leitor" />
              {camEstado === 'ativa' && <div className="frame" aria-hidden="true"><i /><i /><i /><i /></div>}
              {camEstado === 'iniciando' && <div className="cam-msg"><div className="spinner" />Abrindo a câmera…</div>}
              {camEstado === 'erro' && <div className="cam-msg"><Icon name="scan" size={36} />{camErro}</div>}
            </div>
            <p className="lead" style={{ textAlign: 'center', fontWeight: 600 }}>Aponte para o QR no celular do atleta</p>
          </>
        ) : (
          <form className="card stack" style={{ gap: 14 }} onSubmit={enviarCurto}>
            <span className="h3">Digitar código</span>
            <p className="small" style={{ margin: 0, color: 'var(--text-2)' }}>O código de 6 caracteres aparece embaixo do QR do atleta.</p>
            <label className="sr-only" htmlFor="curto">Código de 6 caracteres</label>
            <input id="curto" className="input code-input" autoFocus autoCapitalize="characters" autoComplete="off" spellCheck="false"
              placeholder="A1B 2C3" value={curto} maxLength={7}
              onChange={(e) => setCurto(e.target.value.toUpperCase().replace(/[^0-9A-F ]/g, ''))} />
            <button className="btn btn-primary btn-block btn-lg" disabled={curto.replace(/\s/g, '').length !== 6 || buscando}>
              {buscando ? 'Buscando…' : 'Continuar'}
            </button>
          </form>
        )}

        {hoje && (
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div className="kpi"><span className="num" style={{ fontSize: 26, color: 'var(--accent-text)' }}>{hoje.total}</span><span className="tiny muted">entregas hoje</span></div>
            <div className="kpi"><span className="num" style={{ fontSize: 26 }}>{hoje.gel}</span><span className="tiny muted">carbo gel</span></div>
            <div className="kpi"><span className="num" style={{ fontSize: 26 }}>{hoje.agua}</span><span className="tiny muted">água</span></div>
          </div>
        )}

        <div className="row" style={{ gap: 10, marginTop: 'auto' }}>
          <button className="btn btn-ghost grow" onClick={() => { setDigitando((d) => !d); setCurto(''); setCamEstado('iniciando') }}>
            <Icon name={digitando ? 'scan' : 'keyboard'} size={20} />{digitando ? 'Câmera' : 'Digitar'}
          </button>
          <Link to="/equipe/painel" className="btn btn-ghost grow"><Icon name="chart" size={20} />Painel</Link>
        </div>
      </main>
      {toastEl}
    </div>
  )
}
