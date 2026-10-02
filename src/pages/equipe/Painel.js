import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { usePonto } from '../../lib/ponto'
import { inicioDoDiaSP, suprimento, fmtHora, mensagemErro, rotuloCreditos, brl } from '../../lib/format'
import { NOME_FORMA } from './Vender'
import EquipeBand from '../../components/EquipeBand'
import Icon from '../../components/Icon'
import { useToast } from '../../components/Toast'

export default function Painel() {
  const { user, perfil, conta, recarregarPerfil } = useAuth()
  const [consumindo, setConsumindo] = useState(null)
  const [filtroEnt, setFiltroEnt] = useState('todas') // todas | corredores | equipe
  const [pagEnt, setPagEnt] = useState(1)
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
    const [ret, abo, ass, est, ven] = await Promise.all([
      supabase.from('retiradas').select('id, suprimento, atleta_id, atleta_nome, criado_em, origem').eq('totem_code', ponto.codigo).gte('criado_em', desde).neq('origem', 'demo').order('criado_em', { ascending: false }),
      supabase.from('abordagens').select('id', { count: 'exact', head: true }).eq('totem_code', ponto.codigo).gte('criado_em', desde),
      supabase.from('assinantes').select('id', { count: 'exact', head: true }).gte('criado_em', desde),
      supabase.from('estoque_ponto').select('suprimento, quantidade, capacidade').eq('totem_code', ponto.codigo),
      supabase.from('vendas').select('id, criado_em, itens, total, forma_pagamento').eq('totem_code', ponto.codigo).gte('criado_em', desde).order('criado_em', { ascending: false }),
    ])
    const r = ret.data || []
    setDados({
      retiradas: r,
      atletas: new Set(r.map((x) => x.atleta_id)).size,
      abordagens: abo.count || 0,
      assinaturas: ass.count || 0,
      vendas: ven.data || [],
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
            <div className="kpi"><span className="num" style={{ color: 'var(--accent-text)' }}>{dados.retiradas.length}</span><span className="tiny muted">entregas{dados.retiradas.some((x) => x.origem === 'equipe') ? ` · ${dados.retiradas.filter((x) => x.origem === 'equipe').length} da equipe` : ''}</span></div>
            <div className="kpi"><span className="num">{dados.atletas}</span><span className="tiny muted">atletas diferentes</span></div>
            <div className="kpi"><span className="num">{dados.abordagens}</span><span className="tiny muted">abordagens{conversao != null ? ` · ${conversao}% retiraram` : ''}</span></div>
            {ehAdmin
              ? <div className="kpi"><span className="num">{dados.assinaturas}</span><span className="tiny muted">assinaturas no site hoje</span></div>
              : <div className="kpi"><span className="num">{Object.values(estoque).reduce((a, e) => a + (e?.quantidade || 0), 0)}</span><span className="tiny muted">itens no estoque</span></div>}
          </div>
        )}

        <section className="card stack" style={{ gap: 10, background: '#121212', color: '#FFFFFF', border: 0 }} aria-label="Venda avulsa">
          <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}>
            <strong style={{ fontSize: 17 }}>Venda avulsa</strong>
            {dados && <span className="small" style={{ color: '#CFCFCF' }}>{dados.vendas.length ? `${brl(dados.vendas.reduce((a, v) => a + Number(v.total), 0))} hoje · ${dados.vendas.length}` : 'nenhuma hoje'}</span>}
          </div>
          <span className="small" style={{ color: '#CFCFCF' }}>Para quem não tem plano. Escolha os itens, receba e registre. Baixa do estoque na hora.</span>
          <Link to="/equipe/vender" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}><Icon name="plus" size={18} />Nova venda</Link>
          {dados?.vendas?.length > 0 && (() => {
            // Resumo do dia por item: não cresce com o número de vendas
            const t = {}
            for (const v of dados.vendas) for (const i of v.itens || []) t[i.nome] = (t[i.nome] || 0) + Number(i.qtd || 0)
            return <div className="small" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}><span style={{ color: '#BDBDBD' }}>Vendido hoje: </span><strong>{Object.entries(t).map(([n, q]) => `${q} ${n}`).join(' · ')}</strong></div>
          })()}
          {dados?.vendas?.slice(0, 2).map((v) => (
            <div key={v.id} className="row between small" style={{ gap: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
              <span><strong>{(v.itens || []).map((i) => `${i.qtd} ${i.nome}`).join(' + ')}</strong><br /><span style={{ color: '#BDBDBD' }}>{NOME_FORMA[v.forma_pagamento]} · {fmtHora(v.criado_em)}</span></span>
              <strong>{brl(v.total)}</strong>
            </div>
          ))}
        </section>

        <section className="card tight stack" style={{ gap: 12 }} aria-label="Meu consumo">
          <div className="row between" style={{ gap: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Meu consumo</div>
              <div className="small muted">Pegou algo do ponto para você? Registre aqui. Baixa do estoque e {conta.ilimitado ? 'não gasta crédito (admin, até 10 por dia)' : `usa créditos conforme o item (${perfil.creditos} restantes)`}.</div>
            </div>
          </div>
          <div className="supply-grid">
            {(ponto.ponto?.suprimentos || []).map((s) => (
              <button key={s} type="button" className="supply" disabled={!!consumindo || (!conta.ilimitado && perfil.creditos < suprimento(s).peso)} onClick={() => consumir(s)}>
                <Icon name={suprimento(s).icon} size={22} /><span>{consumindo === s ? 'Registrando…' : suprimento(s).label}</span>
                <span className="tiny" style={{ fontWeight: 700, opacity: 0.7 }}>{rotuloCreditos(suprimento(s).peso)}</span>
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

        <ListaEntregas retiradas={dados?.retiradas} filtro={filtroEnt} setFiltro={(f) => { setFiltroEnt(f); setPagEnt(1) }} pagina={pagEnt} setPagina={setPagEnt} />

        <Link to="/equipe/fechar" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}><Icon name="check" size={18} />Fechar o dia (contagem e caixa)</Link>
        <Link to="/equipe" className="btn btn-primary btn-block btn-lg"><Icon name="scan" />Voltar a escanear</Link>
      </main>
      {toastEl}
    </div>
  )
}

const POR_PAGINA = 5
const FILTROS = [['todas', 'Todas'], ['corredores', 'Corredores'], ['equipe', 'Equipe']]

/** Entregas do dia: compactas, com filtro e paginação (no celular, páginas são melhores que rolagem dentro da rolagem). */
function ListaEntregas({ retiradas, filtro, setFiltro, pagina, setPagina }) {
  const todas = retiradas || []
  const lista = todas.filter((r) => filtro === 'todas' || (filtro === 'equipe' ? r.origem === 'equipe' : r.origem !== 'equipe'))
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const pag = Math.min(pagina, paginas)
  const visiveis = lista.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)
  return (
    <section className="stack" style={{ gap: 10 }} aria-label="Entregas de hoje">
      <div className="row between" style={{ gap: 8 }}>
        <span className="label-caps" style={{ whiteSpace: 'nowrap' }}>Entregas de hoje · {todas.length}</span>
      </div>
      <div className="chips" role="group" aria-label="Filtrar entregas">
        {FILTROS.map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
            {l} · {k === 'todas' ? todas.length : todas.filter((r) => (k === 'equipe' ? r.origem === 'equipe' : r.origem !== 'equipe')).length}
          </button>
        ))}
      </div>
      {retiradas && lista.length === 0 && <p className="small muted" style={{ margin: 0 }}>Nenhuma entrega aqui hoje.</p>}
      {visiveis.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {visiveis.map((r, i) => (
            <div key={r.id} className="row" style={{ gap: 12, padding: '10px 14px', borderTop: i ? '1px solid var(--line)' : 0, minHeight: 52 }}>
              <span style={{ color: 'var(--orange)', display: 'inline-flex', flexShrink: 0 }}><Icon name={suprimento(r.suprimento).icon} size={20} /></span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="ellipsis" style={{ fontWeight: 700, fontSize: 14 }}>{r.atleta_nome || 'Corredor'}</div>
                <div className="small muted">{suprimento(r.suprimento).label}{r.origem === 'equipe' ? ' · consumo da equipe' : ''}</div>
              </div>
              <span className="small muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtHora(r.criado_em)}</span>
            </div>
          ))}
        </div>
      )}
      {paginas > 1 && (
        <div className="row between" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pag <= 1} onClick={() => setPagina(pag - 1)} aria-label="Página anterior"><Icon name="back" size={16} />Anterior</button>
          <span className="small muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{(pag - 1) * POR_PAGINA + 1}–{Math.min(pag * POR_PAGINA, lista.length)} de {lista.length}</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pag >= paginas} onClick={() => setPagina(pag + 1)} aria-label="Próxima página">Próxima<Icon name="chevron" size={16} /></button>
        </div>
      )}
    </section>
  )
}
