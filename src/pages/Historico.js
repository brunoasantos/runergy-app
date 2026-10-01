import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { suprimento, fmtDia, fmtHora, fmtMes, SUPRIMENTOS } from '../lib/format'
import BottomNav from '../components/BottomNav'
import Icon from '../components/Icon'

export default function Historico() {
  const { perfil } = useAuth()
  const [itens, setItens] = useState(null)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    supabase.from('retiradas').select('id, suprimento, totem_nome, criado_em').eq('atleta_id', perfil.id)
      .order('criado_em', { ascending: false }).limit(300)
      .then(({ data }) => setItens(data || []))
  }, [perfil.id])

  const mesAtual = fmtMes(new Date())
  const doMes = useMemo(() => (itens || []).filter((i) => fmtMes(i.criado_em) === mesAtual), [itens, mesAtual])
  const conta = (s) => doMes.filter((i) => i.suprimento === s).length

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

  return (
    <>
      <main className="screen has-nav">
        <h1 className="display" style={{ fontSize: 'clamp(28px, 8vw, 34px)' }}>Histórico</h1>

        <section className="card" aria-label="Resumo do mês" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <div className="stack" style={{ gap: 4 }}><span className="num" style={{ fontSize: 32, color: 'var(--accent-text)' }}>{doMes.length}</span><span className="tiny muted">retiradas em {mesAtual.split(' ')[0]}</span></div>
          <div className="stack" style={{ gap: 4 }}><span className="num" style={{ fontSize: 32 }}>{conta('gel')}</span><span className="tiny muted">carbo gel</span></div>
          <div className="stack" style={{ gap: 4 }}><span className="num" style={{ fontSize: 32 }}>{conta('agua')}</span><span className="tiny muted">água</span></div>
        </section>

        <div className="chips" role="group" aria-label="Filtrar por item">
          <button className="chip" aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>Tudo</button>
          {Object.entries(SUPRIMENTOS).map(([k, v]) => (
            <button key={k} className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{v.label}</button>
          ))}
        </div>

        {itens === null && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 70 }} />)}
        {itens && grupos.length === 0 && (
          <div className="card stack" style={{ alignItems: 'center', textAlign: 'center', gap: 10, padding: 28 }}>
            <span className="icon-tile"><Icon name="clock" /></span>
            <span style={{ fontWeight: 700 }}>Nenhuma retirada {filtro !== 'todos' ? 'desse item ' : ''}ainda</span>
            <span className="small muted">Quando você retirar algo num ponto Runergy, aparece aqui.</span>
          </div>
        )}

        {grupos.map((g) => (
          <section key={g.mes} className="stack" aria-label={g.mes}>
            <span className="label-caps">{g.mes}</span>
            {g.itens.map((i) => (
              <div key={i.id} className="card tight row">
                <span className="icon-tile"><Icon name={suprimento(i.suprimento).icon} /></span>
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{suprimento(i.suprimento).label}</div>
                  <div className="small muted ellipsis">{i.totem_nome}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="small" style={{ fontWeight: 700, textTransform: 'capitalize' }}>{fmtDia(i.criado_em)}</div>
                  <div className="tiny muted">{fmtHora(i.criado_em)}</div>
                </div>
              </div>
            ))}
          </section>
        ))}
      </main>
      <BottomNav />
    </>
  )
}
