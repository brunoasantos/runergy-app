import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { brl, mensagemErro } from '../lib/format'
import { UFS, mascaraTel, mascaraCep, buscarCep, SITE_URL } from '../lib/cadastro'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'

// Mesmos planos e benefícios do site (runergy-site/src/lib/planos.js)
const PLANOS = [
  { id: 'starter', nome: 'Starter', preco: 29.9, resumo: 'Kit em casa todo mês', itens: ['6 sachês de carbo gel', '2 isotônicos', '2 pré-treinos em pó', 'Entrega mensal na sua porta'] },
  { id: 'runner', nome: 'Runner', preco: 49.9, resumo: 'Kit em casa + itens Runergy', itens: ['Tudo do plano Starter', 'Camiseta, boné e meia Runergy', 'Frete grátis'] },
  { id: 'hero', nome: 'Hero', preco: 69.9, resumo: 'Tudo do Runner + retirada nos pontos', qr: true, itens: ['Tudo do plano Runner', 'QR nos pontos: 30 créditos por mês', 'Óculos Baixa Pace', 'Suporte VIP', 'Frete grátis'] },
]

/** Assinar pelo app: escolhe o plano, confere o endereço do kit e segue para o pagamento no Mercado Pago. */
export default function Planos() {
  const { perfil, conta } = useAuth()
  const atual = conta.tipo === 'cliente' ? perfil.plano : null
  const [escolha, setEscolha] = useState('hero')
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
    const r2 = await supabase.from('assinantes').insert([{
      nome: perfil.nome, email: perfil.email, telefone: f.telefone, plano: plano.id, plano_nome: plano.nome, preco: plano.preco,
      cep: f.cep, cidade: f.cidade.trim(), estado: f.estado, endereco: f.endereco.trim(), numero: f.numero.trim(), complemento: f.complemento.trim(),
      status: 'pendente',
    }])
    if (r2.error) { setErro('Não foi possível registrar agora. Tente de novo em instantes.'); setEnviando(false); return }
    // O site guarda os links de pagamento do Mercado Pago e devolve a pessoa para o app depois
    window.location.href = `${SITE_URL}/pagar/${plano.id}?email=${encodeURIComponent(perfil.email)}&origem=app`
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
                  <strong style={{ fontSize: 17 }}>{p.nome}{p.qr && <span className="pill brand" style={{ marginLeft: 8 }}>QR nos pontos</span>}</strong>
                  <strong style={{ whiteSpace: 'nowrap' }}>{brl(p.preco)}<span className="tiny" style={{ fontWeight: 600 }}>/mês</span></strong>
                </div>
                <span className="small" style={{ color: 'var(--text-2)' }}>{atual === p.id ? 'Seu plano atual' : p.resumo}</span>
                {on && <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7, color: 'var(--text-2)' }}>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>}
              </button>
            )
          })}
        </div>

        <form className="card stack" style={{ gap: 12 }} onSubmit={assinar} noValidate>
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
        </form>
      </main>
      <BottomNav />
    </>
  )
}
