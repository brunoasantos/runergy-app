import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fmtData, fmtMes } from '../lib/format'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

const ETAPAS = [['preparando', 'Preparando'], ['postado', 'Postado'], ['entregue', 'Entregue']]
const NOME_PLANO = { starter: 'Starter', runner: 'Runner', hero: 'Hero', kit: 'Kit em casa' }

/** Carrega os envios de kit da pessoa logada (mais recente primeiro). */
export function useMeusEnvios() {
  const [envios, setEnvios] = useState(null)
  useEffect(() => {
    supabase.rpc('meus_envios').then(({ data }) => setEnvios(data || []))
  }, [])
  return envios
}

/** Linha do tempo de um envio: Preparando → Postado → Entregue. */
export function EtapasKit({ status }) {
  const i = ETAPAS.findIndex(([k]) => k === status)
  return (
    <ol className="row" style={{ listStyle: 'none', padding: 0, margin: 0, gap: 6 }} aria-label={`Situação: ${ETAPAS[i]?.[1] || status}`}>
      {ETAPAS.map(([k, l], n) => (
        <li key={k} className="grow stack" style={{ gap: 6 }}>
          <span style={{ height: 6, borderRadius: 999, background: n <= i ? 'var(--orange)' : 'var(--surface-2)' }} />
          <span className="tiny" style={{ fontWeight: n === i ? 800 : 600, color: n <= i ? 'var(--text)' : 'var(--text-2)' }}>{l}</span>
        </li>
      ))}
    </ol>
  )
}

function textoEtapa(e) {
  if (e.status === 'entregue') return `Entregue em ${fmtData(e.entregue_em)}. Bons treinos!`
  if (e.status === 'postado') return `Postado em ${fmtData(e.postado_em)}. Acompanhe pelo código de rastreio abaixo.`
  if (e.tipo === 'brinde') return 'Estamos separando seu brinde.'
  return 'Estamos separando seu kit. Assim que for postado, o código de rastreio aparece aqui.'
}
const tituloEnvio = (e) => (e.tipo === 'brinde' ? 'Seu brinde Runergy' : `Kit de ${fmtMes(e.competencia + 'T12:00:00')}`)

function Rastreio({ codigo }) {
  const [copiado, setCopiado] = useState(false)
  if (!codigo) return null
  async function copiar() {
    try { await navigator.clipboard.writeText(codigo); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch (e) {}
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row between" style={{ gap: 10, background: 'var(--surface-2)', borderRadius: 14, padding: '10px 14px' }}>
        <span className="small muted">Rastreio</span>
        <strong style={{ letterSpacing: '0.06em' }}>{codigo}</strong>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-ghost grow" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar código'}</button>
        <a className="btn btn-primary grow" href="https://rastreamento.correios.com.br/app/index.php" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>Acompanhar</a>
      </div>
    </div>
  )
}

/** Meu kit: o kit do mês (Kit em casa) ou o brinde do plano (etapas + rastreio), endereço de entrega e anteriores. */
export default function MeuKit() {
  const { perfil, conta } = useAuth()
  const brindes = !conta.kitEmCasa && ['runner', 'hero'].includes(perfil.plano)
  const envios = useMeusEnvios()
  const atual = envios?.[0]
  const anteriores = envios?.slice(1) || []
  return (
    <>
      <main className="screen has-nav" style={{ gap: 14 }}>
        <PageHeader titulo={atual ? (atual.tipo === 'brinde' ? 'Meus brindes' : 'Meu kit') : brindes ? 'Meus brindes' : 'Meu kit'} voltar={-1} />

        {envios === null && <div className="skeleton" style={{ height: 180 }} />}

        {envios?.length === 0 && (
          <section className="card stack" style={{ gap: 10 }}>
            <strong>{brindes ? 'Nenhum brinde por aqui ainda' : 'Nenhum kit por aqui ainda'}</strong>
            <span className="small" style={{ color: 'var(--text-2)' }}>
              {conta.kitEmCasa
                ? 'Assim que o pagamento do mês for confirmado, seu kit aparece aqui.'
                : brindes
                  ? `${perfil.plano === 'hero' ? 'Seu boné e sua camiseta Runergy aparecem' : 'Seu boné Runergy aparece'} aqui a partir da 2ª mensalidade.`
                  : 'Com o Kit em casa, carbo gel, isotônico e pré-treino chegam na sua porta todo mês.'}
            </span>
            {!conta.kitEmCasa && !brindes && <Link to="/planos" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>Ver planos</Link>}
          </section>
        )}

        {atual && (
          <section className="card stack" style={{ gap: 14 }} aria-label="Kit do mês">
            <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}>
              <strong style={{ fontSize: 18 }}>{tituloEnvio(atual)}</strong>
              <span className="pill brand">{NOME_PLANO[atual.plano] || atual.plano}</span>
            </div>
            <EtapasKit status={atual.status} />
            <span className="small" style={{ color: 'var(--text-2)' }}>{textoEtapa(atual)}</span>
            {['postado', 'entregue'].includes(atual.status) && <Rastreio codigo={atual.rastreio} />}
            <div style={{ height: 1, background: 'var(--surface-2)' }} />
            <div className="stack" style={{ gap: 6 }}>
              <span className="label-caps">{atual.tipo === 'brinde' ? 'Brinde' : 'No kit'}</span>
              {(atual.itens || '').split(' · ').filter(Boolean).map((i) => (
                <span key={i} className="row small" style={{ gap: 8 }}><span style={{ color: 'var(--orange)', display: 'inline-flex' }}><Icon name="check" size={16} /></span>{i}</span>
              ))}
              {atual.brindes && atual.brindes.split(' · ').map((b) => (
                <span key={b} className="row small" style={{ gap: 8, fontWeight: 700 }}><span style={{ color: 'var(--orange)', display: 'inline-flex' }}><Icon name={atual.tipo === 'brinde' ? 'check' : 'plus'} size={16} /></span>{b}{atual.tipo === 'brinde' ? '' : ' (brinde)'}</span>
              ))}
            </div>
            <div className="stack" style={{ gap: 4 }}>
              <span className="label-caps">{atual.tipo === 'brinde' && !atual.endereco ? 'Entrega' : 'Entrega em'}</span>
              {atual.endereco
                ? <span className="small">{[atual.endereco, atual.numero].filter(Boolean).join(', ')}{atual.complemento ? ` · ${atual.complemento}` : ''}<br />{[atual.cidade, atual.estado].filter(Boolean).join(' · ')}{atual.cep ? ` · CEP ${atual.cep}` : ''}</span>
                : atual.tipo === 'brinde'
                  ? <span className="small" style={{ color: 'var(--text-2)' }}>A equipe Runergy combina a entrega com você pelo WhatsApp (ou retire num ponto Runergy).</span>
                  : <span className="small" style={{ color: 'var(--err)' }}>Endereço não cadastrado. Fale com a gente para receber o kit.</span>}
              {atual.status === 'preparando' && atual.endereco && <span className="tiny muted">Endereço errado? Fale com a Runergy antes da postagem.</span>}
            </div>
          </section>
        )}

        {anteriores.length > 0 && (
          <section className="stack" style={{ gap: 8 }} aria-label="Kits anteriores">
            <span className="label-caps">{brindes ? 'Anteriores' : 'Kits anteriores'}</span>
            {anteriores.map((e) => (
              <div key={e.id} className="card tight row between" style={{ gap: 10 }}>
                <span className="small"><strong style={{ textTransform: 'capitalize' }}>{fmtMes(e.competencia + 'T12:00:00')}</strong> · {e.tipo === 'brinde' ? 'Brinde' : NOME_PLANO[e.plano] || e.plano}</span>
                <span className={`pill ${e.status === 'entregue' ? 'ok' : 'neutral'}`}>{ETAPAS.find(([k]) => k === e.status)?.[1]}</span>
              </div>
            ))}
          </section>
        )}
      </main>
      <BottomNav />
    </>
  )
}
