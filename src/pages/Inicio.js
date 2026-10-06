import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { saudacao, primeiroNome, suprimento, fmtDia, fmtHora, distanciaKm, fmtKm, fmtMes } from '../lib/format'
import { useMeusEnvios } from './MeuKit'
import BottomNav from '../components/BottomNav'
import InstallPrompt from '../components/InstallPrompt'
import Icon from '../components/Icon'
import { useDisponibilidade, estadoItem } from '../lib/disponibilidade'

export default function Inicio() {
  const disp = useDisponibilidade()
  const { perfil, ehEquipe, conta } = useAuth()
  const pago = conta.tipo === 'cliente' && ['starter', 'runner', 'hero', 'kit'].includes(perfil.plano)
  const envios = useMeusEnvios()
  const kit = envios?.[0]
  const chaveBV = `rg_boasvindas_${perfil.id}_${perfil.plano}`
  const [bvVisto, setBvVisto] = useState(() => { try { return !!localStorage.getItem(chaveBV) } catch (e) { return true } })
  const fecharBV = () => { try { localStorage.setItem(chaveBV, '1') } catch (e) {} setBvVisto(true) }
  const ETAPA = { preparando: 'Preparando', postado: 'Postado · acompanhe o rastreio', entregue: 'Entregue' }
  const [pontos, setPontos] = useState(null)
  const [ultima, setUltima] = useState(null)
  const [posicao, setPosicao] = useState(null)

  const acesso = conta.acessoQR
  const total = conta.creditosTotal
  const maxCred = Math.max(conta.creditosMes || 0, total || 0, 1)
  // Avisa quando está acabando (3 créditos ou menos = no máximo uma água, um eletrólito ou um gel)
  const acabando = conta.podeRecarregar && !conta.ilimitado && total <= 3

  useEffect(() => {
    supabase.from('totens').select('totem_code, nome, cidade, estado, lat, lng, suprimentos, horario')
      .eq('ativo', true).order('totem_code')
      .then(({ data }) => setPontos(data || []))
    supabase.from('retiradas').select('suprimento, totem_nome, criado_em').eq('atleta_id', perfil.id)
      .order('criado_em', { ascending: false }).limit(1)
      .then(({ data }) => setUltima(data?.[0] || null))
    // Distância só se o atleta já autorizou a localização antes (não pedimos sem ele tocar)
    if (navigator.permissions && navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then((p) => {
        if (p.state === 'granted') navigator.geolocation.getCurrentPosition((g) => setPosicao({ lat: g.coords.latitude, lng: g.coords.longitude }))
      }).catch(() => {})
    }
  }, [perfil.id])

  function pedirLocalizacao() {
    navigator.geolocation?.getCurrentPosition((g) => setPosicao({ lat: g.coords.latitude, lng: g.coords.longitude }), () => {})
  }

  const ordenados = (pontos || []).map((p) => ({ ...p, km: distanciaKm(posicao, p) }))
    .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9))

  return (
    <>
      <main className="screen has-nav">
        <div className="row between">
          <div className="stack" style={{ gap: 2 }}>
            <span className="small muted">{saudacao()},</span>
            <span className="h2">{primeiroNome(perfil.nome)}</span>
          </div>
          <Link to="/perfil" aria-label="Perfil" className="icon-btn" style={{ borderRadius: 999, fontWeight: 800, textDecoration: 'none', color: 'var(--text)', background: 'var(--surface-2)' }}>
            {primeiroNome(perfil.nome).charAt(0).toUpperCase()}
          </Link>
        </div>

        <section className="card" aria-label="Seus créditos">
          <div className="streaks" aria-hidden="true" style={{ right: 0, top: -10, width: 90, height: 170 }}>
            <i style={{ right: 18, width: 14, height: 170, opacity: 0.85 }} />
            <i style={{ right: 50, width: 6, height: 170, opacity: 0.4 }} />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="pill brand">{conta.rotulo.toUpperCase()}</span>
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 14 }}>
            <span className="num" style={{ fontSize: 'clamp(52px, 17vw, 68px)' }}>{conta.ilimitado ? '∞' : total}</span>
            <span className="small" style={{ color: 'var(--text-2)' }}>{conta.ilimitado ? 'créditos ilimitados' : conta.saldoRecarga > 0 ? 'créditos' : !conta.creditosMes ? 'créditos' : total > conta.creditosMes ? `créditos · ${conta.creditosMes} por mês` : `de ${conta.creditosMes} créditos no mês`}</span>
          </div>
          <div className="bar" style={{ marginTop: 14, maxWidth: 'calc(100% - 70px)' }}>
            <span style={{ width: conta.ilimitado ? '100%' : `${Math.min(100, Math.round((total / maxCred) * 100))}%` }} />
          </div>
          {conta.saldoRecarga > 0 && (
            <span className="small" style={{ display: 'block', marginTop: 10, color: 'var(--text-2)', maxWidth: 'calc(100% - 60px)' }}>
              {conta.creditosPlano} do plano · <strong style={{ color: 'var(--text)' }}>{conta.saldoRecarga} da recarga</strong>
            </span>
          )}
          {conta.podeRecarregar && (
            <Link to="/recarga" className="row" style={{ marginTop: 12, gap: 6, fontSize: 14, fontWeight: 800, color: 'var(--accent-text)', textDecoration: 'none', width: 'fit-content' }}>
              <Icon name="plus" size={16} />Recarregar créditos
            </Link>
          )}
        </section>

        {acabando && (
          <Link to="/recarga" className="card tight row" style={{ textDecoration: 'none', color: 'var(--text)', border: '1.5px solid var(--orange)' }}>
            <span className="icon-tile" style={{ background: 'var(--orange)', color: 'var(--on-orange)' }}><Icon name="bolt" /></span>
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 800 }}>{total === 0 ? 'Seus créditos acabaram' : `Restam ${total} ${total === 1 ? 'crédito' : 'créditos'}`}</span>
              <span className="small" style={{ color: 'var(--text-2)' }}>Recarregue e siga treinando: 5 créditos por R$ 12,50.</span>
            </span>
            <Icon name="chevron" size={18} />
          </Link>
        )}

        {pago && !bvVisto && (
          <section className="card stack" style={{ gap: 10, background: '#121212', color: '#FFFFFF', border: 0 }} aria-label="Boas-vindas">
            <span style={{ fontSize: 'clamp(22px, 6.5vw, 26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', lineHeight: 1.1 }}>Boas-vindas ao {conta.planoCliente}!</span>
            <span className="small" style={{ color: '#D6D6D6', lineHeight: 1.5 }}>
              {conta.kitEmCasa
                ? `Seu kit ${kit ? `de ${fmtMes(kit.competencia + 'T12:00:00')} ` : ''}já está sendo preparado e chega nos próximos dias. Quando for postado, o rastreio aparece em Meu kit.`
                : `Seu QR está liberado: ${conta.creditosMes} créditos por mês para retirar água, gel e eletrólito nos pontos Runergy.`}
            </span>
            <div className="row" style={{ gap: 10 }}>
              <button type="button" className="btn btn-ghost grow" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }} onClick={fecharBV}>Ok</button>
              {conta.kitEmCasa
                ? <Link to="/kit" onClick={fecharBV} className="btn btn-primary grow" style={{ textDecoration: 'none' }}>Ver meu kit</Link>
                : <Link to="/qr" onClick={fecharBV} className="btn btn-primary grow" style={{ textDecoration: 'none' }}>Ver meu QR</Link>}
            </div>
          </section>
        )}

        {kit && bvVisto && (kit.status !== 'entregue' || (Date.now() - new Date(kit.entregue_em)) < 7 * 86400000) && (
          <Link to="/kit" className="card tight row" style={{ textDecoration: 'none', color: 'var(--text)' }}>
            <span className="icon-tile"><Icon name="bottle" /></span>
            <span className="grow">
              <span className="tiny muted" style={{ display: 'block' }}>{kit.tipo === 'brinde' ? 'Seu brinde Runergy' : `Kit de ${fmtMes(kit.competencia + 'T12:00:00')}`}</span>
              <span style={{ fontWeight: 800 }}>{ETAPA[kit.status]}</span>
            </span>
            <Icon name="chevron" size={18} />
          </Link>
        )}

        {acesso ? (
          <Link to="/qr" className="card" style={{ background: 'var(--orange)', color: 'var(--on-orange)', textDecoration: 'none', border: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '20px 18px' }}>
            <span style={{ width: 56, height: 56, borderRadius: 16, background: '#121212', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="qr" size={30} />
            </span>
            <span className="stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 'clamp(18px, 5.4vw, 21px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>Mostrar meu QR</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>No ponto Runergy ou para a equipe</span>
            </span>
          </Link>
        ) : (
          <section className="card accent stack" style={{ gap: 12 }}>
            <span className="h3">Retire água e gel na sua rota</span>
            <p className="small" style={{ margin: 0, color: 'var(--text-2)' }}>
              O acesso aos pontos Runergy vem nos planos Starter (10 créditos por mês), Runner (20) e Hero (30) para água, carbo gel e eletrólito.
            </p>
            <Link to="/planos" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>Ver planos</Link>
          </section>
        )}

        {ehEquipe && (
          <Link to="/equipe" className="card tight row" style={{ textDecoration: 'none', color: 'var(--text)', background: 'var(--band-bg)' }}>
            <span className="icon-tile" style={{ background: 'var(--orange)', color: 'var(--on-orange)' }}><Icon name="scan" /></span>
            <span className="grow" style={{ color: 'var(--band-text)' }}>
              <span style={{ display: 'block', fontWeight: 800 }}>Modo equipe</span>
              <span className="small" style={{ opacity: 0.75 }}>Escanear atletas e ver o painel do dia</span>
            </span>
            <span style={{ color: 'var(--band-text)' }}><Icon name="chevron" size={18} /></span>
          </Link>
        )}

        <InstallPrompt />

        {ultima && (
          <div className="card tight row">
            <span className="icon-tile"><Icon name={suprimento(ultima.suprimento).icon} /></span>
            <div className="grow">
              <div className="tiny muted">Última retirada</div>
              <div style={{ fontWeight: 700 }} className="ellipsis">{suprimento(ultima.suprimento).label} · {ultima.totem_nome}</div>
            </div>
            <span className="small muted" style={{ textAlign: 'right' }}>{fmtDia(ultima.criado_em)}<br />{fmtHora(ultima.criado_em)}</span>
          </div>
        )}

        <div className="row between" style={{ marginTop: 4 }}>
          <h2 className="h3">Pontos Runergy</h2>
          <div className="row" style={{ gap: 12 }}>
            {!posicao && navigator.geolocation && (
              <button className="btn-link" onClick={pedirLocalizacao} style={{ fontSize: 13 }}>Ver distância</button>
            )}
            <Link to="/pontos" className="btn-link" style={{ fontSize: 13, textDecoration: 'none' }}>Ver no mapa</Link>
          </div>
        </div>

        <div className="stack">
          {pontos === null && [0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 72 }} />)}
          {pontos?.length === 0 && <p className="small muted" style={{ margin: 0 }}>Nenhum ponto ativo no momento. Avisamos quando abrir o próximo.</p>}
          {ordenados.map((p) => (
            <div key={p.totem_code} className="card tight row">
              <span className="icon-tile"><Icon name="pin" /></span>
              <div className="grow">
                <div style={{ fontWeight: 700 }} className="ellipsis">{p.nome}</div>
                <div className="small muted ellipsis">
                  {[p.horario, p.km != null ? fmtKm(p.km) : `${p.cidade || ''}${p.estado ? ' · ' + p.estado : ''}`].filter(Boolean).join(' · ')}
                </div>
                <div className="row" style={{ gap: '4px 12px', marginTop: 6, flexWrap: 'wrap' }} aria-label="Itens disponíveis">
                  {(p.suprimentos || []).map((s) => {
                    const est = estadoItem(disp[p.totem_code]?.[s])
                    const esgotou = est === 'esgotou'
                    return (
                      <span key={s} className="row tiny" style={{ gap: 4, color: 'var(--text-2)', opacity: esgotou ? 0.55 : 1 }}>
                        <span style={{ color: esgotou ? 'var(--text-2)' : 'var(--orange)', display: 'inline-flex' }}><Icon name={suprimento(s).icon} size={14} /></span>
                        <span style={{ textDecoration: esgotou ? 'line-through' : 'none' }}>{suprimento(s).label}</span>
                        {est && <strong style={{ color: esgotou ? 'var(--err)' : 'var(--warn)' }}>· {est}</strong>}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </>
  )
}
