import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { usePonto } from '../../lib/ponto'
import { inicioDoDiaSP, suprimento, fmtHora, mensagemErro } from '../../lib/format'
import EquipeBand from '../../components/EquipeBand'
import Icon from '../../components/Icon'
import { useToast } from '../../components/Toast'

export default function Painel() {
  const { user, perfil, conta, recarregarPerfil } = useAuth()
  const [consumindo, setConsumindo] = useState(null)
  const ehAdmin = perfil?.papel === 'admin'
  const ponto = usePonto()
  const [toastEl, toast] = useToast()
  const [dados, setDados] = useState(null)
  const [estoque, setEstoque] = useState({})
  const [editEstoque, setEditEstoque] = useState(false)
  const [rascunho, setRascunho] = useState({})

  const carregar = useCallback(async () => {
    if (!ponto.codigo) return
    const desde = inicioDoDiaSP()
    const [ret, abo, ass, est] = await Promise.all([
      supabase.from('retiradas').select('id, suprimento, atleta_id, atleta_nome, criado_em').eq('totem_code', ponto.codigo).gte('criado_em', desde).order('criado_em', { ascending: false }),
      supabase.from('abordagens').select('id', { count: 'exact', head: true }).eq('totem_code', ponto.codigo).gte('criado_em', desde),
      supabase.from('assinantes').select('id', { count: 'exact', head: true }).gte('criado_em', desde),
      supabase.from('estoque_ponto').select('suprimento, quantidade, capacidade').eq('totem_code', ponto.codigo),
    ])
    const r = ret.data || []
    setDados({
      retiradas: r,
      atletas: new Set(r.map((x) => x.atleta_id)).size,
      abordagens: abo.count || 0,
      assinaturas: ass.count || 0,
    })
    const e = {}
    for (const row of est.data || []) e[row.suprimento] = row
    setEstoque(e)
  }, [ponto.codigo])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { const t = setInterval(carregar, 30000); return () => clearInterval(t) }, [carregar])

  async function abordagem(delta) {
    if (delta > 0) {
      const { error } = await supabase.from('abordagens').insert({ totem_code: ponto.codigo })
      if (error) return toast(mensagemErro(error), 'err')
    } else {
      const { data } = await supabase.from('abordagens').select('id').eq('totem_code', ponto.codigo).eq('operador_id', user.id)
        .gte('criado_em', inicioDoDiaSP()).order('criado_em', { ascending: false }).limit(1)
      if (!data?.length) return
      const { error } = await supabase.from('abordagens').delete().eq('id', data[0].id)
      if (error) return toast(mensagemErro(error), 'err')
    }
    setDados((d) => d && { ...d, abordagens: Math.max(0, d.abordagens + delta) })
  }

  async function consumir(s) {
    setConsumindo(s)
    const { data, error } = await supabase.rpc('registrar_consumo_equipe', { p_totem_code: ponto.codigo, p_suprimento: s })
    setConsumindo(null)
    if (error) return toast(mensagemErro(error), 'err')
    const r = Array.isArray(data) ? data[0] : data
    toast(`${suprimento(s).label} registrado no seu consumo${r?.creditos_restantes >= 9999 ? '' : ` · restam ${r?.creditos_restantes} créditos`}`, 'ok')
    recarregarPerfil(); carregar()
  }

  function abrirEdicao() {
    const r = {}
    for (const s of ponto.ponto?.suprimentos || []) r[s] = { quantidade: estoque[s]?.quantidade ?? 0, capacidade: estoque[s]?.capacidade ?? 0 }
    setRascunho(r); setEditEstoque(true)
  }

  async function salvarEstoque() {
    // Cada item vira uma "contagem" registrada no histórico de estoque (RPC ajustar_estoque)
    for (const [s, v] of Object.entries(rascunho)) {
      const quantidade = Math.max(0, parseInt(v.quantidade, 10) || 0)
      const capacidade = Math.max(0, parseInt(v.capacidade, 10) || 0)
      const { error } = await supabase.rpc('ajustar_estoque', {
        p_totem_code: ponto.codigo, p_suprimento: s, p_quantidade: quantidade,
        p_tipo: 'ajuste', p_capacidade: capacidade, p_obs: 'Contagem pelo app',
      })
      if (error) return toast(mensagemErro(error), 'err')
    }
    toast('Estoque atualizado', 'ok'); setEditEstoque(false); carregar()
  }

  const ajusta = (s, campo, v) => setRascunho((r) => ({ ...r, [s]: { ...r[s], [campo]: v } }))
  const porItem = (s) => (dados?.retiradas || []).filter((x) => x.suprimento === s).length
  const conversao = dados && dados.abordagens > 0 ? Math.round((dados.atletas / dados.abordagens) * 100) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <EquipeBand ponto={ponto} voltar="/equipe" />
      <main className="screen" style={{ paddingTop: 16 }}>
        <div className="row between">
          <h1 className="display" style={{ fontSize: 'clamp(26px, 7.5vw, 32px)' }}>Painel do dia</h1>
          <button className="icon-btn" aria-label="Atualizar" onClick={carregar}><Icon name="refresh" size={20} /></button>
        </div>

        {!dados ? <div className="skeleton" style={{ height: 180 }} /> : (
          <div className="kpis four">
            <div className="kpi"><span className="num" style={{ color: 'var(--accent-text)' }}>{dados.retiradas.length}</span><span className="tiny muted">entregas</span></div>
            <div className="kpi"><span className="num">{dados.atletas}</span><span className="tiny muted">atletas diferentes</span></div>
            <div className="kpi"><span className="num">{dados.abordagens}</span><span className="tiny muted">abordagens{conversao != null ? ` · ${conversao}% retiraram` : ''}</span></div>
            {ehAdmin
              ? <div className="kpi"><span className="num">{dados.assinaturas}</span><span className="tiny muted">assinaturas no site hoje</span></div>
              : <div className="kpi"><span className="num">{Object.values(estoque).reduce((a, e) => a + (e?.quantidade || 0), 0)}</span><span className="tiny muted">itens no estoque</span></div>}
          </div>
        )}

        <section className="card tight stack" style={{ gap: 12 }} aria-label="Meu consumo">
          <div className="row between" style={{ gap: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Meu consumo</div>
              <div className="small muted">Pegou algo do ponto para você? Registre aqui. Baixa do estoque e {conta.ilimitado ? 'não gasta crédito (admin)' : `usa 1 dos seus créditos (${perfil.creditos} restantes)`}.</div>
            </div>
          </div>
          <div className="supply-grid">
            {(ponto.ponto?.suprimentos || []).map((s) => (
              <button key={s} type="button" className="supply" disabled={!!consumindo || (!conta.ilimitado && perfil.creditos <= 0)} onClick={() => consumir(s)}>
                <Icon name={suprimento(s).icon} size={22} /><span>{consumindo === s ? 'Registrando…' : suprimento(s).label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card tight row" aria-label="Contar abordagem">
          <div className="grow">
            <div style={{ fontWeight: 700 }}>Abordagens</div>
            <div className="small muted">Some 1 a cada corredor abordado, retirando ou não</div>
          </div>
          <div className="stepper">
            <button aria-label="Tirar uma abordagem" onClick={() => abordagem(-1)}><Icon name="minus" size={18} /></button>
            <button aria-label="Somar uma abordagem" onClick={() => abordagem(1)} style={{ background: 'var(--orange)', color: 'var(--on-orange)', width: 52, height: 52 }}><Icon name="plus" size={22} /></button>
          </div>
        </section>

        <section className="stack" aria-label="Estoque do ponto">
          <div className="row between">
            <span className="label-caps" style={{ whiteSpace: 'nowrap' }}>Estoque do ponto</span>
            {!editEstoque && <button className="btn-link" style={{ whiteSpace: 'nowrap', fontSize: 14 }} onClick={abrirEdicao} disabled={!ponto.ponto}>Atualizar</button>}
          </div>
          {!editEstoque ? (
            (ponto.ponto?.suprimentos || []).map((s) => {
              const e = estoque[s]
              const pct = e && e.capacidade > 0 ? Math.round((e.quantidade / e.capacidade) * 100) : null
              const baixo = pct != null && pct <= 25
              return (
                <div key={s} className="stack" style={{ gap: 6 }}>
                  <div className="row between small">
                    <span style={{ fontWeight: 700 }}>{suprimento(s).label} <span className="muted" style={{ fontWeight: 500 }}>· {porItem(s)} hoje</span></span>
                    <span style={{ color: baixo ? 'var(--warn)' : 'var(--text-2)', fontWeight: baixo ? 800 : 500 }}>
                      {e ? `${e.quantidade}${e.capacidade ? ` de ${e.capacidade}` : ''}${baixo ? ' · repor' : ''}` : 'sem controle'}
                    </span>
                  </div>
                  <div className="bar thick"><span style={{ width: `${pct ?? 0}%`, background: baixo ? 'var(--warn)' : undefined }} /></div>
                </div>
              )
            })
          ) : (
            <div className="card stack" style={{ gap: 14 }}>
              {Object.entries(rascunho).map(([s, v]) => (
                <div key={s} className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
                  <span style={{ fontWeight: 700, width: 92, flexShrink: 0, paddingBottom: 16 }}>{suprimento(s).label}</span>
                  <div className="field grow"><label htmlFor={`q-${s}`}>Tem agora</label>
                    <input id={`q-${s}`} className="input" inputMode="numeric" value={v.quantidade} onChange={(e) => ajusta(s, 'quantidade', e.target.value.replace(/\D/g, ''))} /></div>
                  <div className="field grow"><label htmlFor={`c-${s}`}>Capacidade</label>
                    <input id={`c-${s}`} className="input" inputMode="numeric" value={v.capacidade} onChange={(e) => ajusta(s, 'capacidade', e.target.value.replace(/\D/g, ''))} /></div>
                </div>
              ))}
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-ghost grow" onClick={() => setEditEstoque(false)}>Cancelar</button>
                <button className="btn btn-primary grow" onClick={salvarEstoque}>Salvar</button>
              </div>
            </div>
          )}
        </section>

        <section className="stack" aria-label="Últimas entregas">
          <span className="label-caps">Últimas entregas</span>
          {dados && dados.retiradas.length === 0 && <p className="small muted" style={{ margin: 0 }}>Nenhuma entrega hoje neste ponto.</p>}
          {(dados?.retiradas || []).slice(0, 12).map((r) => (
            <div key={r.id} className="card tight row">
              <span className="icon-tile"><Icon name={suprimento(r.suprimento).icon} /></span>
              <div className="grow"><div style={{ fontWeight: 700 }} className="ellipsis">{r.atleta_nome || 'Atleta'}</div><div className="small muted">{suprimento(r.suprimento).label}</div></div>
              <span className="small muted">{fmtHora(r.criado_em)}</span>
            </div>
          ))}
        </section>

        <Link to="/equipe" className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }}><Icon name="scan" />Voltar a escanear</Link>
      </main>
      {toastEl}
    </div>
  )
}
