import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { suprimento, fmtDia, fmtHora, fmtMes, SUPRIMENTOS } from '../lib/format'
import BottomNav from '../components/BottomNav'
import Icon from '../components/Icon'

const MOSTRAR = 5 // itens por mês antes do "Ver mais"

/** Resumo de um mês: "3 Carbo Gel · 2 Água". */
function resumo(itens) {
  const t = {}
  for (const i of itens) t[i.suprimento] = (t[i.suprimento] || 0) + 1
  return Object.entries(t).sort((a, z) => z[1] - a[1]).map(([s, n]) => `${n} ${suprimento(s).label}`).join(' · ')
}

/** Histórico de retiradas: o mês atual aberto; os anteriores fechados numa linha (toque para abrir). Evita rolagem longa. */
export default function Historico() {
  const { perfil } = useAuth()
  const [itens, setItens] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [abertos, setAbertos] = useState({})
  const [todos, setTodos] = useState({})

  useEffect(() => {
    supabase.from('retiradas').select('id, suprimento, totem_nome, criado_em').eq('atleta_id', perfil.id)
      .order('criado_em', { ascending: false }).limit(300)
      .then(({ data }) => setItens(data || []))
  }, [perfil.id])

  const mesAtual = fmtMes(new Date())
  const doMes = useMemo(() => (itens || []).filter((i) => fmtMes(i.criado_em) === mesAtual), [itens, mesAtual])
  const topo = useMemo(() => {
    const t = {}
    for (const i of doMes) t[i.suprimento] = (t[i.suprimento] || 0) + 1
    return Object.entries(t).sort((a, z) => z[1] - a[1]).slice(0, 2)
  }, [doMes])

  const grupos = useMemo(() => {
    const lista = (itens || []).filter((i) => filtro === 'todos' || i.suprimento === filtro)
    const g = []
    for (const i of lista) {
      const m = fmtMes(i.criado_em)
      if (!g.length || g[g.length - 1].mes !== m) g.push({ mes: m, itens: [] })
      g[g.length - 1].itens.push(i)
    }
    return g
  }, [itens, filtro])

  const estaAberto = (g, n) => (abertos[g.mes] ?? n === 0)
  const comItens = Object.keys(SUPRIMENTOS).filter((k) => (itens || []).some((i) => i.suprimento === k))

  return (
    <>
      <main className="screen has-nav">
        <h1 className="display" style={{ fontSize: 'clamp(28px, 8vw, 34px)' }}>Histórico</h1>

        <section className="card" aria-label="Resumo do mês" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <div className="stack" style={{ gap: 4 }}><span className="num" style={{ fontSize: 32, color: 'var(--accent-text)' }}>{doMes.length}</span><span className="tiny muted">retiradas em {mesAtual.split(' ')[0]}</span></div>
          {topo.map(([s, n]) => <div key={s} className="stack" style={{ gap: 4 }}><span className="num" style={{ fontSize: 32 }}>{n}</span><span className="tiny muted">{suprimento(s).label.toLowerCase()}</span></div>)}
        </section>

        {comItens.length > 1 && (
          <div className="chips" role="group" aria-label="Filtrar por item">
            <button className="chip" aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>Tudo</button>
            {comItens.map((k) => <button key={k} className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{SUPRIMENTOS[k].label}</button>)}
          </div>
        )}

        {itens === null && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 70 }} />)}
        {itens && grupos.length === 0 && (
          <div className="card stack" style={{ alignItems: 'center', textAlign: 'center', gap: 10, padding: 28 }}>
            <span className="icon-tile"><Icon name="clock" /></span>
            <span style={{ fontWeight: 700 }}>Nenhuma retirada {filtro !== 'todos' ? 'desse item ' : ''}ainda</span>
            <span className="small muted">Quando você retirar algo num ponto Runergy, aparece aqui.</span>
          </div>
        )}

        {grupos.map((g, n) => {
          const aberto = estaAberto(g, n)
          const visiveis = todos[g.mes] ? g.itens : g.itens.slice(0, MOSTRAR)
          return (
            <section key={g.mes} className="stack" style={{ gap: 8 }} aria-label={g.mes}>
              <button type="button" className="card tight row" style={{ gap: 10, textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit' }}
                aria-expanded={aberto} onClick={() => setAbertos((a) => ({ ...a, [g.mes]: !aberto }))}>
                <div className="grow">
                  <div style={{ fontWeight: 800, textTransform: 'capitalize' }}>{g.mes}</div>
                  <div className="small muted">{g.itens.length} retirada{g.itens.length > 1 ? 's' : ''} · {resumo(g.itens)}</div>
                </div>
                <span style={{ display: 'inline-flex', transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><Icon name="chevron" size={20} /></span>
              </button>
              {aberto && visiveis.map((i) => (
                <div key={i.id} className="row" style={{ gap: 12, padding: '4px 4px 4px 8px' }}>
                  <span style={{ color: 'var(--orange)', display: 'inline-flex' }}><Icon name={suprimento(i.suprimento).icon} size={20} /></span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{suprimento(i.suprimento).label}</div>
                    <div className="tiny muted ellipsis">{i.totem_nome}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="small" style={{ fontWeight: 700, textTransform: 'capitalize' }}>{fmtDia(i.criado_em)}</div>
                    <div className="tiny muted">{fmtHora(i.criado_em)}</div>
                  </div>
                </div>
              ))}
              {aberto && g.itens.length > MOSTRAR && !todos[g.mes] && (
                <button type="button" className="btn btn-link" onClick={() => setTodos((t) => ({ ...t, [g.mes]: true }))}>Ver mais {g.itens.length - MOSTRAR}</button>
              )}
            </section>
          )
        })}
      </main>
      <BottomNav />
    </>
  )
}
