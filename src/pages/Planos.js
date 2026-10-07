import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { brl, fmtData, mensagemErro } from '../lib/format'
import { UFS, mascaraTel, mascaraCep, buscarCep } from '../lib/cadastro'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'

// Mesmos planos e benefícios do site (runergy-site/src/lib/planos.js). Preço e "ativo" vêm do banco (tabela planos).
const PLANOS_BASE = [
  { id: 'starter', nome: 'Starter', preco: 29.9, creditos: 10, resumo: 'Para quem está começando a correr', qr: true, itens: ['10 créditos por mês nos pontos Runergy', 'QR no app: mostre e pegue sem parar', 'Recarga de créditos quando precisar'] },
  { id: 'runner', nome: 'Runner', preco: 49.9, creditos: 20, resumo: 'Para quem corre toda semana', qr: true, itens: ['20 créditos por mês nos pontos Runergy', 'Boné Runergy de brinde (a partir da 2ª mensalidade)', 'Recarga de créditos quando precisar'] },
  { id: 'hero', nome: 'Hero', preco: 69.9, creditos: 30, resumo: 'R$ 90 em produtos nos pontos todo mês · o que sobra acumula', qr: true, selo: 'Mais vantajoso', itens: ['30 créditos por mês nos pontos Runergy', 'Créditos que sobram passam para o mês seguinte (até 30)', 'Boné e camiseta Runergy de brinde (a partir da 2ª mensalidade)', 'Recarga de créditos quando precisar'] },
  { id: 'kit', nome: 'Kit em casa', preco: 99.9, frete: 50, kit: true, ativo: false, resumo: 'Para quem mora longe dos pontos: o kit chega em casa', itens: ['6 carbo gel, 2 isotônicos e 2 pré-treinos', 'Entrega mensal na sua porta', 'Sem créditos nos pontos'] },
]
const COM_CREDITO = ['starter', 'runner', 'hero']

/** Planos com preço e situação (ativo) do banco; o Kit em casa só aparece quando o admin liga no painel. */
function usePlanos() {
  const [lista, setLista] = useState(PLANOS_BASE.filter((p) => !p.kit))
  useEffect(() => {
    supabase.from('planos').select('id, preco, frete, ativo, creditos_mes').in('id', PLANOS_BASE.map((p) => p.id)).then(({ data }) => {
      if (!data) return
      const m = Object.fromEntries(data.map((r) => [r.id, r]))
      setLista(PLANOS_BASE.map((p) => {
        if (!m[p.id]) return p
        const creditos = m[p.id].creditos_mes ?? p.creditos
        return { ...p, preco: Number(m[p.id].preco), frete: Number(m[p.id].frete || 0), ativo: m[p.id].ativo !== false, creditos,
          itens: p.itens.map((i) => i.replace(/^\d+ créditos por mês/, `${creditos} créditos por mês`)) }
      }))
    })
  }, [])
  return lista
}

/** Assinar pelo app: escolhe o plano e segue para o pagamento no Mercado Pago (só o Kit em casa pede endereço). */
export default function Planos() {
  const { perfil, conta, recarregarPerfil } = useAuth()
  const atual = conta.tipo === 'cliente' ? perfil.plano : null
  // Plano desligado no painel (Ajustes › Planos) não aparece, a não ser que seja o plano atual da pessoa
  const PLANOS = usePlanos().filter((p) => (p.kit ? p.ativo : p.ativo !== false) || p.id === atual)
  const [escolha, setEscolha] = useState([...COM_CREDITO, 'kit'].includes(atual) ? atual : 'hero')
  // Quem já assina pelo Mercado Pago troca de plano na mesma assinatura (sem segunda cobrança)
  const [ass, setAss] = useState(undefined)
  const carregarAss = () => supabase.rpc('minha_assinatura_v2').then(({ data }) => setAss((data || [])[0] || null))
  useEffect(() => { carregarAss() }, []) // eslint-disable-line
  const assinaAtivo = !!(ass && ass.status === 'ativo' && ass.pelo_mp)
  // Troca na mesma assinatura só entre os planos com créditos; Kit em casa ↔ créditos = cancelar e assinar de novo
  const modoTroca = assinaAtivo && COM_CREDITO.includes(ass.plano) && COM_CREDITO.includes(escolha)
  const trocaEntreTipos = assinaAtivo && !modoTroca && escolha !== ass.plano
  const [f, setF] = useState({ telefone: '', cep: '', cidade: '', estado: '', endereco: '', numero: '', complemento: '' })
  const [carregado, setCarregado] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [avisoCep, setAvisoCep] = useState('')
  const numRef = useRef(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [outroMp, setOutroMp] = useState(false)
  const [emailMp, setEmailMp] = useState('')
  const emailMpOk = !outroMp || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailMp.trim())
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const plano = PLANOS.find((p) => p.id === escolha) || PLANOS.find((p) => p.id === 'hero') || PLANOS[0]
  // Escolha apontando para um plano que saiu da lista (desligado no painel): vai para o maior disponível
  const idsLista = PLANOS.map((p) => p.id).join(',')
  useEffect(() => { if (PLANOS.length && !PLANOS.some((p) => p.id === escolha)) setEscolha(PLANOS.filter((p) => !p.kit).slice(-1)[0]?.id || PLANOS[0].id) }, [idsLista]) // eslint-disable-line
  const comEntrega = !!plano?.kit

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
  }, [carregado]) // eslint-disable-line

  const telOk = f.telefone.replace(/\D/g, '').length >= 10
  const enderecoOk = f.cep.replace(/\D/g, '').length === 8 && f.cidade.trim() && f.estado && f.endereco.trim() && f.numero.trim()
  // Endereço é pedido em todos os planos (kit, brindes e promoções)
  const completo = telOk && enderecoOk

  async function assinar(e) {
    e.preventDefault()
    if (!completo || !emailMpOk || enviando || escolha === atual) return
    setEnviando(true); setErro('')
    const dados = { nome: perfil.nome, ...f }
    const r1 = await supabase.rpc('salvar_meu_cadastro', { p: dados })
    if (r1.error) { setErro(mensagemErro(r1.error)); setEnviando(false); return }
    // Cria a assinatura no Mercado Pago (Edge Function mp-checkout) e abre o link de pagamento
    const { data, error } = await supabase.functions.invoke('mp-checkout', { body: {
      plano: plano.id, email: perfil.email, nome: perfil.nome, telefone: f.telefone, origem: 'app',
      cep: f.cep, cidade: f.cidade.trim(), estado: f.estado, endereco: f.endereco.trim(), numero: f.numero.trim(), complemento: f.complemento.trim(),
      email_mp: outroMp ? emailMp.trim().toLowerCase() : undefined,
    } })
    if (error || !data?.link) { setErro('Não foi possível abrir o pagamento agora. Tente de novo em instantes.'); setEnviando(false); return }
    window.location.href = data.link
  }

  const precoTexto = (p) => (p.kit ? <>{brl(p.preco)}<span className="tiny" style={{ fontWeight: 600 }}>/mês + frete</span></> : <>{brl(p.preco)}<span className="tiny" style={{ fontWeight: 600 }}>/mês</span></>)

  return (
    <>
      <main className="screen has-nav" style={{ gap: 14 }}>
        <PageHeader titulo="Escolha seu plano" voltar={-1} />
        {conta.tipo !== 'cliente' && <div className="alert ok small">Você já tem QR nos pontos como <strong>{conta.rotulo}</strong>.</div>}

        <div className="stack" role="radiogroup" aria-label="Planos" style={{ gap: 10 }}>
          {PLANOS.map((p) => {
            const on = escolha === p.id
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} className={`card tight plano-op${on ? ' sel' : ''}`} onClick={() => setEscolha(p.id)}>
                <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}>
                  <strong style={{ fontSize: 17 }}>{p.nome}{p.qr && <span className="pill brand" style={{ marginLeft: 8 }}>{p.creditos} créditos</span>}{p.selo && <span className="pill neutral" style={{ marginLeft: 6 }}>{p.selo}</span>}</strong>
                  <strong style={{ whiteSpace: 'nowrap' }}>{precoTexto(p)}</strong>
                </div>
                <span className="small" style={{ color: 'var(--text-2)' }}>{atual === p.id ? 'Seu plano atual' : modoTroca && ass.plano_agendado === p.id ? `Muda para este plano em ${fmtData(ass.troca_em)}` : p.resumo}</span>
                {on && <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7, color: 'var(--text-2)' }}>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>}
              </button>
            )
          })}
        </div>

        {ass === undefined && <div className="skeleton" style={{ height: 120 }} />}
        {modoTroca && <TrocaPlano ass={ass} escolha={escolha} plano={plano} atual={ass.plano} aoTrocar={async () => { await carregarAss(); await recarregarPerfil?.() }} />}
        {trocaEntreTipos && (
          <section className="card stack" style={{ gap: 8 }}>
            <strong>Trocar entre Kit em casa e plano com créditos</strong>
            <span className="small" style={{ color: 'var(--text-2)' }}>São assinaturas diferentes. Cancele a atual em Perfil (os benefícios continuam até o fim do mês pago) e depois assine o novo plano aqui.</span>
          </section>
        )}
        {ass !== undefined && !assinaAtivo && <form className="card stack" style={{ gap: 12 }} onSubmit={assinar} noValidate>
          <div className="stack" style={{ gap: 2 }}>
            <strong>{comEntrega ? 'Entrega do kit' : 'Seus dados e endereço'}</strong>
            <span className="small" style={{ color: 'var(--text-2)' }}>{carregado && enderecoOk ? 'Confira seus dados. Eles ficam salvos no seu cadastro.' : comEntrega ? 'Preencha uma vez e ele fica salvo no seu cadastro.' : 'Preencha uma vez: fica salvo no seu cadastro para brindes e novidades.'}</span>
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
          {comEntrega && <div className="row between" style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 14px', gap: 10 }}>
            <span className="stack" style={{ gap: 0 }}>
              <strong className="small">Total por mês</strong>
              <span className="tiny" style={{ color: 'var(--text-2)' }}>kit {brl(plano.preco)} + frete {brl(plano.frete)}</span>
            </span>
            <strong style={{ whiteSpace: 'nowrap' }}>{brl(Number(plano.preco) + Number(plano.frete || 0))}</strong>
          </div>}
          <label className="row small" style={{ gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={outroMp} onChange={(e) => setOutroMp(e.target.checked)} style={{ marginTop: 3 }} />
            <span>Uso <strong>outro e-mail</strong> na minha conta do Mercado Pago <span className="muted">(o Mercado Pago só aceita pagar logado com o mesmo e-mail)</span></span>
          </label>
          {outroMp && <div className="field"><label htmlFor="pl-mp">E-mail da sua conta Mercado Pago</label>
            <input id="pl-mp" className="input" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" placeholder="voce@email.com" value={emailMp} onChange={(e) => setEmailMp(e.target.value)} />
            <span className="tiny muted">Sua conta Runergy continua com {perfil.email}.</span></div>}
          {erro && <div className="alert err" role="alert">{erro}</div>}
          <button className="btn btn-primary btn-block btn-lg" disabled={!completo || !emailMpOk || enviando || escolha === atual}>
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
  const [confirmando, setConfirmando] = useState(false)
  const agendado = ass.plano_agendado
  const mesmo = escolha === atual

  useEffect(() => {
    setSim(null); setErro(''); setFeito(null); setConfirmando(false)
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
          {!confirmando ? (
            <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!sim || enviando} onClick={() => setConfirmando(true)}>
              {!sim ? 'Calculando…' : sim.tipo === 'upgrade' ? `Subir para ${plano.nome}` : sim.tipo === 'downgrade' ? `Mudar para ${plano.nome}` : `Manter ${plano.nome}`}
            </button>
          ) : (
            <div className="stack" role="alertdialog" aria-label="Confirmar troca de plano" style={{ gap: 10, padding: 14, borderRadius: 16, background: 'var(--surface-2, rgba(0,0,0,0.04))' }}>
              <strong>{sim.tipo === 'desfazer' ? `Manter o plano ${plano.nome}?` : `Tem certeza que quer mudar para o ${plano.nome}?`}</strong>
              <span className="small" style={{ color: 'var(--text-2)' }}>
                {sim.tipo === 'upgrade' && <>O novo plano vale agora e a cobrança passa de {brl(ass.preco)} para <strong>{brl(sim.preco)}/mês</strong> a partir de {fmtData(sim.a_partir_de)}.</>}
                {sim.tipo === 'downgrade' && <>A troca acontece em {fmtData(sim.a_partir_de)} e a cobrança passa de {brl(ass.preco)} para <strong>{brl(sim.preco)}/mês</strong>. Até lá nada muda.</>}
                {sim.tipo === 'desfazer' && <>A mudança agendada é cancelada e a cobrança continua {brl(ass.preco)}/mês.</>}
              </span>
              <div className="row" style={{ gap: 10 }}>
                <button type="button" className="btn btn-ghost grow" disabled={enviando} onClick={() => setConfirmando(false)}>Voltar</button>
                <button type="button" className="btn btn-primary grow" disabled={enviando} onClick={confirmar}>{enviando ? 'Trocando…' : 'Confirmar'}</button>
              </div>
            </div>
          )}
          <span className="tiny muted" style={{ textAlign: 'center' }}>A troca é feita na mesma assinatura do Mercado Pago. Sem cobrança extra hoje.</span>
        </>
      ) : null}
    </section>
  )
}
