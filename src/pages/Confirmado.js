import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { suprimento, fmtHora } from '../lib/format'
import Icon from '../components/Icon'

export default function Confirmado() {
  const { id } = useParams()
  const { perfil, conta } = useAuth()
  const [r, setR] = useState(null)
  const [itens, setItens] = useState(null)

  // Uma leitura do QR pode ter vários itens: todos gravados juntos (mesma pessoa e mesmo horário)
  useEffect(() => {
    let vivo = true
    supabase.from('retiradas').select('suprimento, totem_nome, criado_em, atleta_id, creditos').eq('id', id).maybeSingle().then(async ({ data }) => {
      if (!vivo) return
      setR(data)
      if (!data) return
      const { data: todas } = await supabase.from('retiradas').select('suprimento, creditos')
        .eq('atleta_id', data.atleta_id).eq('criado_em', data.criado_em)
      if (vivo) setItens(todas && todas.length ? todas : [data])
    })
    try { navigator.vibrate?.([60, 40, 60]) } catch (e) {}
    return () => { vivo = false }
  }, [id])

  // Junta iguais: "Água ×2"
  const linhas = []
  ;(itens || []).forEach((i) => {
    const l = linhas.find((x) => x.suprimento === i.suprimento)
    if (l) l.qtd += 1; else linhas.push({ suprimento: i.suprimento, qtd: 1 })
  })
  const total = (itens || []).reduce((a, i) => a + (i.creditos || 0), 0)
  const varios = (itens || []).length > 1

  return (
    <main className="screen confirm-screen" style={{ minHeight: '100dvh', position: 'relative', overflow: 'hidden', paddingTop: 'calc(var(--safe-top) + 56px)' }}>
      <div aria-hidden="true" style={{ position: 'absolute', left: -60, bottom: 100, width: 520, height: 420, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: 80, top: 0, width: 60, height: 420, background: '#121212', transform: 'skewX(-28deg)', opacity: 0.08 }} />
        <div style={{ position: 'absolute', left: 190, top: 0, width: 24, height: 420, background: '#121212', transform: 'skewX(-28deg)', opacity: 0.08 }} />
      </div>

      <div style={{ width: 84, height: 84, borderRadius: 999, background: '#121212', color: '#FF5A00', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Icon name="check" size={42} stroke={2.6} />
      </div>
      <h1 className="display" style={{ fontSize: 'clamp(40px, 13vw, 52px)', position: 'relative' }}>Pegou.<br />Agora<br />corre.</h1>

      <section className="card-dark stack" style={{ gap: 12, position: 'relative' }} aria-label="Detalhes da retirada">
        {itens === null
          ? <div className="row between small"><span style={{ color: '#B5B5B5' }}>Item</span><strong>…</strong></div>
          : linhas.map((l, n) => (
            <div key={l.suprimento} className="row between small">
              <span style={{ color: '#B5B5B5' }}>{linhas.length > 1 ? (n === 0 ? 'Itens' : '') : 'Item'}</span>
              <strong>{suprimento(l.suprimento).label}{l.qtd > 1 ? ` ×${l.qtd}` : ''}</strong>
            </div>
          ))}
        <div className="row between small" style={{ gap: 16 }}><span style={{ color: '#B5B5B5' }}>Ponto</span><strong style={{ textAlign: 'right' }}>{r?.totem_nome || '…'}</strong></div>
        <div className="row between small"><span style={{ color: '#B5B5B5' }}>Horário</span><strong>{r ? fmtHora(r.criado_em) : '…'}</strong></div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
        {varios && !conta.ilimitado && total > 0 && (
          <div className="row between small"><span style={{ color: '#B5B5B5' }}>Créditos usados</span><strong>{total}</strong></div>
        )}
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <span className="small" style={{ color: '#B5B5B5' }}>Créditos restantes</span>
          <span className="num" style={{ fontSize: 30, color: '#FF7A33' }}>{conta.ilimitado ? '∞' : perfil.creditos}</span>
        </div>
      </section>

      <div className="stack" style={{ marginTop: 'auto', gap: 12, position: 'relative', paddingBottom: 'var(--safe-bottom)' }}>
        <Link to="/" className="btn btn-block btn-lg" style={{ background: '#121212', color: '#FFFFFF' }}>Voltar ao início</Link>
        <span style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '0.3em' }}>KEEP YOUR PACE.</span>
      </div>
    </main>
  )
}
