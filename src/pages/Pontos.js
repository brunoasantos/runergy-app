import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { suprimento, distanciaKm, fmtKm } from '../lib/format'
import BottomNav from '../components/BottomNav'
import Icon from '../components/Icon'

const FLORIPA = [-27.5954, -48.548] // centro quando ainda não temos a localização
const pino = (ativo) => L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: `<span class="mapa-pino${ativo ? ' ativo' : ''}"></span>` })
const eu = L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11], html: '<span class="mapa-eu"></span>' })
const rota = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`

/** Mapa com os pontos Runergy e a distância a partir da localização atual. */
export default function Pontos() {
  const { conta } = useAuth()
  const [pontos, setPontos] = useState(null)
  const [posicao, setPosicao] = useState(null)
  const [semLocal, setSemLocal] = useState(false)
  const [sel, setSel] = useState(null)
  const caixa = useRef(null)
  const mapa = useRef(null)
  const camadas = useRef(null)

  useEffect(() => {
    supabase.from('totens').select('totem_code, nome, cidade, estado, lat, lng, suprimentos, horario, endereco')
      .eq('ativo', true).then(({ data }) => setPontos(data || []))
  }, [])

  function localizar() {
    if (!navigator.geolocation) { setSemLocal(true); return }
    navigator.geolocation.getCurrentPosition(
      (g) => { setPosicao({ lat: g.coords.latitude, lng: g.coords.longitude }); setSemLocal(false) },
      () => setSemLocal(true), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 })
  }
  useEffect(() => { localizar() }, [])

  // Cria o mapa uma vez
  useEffect(() => {
    if (!caixa.current || mapa.current) return
    mapa.current = L.map(caixa.current, { zoomControl: false, attributionControl: true }).setView(FLORIPA, 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa.current)
    camadas.current = L.layerGroup().addTo(mapa.current)
    return () => { mapa.current?.remove(); mapa.current = null }
  }, [])

  const lista = (pontos || []).filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({ ...p, km: distanciaKm(posicao, p) }))
    .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9))
  const maisPerto = lista[0]
  const atual = lista.find((p) => p.totem_code === sel) || maisPerto

  // Desenha pinos e enquadra você + o ponto mais perto
  useEffect(() => {
    const m = mapa.current
    if (!m || !camadas.current) return
    camadas.current.clearLayers()
    for (const p of lista) {
      L.marker([p.lat, p.lng], { icon: pino(atual && p.totem_code === atual.totem_code), title: p.nome, keyboard: true })
        .on('click', () => setSel(p.totem_code)).addTo(camadas.current)
    }
    if (posicao) L.marker([posicao.lat, posicao.lng], { icon: eu, interactive: false }).addTo(camadas.current)
    const alvo = atual || maisPerto
    if (posicao && alvo) m.fitBounds(L.latLngBounds([[posicao.lat, posicao.lng], [alvo.lat, alvo.lng]]), { padding: [48, 48], maxZoom: 15 })
    else if (alvo) m.setView([alvo.lat, alvo.lng], 14)
    else if (posicao) m.setView([posicao.lat, posicao.lng], 13)
  }, [pontos, posicao, sel])

  return (
    <>
      <main className="screen has-nav" style={{ gap: 14 }}>
        <div className="row between">
          <div className="stack" style={{ gap: 2 }}>
            <span className="small muted">Onde pegar</span>
            <span className="h2">Pontos perto de você</span>
          </div>
          <span className="pill neutral">{conta.rotulo}</span>
        </div>

        <div className="mapa">
          <div ref={caixa} className="mapa-caixa" role="region" aria-label="Mapa dos pontos Runergy" />
          <button type="button" className="icon-btn mapa-btn" aria-label="Usar minha localização" onClick={localizar}><Icon name="pin" size={20} /></button>
        </div>
        {semLocal && <div className="alert warn small">Não conseguimos sua localização. Libere o acesso à localização para ver a distância até cada ponto.</div>}

        {pontos === null && <div className="skeleton" style={{ height: 96 }} />}
        {pontos?.length === 0 && <p className="small muted" style={{ margin: 0 }}>Nenhum ponto ativo no momento. Avisamos quando abrir o próximo.</p>}
        {lista.map((p) => (
          <button key={p.totem_code} type="button" className={`card tight ponto-card${atual?.totem_code === p.totem_code ? ' sel' : ''}`} onClick={() => setSel(p.totem_code)}>
            <div className="row between" style={{ gap: 10, alignItems: 'baseline' }}>
              <strong className="ellipsis" style={{ fontSize: 16 }}>{p.nome}</strong>
              {p.km != null && <strong style={{ color: 'var(--accent-text)', whiteSpace: 'nowrap' }}>{fmtKm(p.km)}</strong>}
            </div>
            <div className="row between small" style={{ gap: 10, color: 'var(--text-2)' }}>
              <span className="ellipsis">{[p.cidade, p.horario].filter(Boolean).join(' · ')}</span>
              <a href={rota(p)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontWeight: 800, color: 'var(--accent-text)', textDecoration: 'none' }}>Rota</a>
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {(p.suprimentos || []).map((s) => <span key={s} className="pill neutral">{suprimento(s).label}</span>)}
            </div>
          </button>
        ))}

        {!conta.acessoQR && (
          <section className="card stack" style={{ gap: 10, background: 'var(--band-bg)', color: 'var(--band-text)', border: 0 }}>
            <strong style={{ fontSize: 16 }}>Pegue sem parar o treino</strong>
            <span className="small" style={{ opacity: 0.85 }}>Com o Runner (10 créditos por mês) ou o Hero (30) você mostra o QR e retira água, gel e eletrólito nos pontos.</span>
            <Link to="/planos" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>Ver planos</Link>
          </section>
        )}
      </main>
      <BottomNav />
    </>
  )
}
