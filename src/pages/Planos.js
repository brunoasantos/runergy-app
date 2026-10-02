import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { brl, fmtData, mensagemErro } from '../lib/format'
import { UFS, mascaraTel, mascaraCep, buscarCep } from '../lib/cadastro'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'

// Mesmos planos e benefícios do site (runergy-site/src/lib/planos.js)
const PLANOS = [
  { id: 'starter', nome: 'Starter', preco: 59.9, resumo: 'Kit em casa todo mês', itens: ['6 sachês de carbo gel', '2 isotônicos', '2 pré-treinos em pó', 'Entrega mensal na sua porta'] },
  { id: 'runner', nome: 'Runner', preco: 89.9, resumo: 'Kit em casa + 10 créditos para experimentar os pontos', qr: true, itens: ['Tudo do plano Starter', 'QR nos pontos: 10 créditos por mês', 'Camiseta, boné e meia Runergy (enviados uma vez, a partir da 2ª mensalidade)', 'Frete grátis'] },
  { id: 'hero', nome: 'Hero', preco: 129.9, resumo: 'R$ 90 em produtos nos pontos todo mês · o que sobra acumula', qr: true, selo: 'Mais vantajoso', itens: ['Tudo do plano Runner', 'QR nos pontos: 30 créditos por mês', 'Créditos que sobram passam para o mês seguinte (até 30)', 'Óculos Baixa Pace (enviado uma vez, a partir da 2ª mensalidade)', 'Suporte VIP', 'Frete grátis'] },
]

/** Assinar pelo app: escolhe o plano, confere o endereço do kit e segue para o pagamento no Mercado Pago. */
export default function Planos() {
  const { perfil, conta, recarregarPerfil } = useAuth()
  const atual = conta.tipo === 'cliente' ? perfil.plano : null
  const [escolha, setEscolha] = useState(['starter', 'runner', 'hero'].includes(atual) ? atual : 'hero')
  // Quem já assina pelo Mercado Pago troca de plano na mesma assinatura (sem segunda cobrança)
  const [ass, setAss] = useState(undefined)
  const carregarAss = () => supabase.rpc('minha_assinatura_v2').then(({ data }) => setAss((data || [])[0] || null))
  useEffect(() => { carregarAss() }, []) // eslint-disable-line
  const modoTroca = !!(ass && ass.status === 'ativo' && ass.pelo_mp)
  const [f, setF] = useState({ telefone: '', cep: '', cidade: '', estado: '', endereco: '', numero: '', complemento: '' })
  const [carregado, setCarregado] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [avisoCep, setAvisoCep] = useState('')
  const numRef = useRef(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const plano = PLANOS.find((p) => p.id === escolha)

  useEffect(() => {
    supabase.from('contatos').select('telefone, cep, cidade, estado, endereco, numero, complemento').maybeSingle()
      .then(({ data }) => {
        if (data) setF((x) => ({ ...x, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v || ''])), telefone: mascaraTel(data.telefone || ''), cep: mascaraCep(data.cep || '') }))
        setCarregado(true)
      })
  }, [])

  // CEP completo → preenche cidade, UF e endereço (rua - bairro) e leva o cursor para o número
  async function completarPeloCep(m, sobrescrever = true) {
    setBuscando(true); setAvisoCep('')
    const r = await buscarCep(m)
    setBuscando(false)
    if (!r) { setAvisoCep('Não encontramos esse CEP. Confira os números ou preencha o endereço.'); return }
    setF((x) => ({ ...x, cidade: r.cidade || x.cidade, estado: r.estado || x.estado,
      endereco: r.endereco && (sobrescrever || !x.endereco) ? r.endereco : x.endereco }))
    if (!r.temRua) setAvisoCep('Esse CEP é da cidade toda: digite a rua e o bairro.')
    else setTimeout(() => numRef.current?.focus(), 50)
  }
  function cep(v) {
    const m = mascaraCep(v); set('cep', m)
    if (m.replace(/\D/g, '').length === 8) completarPeloCep(m)
  }
  // Cadastro antigo com CEP mas sem endereço: completa sozinho ao abrir
  useEffect(() => {
    if (carregado && f.cep.replace(/\D/g, '').length === 8 && (!f.endereco || !f.cidade)) completarPeloCep(f.cep, false)
    // só ao terminar de carregar o cadastro
  }, [carregado]) // eslint-disable-line

  const completo = f.telefone.replace(/\D/g, '').length >= 10 && f.cep.replace(/\D/g, '').length === 8 && f.cidade.trim() && f.estado && f.endereco.trim() && f.numero.trim()

  async function assinar(e) {
    e.preventDefault()
    if (!completo || enviando || escolha === atual) return
    setEnviando(true); setErro('')
    const dados = { nome: perfil.nome, ...f }
    const r1 = await supabase.rpc('salvar_meu_cadastro', { p: dados })
    if (r1.error) { setErro(mensagemErro(r1.error)); setEnviando(false); return }
    // Cria a assinatura no Mercado Pago (Edge Function mp-checkout) e abre o link de pagamento
    const { data, error } = await supabase.functions.invoke('mp-checkout', { body: {
      plano: plano.id, email: perfil.email, nome: perfil.nome, telefone: f.telefone, cep: f.cep, cidade: f.cidade.trim(), estado: f.estado,
      endereco: f.endereco.trim(), numero: f.numero.trim(), complemento: f.complemento.trim(), origem: 'app',
    } })
    if (error || !data?.link) { setErro('Não foi possível abrir o pagamento agora. Tente de novo em instantes.'); setEnviando(false); return }
    window.location.href = data.link
  }

  return (
    <>
      <main className="screen has-nav" style={{ gap: 14 }}>
        <PageHeader titulo="Escolha seu plano" voltar={-1} />
        {conta.tipo !== 'cliente' && <div className="alert ok small">Você já tem QR nos pontos como <strong>{conta.rotulo}</strong>. Os planos abaixo são para receber o kit em casa.</div>}

        <div className="stack" role="radiogroup" aria-label="Planos" style={{ gap: 10 }}>
          {PLANOS.map((p) => {
            const on = escolha === p.id
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} className={`card tight plano-op${on ? ' sel' : ''}`} onClick={() => setEscolha(p.id)}>
                <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}>
                  <strong style={{ fontSize: 17 }}>{p.nome}{p.qr && <span className="pill brand" style={{ marginLeft: 8 }}>QR nos pontos</span>}{p.selo && <span className="pill neutral" style={{ marginLeft: 6 }}>{p.selo}</span>}</strong>
                  <strong style={{ whiteSpace: 'nowrap' }}>{brl(p.preco)}<span className="tiny" style={{ fontWeight: 600 }}>/mês</span></strong>
                </div>
                <span className="small" style={{ color: 'var(--text-2)' }}>{atual === p.id ? 'Seu plano atual' : modoTroca && ass.plano_agendado === p.id ? `Muda para este plano em ${fmtData(ass.troca_em)}` : p.resumo}</span>
                {on && <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7, color: 'var(--text-2)' }}>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>}
              </button>
            )
          })}
        </div>

        {ass === undefined && <div className="skeleton" style={{ height: 120 }} />}
        {modoTroca && <TrocaPlano ass={ass} escolha={escolha} plano={plano} atual={ass.plano} aoTrocar={async () => { await carregarAss(); await recarregarPerfil?.() }} />}
        {ass !== undefined && !modoTroca && <form className="card stack" style={{ gap: 12 }} onSubmit={assinar} noValidate>
          <div className="stack" style={{ gap: 2 }}>
            <strong>Entrega do kit</strong>
            <span className="small" style={{ color: 'var(--text-2)' }}>{carregado && completo ? 'Confira o endereço. Ele fica salvo no seu cadastro.' : 'Preencha uma vez e ele fica salvo no seu cadastro.'}</span>
          </div>
          <div className="field"><label htmlFor="pl-tel">WhatsApp</label>
            <input id="pl-tel" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={f.telefone} onChange={(e) => set('telefone', mascaraTel(e.target.value))} /></div>
          <div className="form-duas">
            <div className="field"><label htmlFor="pl-cep">CEP{buscando ? ' · buscando…' : ''}</label>
              <input id="pl-cep" className="input" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={f.cep} onChange={(e) => cep(e.target.value)} /></div>
            <div className="field"><label htmlFor="pl-uf">UF</label>
              <select id="pl-uf" className="input" value={f.estado} onChange={(e) => set('estado', e.target.value)}>
                <option value="">UF</option>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select></div>
          </div>
          {avisoCep && <span className="small" style={{ color: 'var(--accent-text)', marginTop: -4 }}>{avisoCep}</span>}
          <div className="field"><label htmlFor="pl-cid">Cidade</label>
            <input id="pl-cid" className="input" autoComplete="address-level2" value={f.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
          <div className="field"><label htmlFor="pl-end">Endereço</label>
            <input id="pl-end" className="input" autoComplete="address-line1" placeholder="Rua, avenida…" value={f.endereco} onChange={(e) => set('endereco', e.target.value)} /></div>
          <div className="form-duas">
            <div className="field"><label htmlFor="pl-num">Número</label>
              <input id="pl-num" ref={numRef} className="input" inputMode="numeric" value={f.numero} onChange={(e) => set('numero', e.target.value)} /></div>
            <div className="field"><label htmlFor="pl-comp">Complemento</label>
              <input id="pl-comp" className="input" autoComplete="address-line2" placeholder="Apto, bloco…" value={f.complemento} onChange={(e) => set('complemento', e.target.value)} /></div>
          </div>
          {erro && <div className="alert err" role="alert">{erro}</div>}
          <button className="btn btn-primary btn-block btn-lg" disabled={!completo || enviando || escolha === atual}>
            {enviando ? 'Abrindo pagamento…' : escolha === atual ? 'Esse é o seu plano' : `Assinar ${plano.nome}`}
          </button>
          <span className="tiny muted" style={{ textAlign: 'center' }}>Pagamento seguro no Mercado Pago. O plano libera assim que o pagamento é confirmado.</span>
        </form>}
      </main>
      <BottomNav />
    </>
  )
}

/** Troca de plano para quem já assina: simula (upgrade/downgrade) e confirma na mesma assinatura do Mercado Pago. */
function TrocaPlano({ ass, escolha, plano, atual, aoTrocar }) {
  const [sim, setSim] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [feito, setFeito] = useState(null)
  const agendado = ass.plano_agendado
  const mesmo = escolha === atual

  useEffect(() => {
    setSim(null); setErro(''); setFeito(null)
    if (mesmo && !agendado) return
    let vivo = true
    supabase.functions.invoke('mp-trocar-plano', { body: { plano: escolha, simular: true } }).then(({ data, error }) => {
      if (!vivo) return
      if (error || !data?.ok) setErro('Não foi possível calcular a troca agora. Tente de novo em instantes.')
      else setSim(data)
    })
    return () => { vivo = false }
  }, [escolha, atual, agendado]) // eslint-disable-line

  async function confirmar() {
    if (!sim || enviando) return
    setEnviando(true); setErro('')
    const { data, error } = await supabase.functions.invoke('mp-trocar-plano', { body: { plano: escolha } })
    setEnviando(false)
    if (error || !data?.ok) { setErro('Não foi possível trocar agora. Nada foi alterado; tente de novo em instantes.'); return }
    setFeito(data); await aoTrocar()
  }

  if (feito) {
    return (
      <section className="card stack" style={{ gap: 8 }}>
        <strong>{feito.tipo === 'upgrade' ? `Pronto! Você agora é ${feito.plano_nome}.` : feito.tipo === 'downgrade' ? `Troca agendada para ${fmtData(feito.a_partir_de)}.` : 'Agendamento desfeito.'}</strong>
        <span className="small" style={{ color: 'var(--text-2)' }}>
          {feito.tipo === 'upgrade' && `${feito.creditos_extra > 0 ? `${feito.creditos_extra} créditos entraram agora. ` : ''}O novo valor (${brl(feito.preco)}/mês) vale a partir da próxima cobrança, em ${fmtData(feito.a_partir_de)}.`}
          {feito.tipo === 'downgrade' && `Até lá você continua com tudo do seu plano atual. Depois passa a pagar ${brl(feito.preco)}/mês.`}
          {feito.tipo === 'desfazer' && 'Você continua no seu plano atual, sem mudança na cobrança.'}
        </span>
      </section>
    )
  }

  return (
    <section className="card stack" style={{ gap: 10 }}>
      <strong>Trocar de plano</strong>
      {agendado && <div className="alert warn small">Mudança para <strong>{agendado.charAt(0).toUpperCase() + agendado.slice(1)}</strong> agendada para {fmtData(ass.troca_em)}.</div>}
      {mesmo && !agendado && <span className="small" style={{ color: 'var(--text-2)' }}>Este é o seu plano atual. Escolha outro acima para subir ou descer de plano.</span>}
      {!mesmo || agendado ? (
        <>
          {!sim && !erro && <div className="skeleton" style={{ height: 48 }} />}
          {sim && (
            <span className="small" style={{ color: 'var(--text-2)' }}>
              {sim.tipo === 'upgrade' && <>Vale <strong>agora</strong>. {sim.creditos_extra > 0 ? <>Você ganha <strong>{sim.creditos_extra} créditos</strong> hoje (proporcional aos dias até o dia 1º). </> : null}Passa a pagar <strong>{brl(sim.preco)}/mês</strong> a partir de {fmtData(sim.a_partir_de)}.</>}
              {sim.tipo === 'downgrade' && <>Vale a partir de <strong>{fmtData(sim.a_partir_de)}</strong> (próxima cobrança). Até lá você continua com tudo do plano atual. Depois passa a pagar <strong>{brl(sim.preco)}/mês</strong>.</>}
              {sim.tipo === 'desfazer' && <>Cancelar a mudança agendada e continuar no plano atual.</>}
            </span>
          )}
          {erro && <div className="alert err" role="alert">{erro}</div>}
          <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!sim || enviando} onClick={confirmar}>
            {enviando ? 'Trocando…' : !sim ? 'Calculando…' : sim.tipo === 'upgrade' ? `Subir para ${plano.nome}` : sim.tipo === 'downgrade' ? `Mudar para ${plano.nome}` : `Manter ${plano.nome}`}
          </button>
          <span className="tiny muted" style={{ textAlign: 'center' }}>A troca é feita na mesma assinatura do Mercado Pago. Sem cobrança extra hoje.</span>
        </>
      ) : null}
    </section>
  )
}
