import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { usePonto } from '../../lib/ponto'
import { inicioDoDiaSP, suprimento, fmtHora, mensagemErro, rotuloCreditos, brl } from '../../lib/format'
import { NOME_FORMA } from './Vender'
import EquipeBand from '../../components/EquipeBand'
import Icon from '../../components/Icon'
import Folha from '../../components/Folha'
import { useToast } from '../../components/Toast'

export default function Painel() {
  const { perfil, conta, recarregarPerfil } = useAuth()
  const [consumindo, setConsumindo] = useState(null)
  const [filtroEnt, setFiltroEnt] = useState('todas') // todas | corredores | equipe
  const [pagEnt, setPagEnt] = useState(1)
  const ehAdmin = perfil?.papel === 'admin'
  const ponto = usePonto()
  const [toastEl, toast] = useToast()
  const [dados, setDados] = useState(null)
  const [estoque, setEstoque] = useState({})
  const [perda, setPerda] = useState(null) // { item, qtd, motivo } — baixa de item estragado/caído
  const [salvandoPerda, setSalvandoPerda] = useState(false)
  const [verVendas, setVerVendas] = useState(false)
  const fecharVendas = useCallback(() => setVerVendas(false), [])

  const carregar = useCallback(async () => {
    if (!ponto.codigo) return
    const desde = inicioDoDiaSP()
    const [ret, ass, est, ven] = await Promise.all([
      supabase.from('retiradas').select('id, suprimento, atleta_id, atleta_nome, criado_em, origem').eq('totem_code', ponto.codigo).gte('criado_em', desde).neq('origem', 'demo').order('criado_em', { ascending: false }),
      supabase.from('assinantes').select('id', { count: 'exact', head: true }).gte('criado_em', desde),
      supabase.from('estoque_ponto').select('suprimento, quantidade, capacidade').eq('totem_code', ponto.codigo),
      supabase.from('vendas').select('id, criado_em, itens, total, forma_pagamento, estornada_em, motivo_estorno').eq('totem_code', ponto.codigo).gte('criado_em', desde).order('criado_em', { ascending: false }),
    ])
    const r = ret.data || []
    setDados({
      retiradas: r,
      atletas: new Set(r.map((x) => x.atleta_id)).size,
      assinaturas: ass.count || 0,
      vendas: ven.data || [],
      validas: (ven.data || []).filter((v) => !v.estornada_em),
    })
    const e = {}
    for (const row of est.data || []) e[row.suprimento] = row
    setEstoque(e)
  }, [ponto.codigo])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { const t = setInterval(carregar, 30000); return () => clearInterval(t) }, [carregar])

  async function consumir(s) {
    setConsumindo(s)
    const { data, error } = await supabase.rpc('registrar_consumo_equipe', { p_totem_code: ponto.codigo, p_suprimento: s })
    setConsumindo(null)
    if (error) return toast(mensagemErro(error), 'err')
    const r = Array.isArray(data) ? data[0] : data
    toast(`${suprimento(s).label} registrado no seu consumo${r?.creditos_restantes >= 9999 ? '' : ` · restam ${r?.creditos_restantes} créditos`}`, 'ok')
    recarregarPerfil(); carregar()
  }

  async function registrarPerda() {
    const qtd = parseInt(perda.qtd, 10)
    if (!perda.item || !(qtd > 0) || perda.motivo.trim().length < 3) return
    setSalvandoPerda(true)
    const { error } = await supabase.rpc('ajustar_estoque', { p_totem_code: ponto.codigo, p_suprimento: perda.item, p_quantidade: qtd, p_tipo: 'perda', p_capacidade: null, p_obs: perda.motivo.trim() })
    setSalvandoPerda(false)
    if (error) return toast(mensagemErro(error), 'err')
    toast(`Baixa registrada: ${qtd} ${suprimento(perda.item).label}`, 'ok'); setPerda(null); carregar()
  }


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
            <div className="kpi"><span className="num">{brl(dados.validas.reduce((a, v) => a + Number(v.total), 0)).replace(',00', '')}</span><span className="tiny muted">vendas avulsas</span></div>
            {ehAdmin
              ? <div className="kpi"><span className="num">{dados.assinaturas}</span><span className="tiny muted">assinaturas no site hoje</span></div>
              : <div className="kpi"><span className="num">{Object.values(estoque).reduce((a, e) => a + (e?.quantidade || 0), 0)}</span><span className="tiny muted">itens no estoque</span></div>}
          </div>
        )}

        <section className="card stack" style={{ gap: 10, background: '#121212', color: '#FFFFFF', border: 0 }} aria-label="Venda avulsa">
          <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}>
            <strong style={{ fontSize: 17 }}>Venda avulsa</strong>
            {dados && <span className="small" style={{ color: '#CFCFCF' }}>{dados.validas.length ? `${brl(dados.validas.reduce((a, v) => a + Number(v.total), 0))} hoje · ${dados.validas.length}` : 'nenhuma hoje'}</span>}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/equipe/vender" className="btn btn-primary grow" style={{ textDecoration: 'none' }}><Icon name="plus" size={18} />Nova venda</Link>
            {dados?.vendas?.length > 0 && <button type="button" className="btn" style={{ background: '#2A2A2A', color: '#FFFFFF', flexShrink: 0 }} onClick={() => setVerVendas(true)}>Vendido hoje</button>}
          </div>
          {dados?.validas?.slice(0, 2).map((v) => (
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
              <div className="small muted">Pegou algo para você? Toque no item. Baixa do estoque e {conta.ilimitado ? 'não gasta crédito (admin, até 10 por dia)' : `usa créditos conforme o item (${perfil.creditos} restantes)`}.</div>
            </div>
          </div>
          <div className="supply-grid compacto">
            {(ponto.ponto?.suprimentos || []).map((s) => (
              <button key={s} type="button" className="supply" disabled={!!consumindo || (!conta.ilimitado && perfil.creditos < suprimento(s).peso)} onClick={() => consumir(s)}>
                <Icon name={suprimento(s).icon} size={18} /><span>{consumindo === s ? '…' : suprimento(s).label}</span>
                <span className="tiny" style={{ fontWeight: 700, opacity: 0.7 }}>{rotuloCreditos(suprimento(s).peso)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="stack" aria-label="Estoque do ponto">
          <div className="row between">
            <span className="label-caps" style={{ whiteSpace: 'nowrap' }}>Estoque do ponto</span>
            {!perda && <button className="btn-link" style={{ whiteSpace: 'nowrap', fontSize: 14 }} onClick={() => setPerda({ item: (ponto.ponto?.suprimentos || [])[0], qtd: '1', motivo: '' })} disabled={!ponto.ponto}>Algo estragou?</button>}
          </div>
          {perda && (
            <div className="card stack" style={{ gap: 12 }}>
              <strong>Dar baixa (estragou, caiu, venceu)</strong>
              <div className="chips" role="group" aria-label="Item" style={{ flexWrap: 'wrap', margin: 0, padding: 0 }}>
                {(ponto.ponto?.suprimentos || []).map((s) => <button key={s} type="button" className="chip" aria-pressed={perda.item === s} onClick={() => setPerda((p) => ({ ...p, item: s }))}>{suprimento(s).label}</button>)}
              </div>
              <div className="row" style={{ gap: 10 }}>
                <div className="field" style={{ width: 90 }}><label htmlFor="pd-q">Quantos</label>
                  <input id="pd-q" className="input" inputMode="numeric" value={perda.qtd} onChange={(e) => setPerda((p) => ({ ...p, qtd: e.target.value.replace(/\D/g, '').slice(0, 3) }))} /></div>
                <div className="field grow"><label htmlFor="pd-m">O que aconteceu?</label>
                  <input id="pd-m" className="input" placeholder="Ex.: sachê rasgou" value={perda.motivo} onChange={(e) => setPerda((p) => ({ ...p, motivo: e.target.value }))} /></div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-ghost grow" onClick={() => setPerda(null)}>Cancelar</button>
                <button className="btn btn-primary grow" disabled={salvandoPerda || !(parseInt(perda.qtd, 10) > 0) || perda.motivo.trim().length < 3} onClick={registrarPerda}>{salvandoPerda ? 'Salvando…' : 'Salvar baixa'}</button>
              </div>
            </div>
          )}
          {(ponto.ponto?.suprimentos || []).map((s) => {
            const e = estoque[s]
            const pct = e && e.capacidade > 0 ? Math.round((e.quantidade / e.capacidade) * 100) : null
            const baixo = e && (e.quantidade <= 5 || (pct != null && pct <= 25))
            return (
              <div key={s} className="row between small" style={{ gap: 10, padding: '2px 0' }}>
                <span style={{ fontWeight: 700 }}>{suprimento(s).label}</span>
                <span style={{ color: baixo ? 'var(--warn)' : 'var(--text)', fontWeight: 800 }}>
                  {e ? `${e.quantidade}${baixo ? ' · acabando' : ''}` : 'sem controle'}
                </span>
              </div>
            )
          })}
          <span className="tiny muted">A contagem completa é feita em "Fechar o dia". Entradas de produto são lançadas pela gestão.</span>
        </section>

        <ListaEntregas retiradas={dados?.retiradas} filtro={filtroEnt} setFiltro={(f) => { setFiltroEnt(f); setPagEnt(1) }} pagina={pagEnt} setPagina={setPagEnt} />

        <Link to="/equipe/fechar" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}><Icon name="check" size={18} />Fechar o dia (contagem e caixa)</Link>
        <Link to="/equipe" className="btn btn-primary btn-block btn-lg"><Icon name="scan" />Voltar a escanear</Link>
      </main>
      {verVendas && dados && <VendidoHoje vendas={dados.vendas} onFechar={fecharVendas} onEstornado={(t) => { toast(`Venda de ${brl(t)} estornada. Os itens voltaram ao estoque.`, 'ok'); carregar() }} />}
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

/** Folha "Vendido hoje": total por item, por forma de pagamento e cada venda do dia. */
const VENDAS_POR_PAGINA = 8
const MOTIVOS = ['Registrei errado', 'Cliente desistiu', 'Pagamento não caiu']
function VendidoHoje({ vendas, onFechar, onEstornado }) {
  const [pag, setPag] = useState(1)
  const [estornando, setEstornando] = useState(null) // { id, motivo }
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fecharEstorno = useCallback(() => setEstornando(null), [])
  const validas = vendas.filter((v) => !v.estornada_em)
  const paginas = Math.max(1, Math.ceil(vendas.length / VENDAS_POR_PAGINA))
  const visiveis = vendas.slice((pag - 1) * VENDAS_POR_PAGINA, pag * VENDAS_POR_PAGINA)
  const porItem = {}
  for (const v of validas) for (const i of v.itens || []) porItem[i.nome] = (porItem[i.nome] || 0) + Number(i.qtd || 0)
  const porForma = {}
  for (const v of validas) porForma[v.forma_pagamento] = (porForma[v.forma_pagamento] || 0) + Number(v.total || 0)
  const total = validas.reduce((a, v) => a + Number(v.total || 0), 0)
  const resumo = (v) => (v.itens || []).map((i) => `${i.qtd} ${i.nome}`).join(' + ')

  async function estornar() {
    if (!estornando || estornando.motivo.trim().length < 3 || enviando) return
    setEnviando(true); setErro('')
    const { data, error } = await supabase.rpc('estornar_venda', { p_venda_id: estornando.id, p_motivo: estornando.motivo.trim() })
    setEnviando(false)
    if (error) { setErro(mensagemErro(error)); return }
    setEstornando(null); onEstornado(Number(data || 0))
  }

  return (
    <Folha titulo="Vendido hoje" onFechar={onFechar}>
      {validas.length > 0 && (
        <>
          <div className="card stack" style={{ gap: 8 }}>
            {Object.entries(porItem).sort((a, z) => z[1] - a[1]).map(([n, q]) => <div key={n} className="row between"><span>{n}</span><strong>{q}</strong></div>)}
          </div>
          <div className="card stack" style={{ gap: 8 }}>
            {Object.entries(porForma).map(([f, v]) => <div key={f} className="row between small"><span>{NOME_FORMA[f] || f}{f === 'dinheiro' ? ' (na gaveta)' : ''}</span><span>{brl(v)}</span></div>)}
            <div className="row between" style={{ borderTop: '1px solid var(--surface-2)', paddingTop: 8 }}><strong>Total · {validas.length} venda{validas.length > 1 ? 's' : ''}</strong><strong>{brl(total)}</strong></div>
          </div>
        </>
      )}
      <span className="label-caps">Cada venda</span>
      <div className="card stack" style={{ gap: 0, padding: '4px 16px' }}>
        {visiveis.map((v, n) => (
          <div key={v.id} className="stack" style={{ gap: 8, padding: '10px 0', borderTop: n ? '1px solid var(--surface-2)' : 0 }}>
            <div className="row between small" style={{ gap: 10, opacity: v.estornada_em ? 0.55 : 1 }}>
              <span>
                <strong style={{ textDecoration: v.estornada_em ? 'line-through' : 'none' }}>{resumo(v)}</strong><br />
                <span className="muted">{NOME_FORMA[v.forma_pagamento]} · {fmtHora(v.criado_em)}{v.estornada_em ? ` · estornada (${v.motivo_estorno})` : ''}</span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <strong style={{ textDecoration: v.estornada_em ? 'line-through' : 'none' }}>{brl(v.total)}</strong>
                {!v.estornada_em && <><br /><button type="button" className="btn-link" style={{ minHeight: 0, padding: 0, fontSize: 12 }} onClick={() => { setErro(''); setEstornando({ id: v.id, motivo: '', v }) }}>Estornar</button></>}
              </span>
            </div>
          </div>
        ))}
      </div>
      {paginas > 1 && (
        <div className="row between" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pag <= 1} onClick={() => setPag(pag - 1)} aria-label="Página anterior"><Icon name="back" size={16} />Anterior</button>
          <span className="small muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{(pag - 1) * VENDAS_POR_PAGINA + 1}–{Math.min(pag * VENDAS_POR_PAGINA, vendas.length)} de {vendas.length}</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pag >= paginas} onClick={() => setPag(pag + 1)} aria-label="Próxima página">Próxima<Icon name="chevron" size={16} /></button>
        </div>
      )}
      {estornando && (
        <Folha titulo="Estornar venda" onFechar={fecharEstorno} largura={400}>
          <div className="card stack" style={{ gap: 4 }}>
            <strong>{resumo(estornando.v)} · {brl(estornando.v.total)}</strong>
            <span className="small muted">{NOME_FORMA[estornando.v.forma_pagamento]} · {fmtHora(estornando.v.criado_em)}</span>
          </div>
          <span className="small" style={{ color: 'var(--text-2)' }}>O valor sai do caixa do dia e os itens voltam ao estoque. A venda fica no histórico como estornada.</span>
          <span className="label-caps">Motivo</span>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {MOTIVOS.map((m) => <button key={m} type="button" className="chip" aria-pressed={estornando.motivo === m} onClick={() => setEstornando((e) => ({ ...e, motivo: m }))}>{m}</button>)}
          </div>
          <input className="input" aria-label="Motivo do estorno" placeholder="Ou escreva o motivo" value={MOTIVOS.includes(estornando.motivo) ? '' : estornando.motivo} onChange={(e) => setEstornando((x) => ({ ...x, motivo: e.target.value }))} />
          {erro && <div className="alert err small" role="alert">{erro}</div>}
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost grow" onClick={fecharEstorno}>Voltar</button>
            <button type="button" className="btn grow" style={{ background: 'var(--err)', color: '#fff' }} disabled={enviando || estornando.motivo.trim().length < 3} onClick={estornar}>{enviando ? 'Estornando…' : 'Confirmar estorno'}</button>
          </div>
        </Folha>
      )}
    </Folha>
  )
}
