import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { mensagemErro } from '../lib/format'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'
import Icon from '../components/Icon'

const VALIDADE = 90 // segundos (definido no banco)

export default function MeuQR() {
  const { perfil, conta, recarregarPerfil } = useAuth()
  const nav = useNavigate()
  const [codigo, setCodigo] = useState(null)
  const [expiraEm, setExpiraEm] = useState(null)
  const [agora, setAgora] = useState(Date.now())
  const [erro, setErro] = useState('')
  const geradoEm = useRef(null)
  const gerando = useRef(false)

  const plano = perfil.planos || {}
  const acesso = conta.acessoQR

  const gerar = useCallback(async () => {
    if (gerando.current) return
    gerando.current = true
    setErro('')
    const { data, error } = await supabase.rpc('gerar_codigo_retirada')
    gerando.current = false
    if (error) { setErro(mensagemErro(error)); return }
    const row = Array.isArray(data) ? data[0] : data
    geradoEm.current = new Date(Date.now() - 5000).toISOString()
    setCodigo(row.codigo)
    setExpiraEm(new Date(row.expira_em).getTime())
  }, [])

  // Gera ao abrir
  useEffect(() => { if (acesso) gerar() }, [acesso, gerar])

  // Relógio da contagem
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Renova sozinho quando faltam 5 segundos
  const restante = expiraEm ? Math.max(0, Math.round((expiraEm - agora) / 1000)) : 0
  useEffect(() => {
    if (acesso && codigo && restante <= 5 && document.visibilityState === 'visible') gerar()
  }, [restante, codigo, acesso, gerar])

  // Renova ao voltar para o app (o código pode ter expirado em segundo plano)
  useEffect(() => {
    const on = () => { if (document.visibilityState === 'visible' && acesso) gerar() }
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [acesso, gerar])

  // Quando a equipe confirmar, a retirada aparece aqui em segundos
  useEffect(() => {
    if (!codigo) return
    const t = setInterval(async () => {
      const { data } = await supabase.from('retiradas').select('id').eq('atleta_id', perfil.id)
        .gte('criado_em', geradoEm.current).order('criado_em', { ascending: false }).limit(1)
      if (data && data.length) {
        clearInterval(t)
        await recarregarPerfil()
        nav(`/confirmado/${data[0].id}`, { replace: true })
      }
    }, 2500)
    return () => clearInterval(t)
  }, [codigo, perfil.id, nav, recarregarPerfil])

  // Mantém a tela acesa enquanto o QR está aberto (quando o navegador permite)
  useEffect(() => {
    let lock = null
    const pedir = async () => { try { lock = await navigator.wakeLock?.request('screen') } catch (e) {} }
    pedir()
    const on = () => { if (document.visibilityState === 'visible') pedir() }
    document.addEventListener('visibilitychange', on)
    return () => { document.removeEventListener('visibilitychange', on); try { lock?.release() } catch (e) {} }
  }, [])

  const pct = expiraEm ? Math.min(100, Math.round((restante / VALIDADE) * 100)) : 0
  const mmss = `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}`

  return (
    <>
      <main className="screen has-nav">
        <PageHeader titulo="Meu QR" voltar="/" />

        {!acesso ? (
          <section className="card stack" style={{ gap: 12, textAlign: 'center', alignItems: 'center', padding: 24 }}>
            <span className="icon-tile" style={{ width: 64, height: 64, borderRadius: 18 }}><Icon name="qr" size={32} /></span>
            <h1 className="h2">Seu QR libera os pontos com os planos Runner e Hero</h1>
            <p className="small" style={{ margin: 0, color: 'var(--text-2)' }}>
              Seu plano atual é <strong>{plano.nome || 'Grátis'}</strong>. Com o Runner você tem 10 créditos por mês e com o Hero, 30, para retirar água, carbo gel e eletrólito nos pontos Runergy.
            </p>
            <Link to="/planos" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>Ver planos</Link>
          </section>
        ) : (
          <>
            <section className="qr-card" aria-live="polite">
              <div style={{ minHeight: 'min(72vw, 300px)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                {codigo && !erro ? (
                  <QRCodeSVG value={codigo} size={300} level="M" includeMargin={false} bgColor="#FFFFFF" fgColor="#121212" title="QR de retirada" />
                ) : erro ? (
                  <div className="stack" style={{ alignItems: 'center', gap: 12, color: '#121212', padding: 20, textAlign: 'center' }}>
                    <Icon name="refresh" size={32} />
                    <span style={{ fontWeight: 700 }}>{erro}</span>
                    <button className="btn btn-primary" onClick={gerar}>Tentar de novo</button>
                  </div>
                ) : (
                  <div className="spinner" />
                )}
              </div>
              {codigo && !erro && (
                <span aria-label="Código curto" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', color: '#555', fontVariantNumeric: 'tabular-nums' }}>
                  CÓDIGO {codigo.slice(-6, -3).toUpperCase()} {codigo.slice(-3).toUpperCase()}
                </span>
              )}
              <div className="stack" style={{ alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 800, textAlign: 'center' }}>{perfil.nome}</span>
                <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
                  <span className="pill-dark">{conta.rotulo.toUpperCase()}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#3D3D3D' }}>{conta.ilimitado ? 'ilimitado' : `${perfil.creditos} créditos`}</span>
                </div>
              </div>
            </section>

            <div className="stack" style={{ gap: 8 }}>
              <div className="row between small">
                <span style={{ color: 'var(--text-2)' }}>Código único · renova sozinho</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-text)', fontVariantNumeric: 'tabular-nums' }}>{codigo ? mmss : '—'}</span>
              </div>
              <div className="bar"><span style={{ width: `${pct}%`, transition: 'width 1s linear' }} /></div>
            </div>

            {!conta.ilimitado && perfil.creditos <= 0 && (
              <div className="alert warn">Você está sem créditos neste mês. Eles renovam no dia 1º do próximo mês.</div>
            )}

            <div className="card tight row">
              <span className="icon-tile"><Icon name="sun" /></span>
              <span className="small" style={{ color: 'var(--text-2)' }}>Deixe o brilho da tela alto e aproxime do leitor ou mostre para a equipe.</span>
            </div>
            <div className="card tight row">
              <span className="icon-tile"><Icon name="watch" /></span>
              <span className="small" style={{ color: 'var(--text-2)' }}>Correndo sem celular? Em breve: QR no relógio pela Apple Wallet e Google Wallet.</span>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </>
  )
}
