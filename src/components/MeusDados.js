import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { mensagemErro } from '../lib/format'
import { UFS, mascaraTel, mascaraCep, buscarCep } from '../lib/cadastro'
import { reduzirImagem, trocarFoto, tirarFoto } from '../lib/foto'
import Folha from './Folha'
import Avatar from './Avatar'
import Icon from './Icon'

const VAZIO = { telefone: '', cep: '', cidade: '', estado: '', endereco: '', numero: '', complemento: '' }

/** "Meus dados": foto (opcional), nome, WhatsApp e endereço. O e-mail é o login e só o admin troca. */
export default function MeusDados({ onFechar, onSalvo }) {
  const { perfil, recarregarPerfil } = useAuth()
  const [nome, setNome] = useState(perfil.nome || '')
  const [f, setF] = useState(VAZIO)
  const [carregado, setCarregado] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [avisoCep, setAvisoCep] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [fotoOcupada, setFotoOcupada] = useState(false)
  const [fotoMsg, setFotoMsg] = useState('')
  const [fotoErro, setFotoErro] = useState('')
  const numRef = useRef(null)
  const arquivoRef = useRef(null)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    supabase.from('contatos').select('telefone, cep, cidade, estado, endereco, numero, complemento').maybeSingle()
      .then(({ data }) => {
        if (data) setF({ ...VAZIO, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v || ''])), telefone: mascaraTel(data.telefone || ''), cep: mascaraCep(data.cep || '') })
        setCarregado(true)
      })
  }, [])

  async function completarPeloCep(m) {
    setBuscando(true); setAvisoCep('')
    const r = await buscarCep(m)
    setBuscando(false)
    if (!r) { setAvisoCep('Não encontramos esse CEP. Confira os números ou preencha o endereço.'); return }
    setF((x) => ({ ...x, cidade: r.cidade || x.cidade, estado: r.estado || x.estado, endereco: r.endereco || x.endereco }))
    if (!r.temRua) setAvisoCep('Esse CEP é da cidade toda: digite a rua e o bairro.')
    else setTimeout(() => numRef.current?.focus(), 50)
  }
  function mudaCep(v) {
    const m = mascaraCep(v); set('cep', m)
    if (m.replace(/\D/g, '').length === 8) completarPeloCep(m)
  }

  async function escolherFoto(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setFotoOcupada(true); setFotoErro(''); setFotoMsg('')
    try {
      const blob = await reduzirImagem(arquivo)
      await trocarFoto(perfil.id, blob, perfil.foto_path)
      await recarregarPerfil()
      setFotoMsg('Foto atualizada.')
    } catch (err) {
      setFotoErro(String(err?.message || '').includes('FOTO_ILEGIVEL') ? 'Não consegui ler essa foto. Tente outra.' : mensagemErro(err))
    }
    setFotoOcupada(false)
  }
  async function removerFoto() {
    setFotoOcupada(true); setFotoErro(''); setFotoMsg('')
    try { await tirarFoto(perfil.foto_path); await recarregarPerfil(); setFotoMsg('Foto removida.') } catch (err) { setFotoErro(mensagemErro(err)) }
    setFotoOcupada(false)
  }

  const telDigitos = f.telefone.replace(/\D/g, '').length
  const cepDigitos = f.cep.replace(/\D/g, '').length
  const nomeOk = nome.trim().replace(/\s+/g, ' ').length >= 2
  const valido = nomeOk && (telDigitos === 0 || telDigitos >= 10) && (cepDigitos === 0 || cepDigitos === 8)

  async function salvar(e) {
    e.preventDefault()
    if (!valido || salvando) return
    setSalvando(true); setErro('')
    const { error } = await supabase.rpc('salvar_meu_cadastro', { p: {
      nome: nome.trim().replace(/\s+/g, ' '), telefone: f.telefone, cep: f.cep, cidade: f.cidade.trim(), estado: f.estado,
      endereco: f.endereco.trim(), numero: f.numero.trim(), complemento: f.complemento.trim(),
    } })
    if (error) { setErro(mensagemErro(error)); setSalvando(false); return }
    await recarregarPerfil()
    setSalvando(false)
    onSalvo?.()
    onFechar()
  }

  return (
    <Folha titulo="Meus dados" onFechar={onFechar}>
      <form className="stack" style={{ gap: 12 }} onSubmit={salvar} noValidate>
        <div className="row" style={{ gap: 14 }}>
          <Avatar nome={nome || perfil.nome} path={perfil.foto_path} size={72} />
          <div className="stack grow" style={{ gap: 6 }}>
            <input ref={arquivoRef} type="file" accept="image/*" onChange={escolherFoto} style={{ display: 'none' }} aria-label="Escolher foto" />
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost btn-sm" disabled={fotoOcupada} onClick={() => arquivoRef.current?.click()}>
                <Icon name="camera" size={18} />{fotoOcupada ? 'Enviando…' : perfil.foto_path ? 'Trocar foto' : 'Adicionar foto'}
              </button>
              {perfil.foto_path && <button type="button" className="btn btn-link" style={{ minHeight: 44, color: 'var(--err)' }} disabled={fotoOcupada} onClick={removerFoto}>Remover</button>}
            </div>
            <span className="tiny muted">Opcional. Ajuda a equipe a confirmar que é você na retirada.</span>
          </div>
        </div>
        {fotoMsg && <div className="alert ok small" role="status">{fotoMsg}</div>}
        {fotoErro && <div className="alert err small" role="alert">{fotoErro}</div>}

        <div className="field"><label htmlFor="md-nome">Nome</label>
          <input id="md-nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} autoComplete="name" /></div>
        <div className="field"><label htmlFor="md-email">E-mail (é o seu login)</label>
          <input id="md-email" className="input" value={perfil.email || ''} readOnly disabled />
          <span className="tiny muted">Para trocar o e-mail, fale com a Runergy.</span></div>
        <div className="field"><label htmlFor="md-tel">WhatsApp</label>
          <input id="md-tel" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={f.telefone} onChange={(e) => set('telefone', mascaraTel(e.target.value))} disabled={!carregado} /></div>
        <div className="form-duas">
          <div className="field"><label htmlFor="md-cep">CEP{buscando ? ' · buscando…' : ''}</label>
            <input id="md-cep" className="input" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={f.cep} onChange={(e) => mudaCep(e.target.value)} disabled={!carregado} /></div>
          <div className="field"><label htmlFor="md-uf">UF</label>
            <select id="md-uf" className="input" value={f.estado} onChange={(e) => set('estado', e.target.value)} disabled={!carregado}>
              <option value="">UF</option>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select></div>
        </div>
        {avisoCep && <span className="small" style={{ color: 'var(--accent-text)', marginTop: -4 }}>{avisoCep}</span>}
        <div className="field"><label htmlFor="md-cid">Cidade</label>
          <input id="md-cid" className="input" autoComplete="address-level2" value={f.cidade} onChange={(e) => set('cidade', e.target.value)} disabled={!carregado} /></div>
        <div className="field"><label htmlFor="md-end">Endereço</label>
          <input id="md-end" className="input" autoComplete="address-line1" placeholder="Rua, avenida…" value={f.endereco} onChange={(e) => set('endereco', e.target.value)} disabled={!carregado} /></div>
        <div className="form-duas">
          <div className="field"><label htmlFor="md-num">Número</label>
            <input id="md-num" ref={numRef} className="input" inputMode="numeric" value={f.numero} onChange={(e) => set('numero', e.target.value)} disabled={!carregado} /></div>
          <div className="field"><label htmlFor="md-comp">Complemento</label>
            <input id="md-comp" className="input" autoComplete="address-line2" placeholder="Apto, bloco…" value={f.complemento} onChange={(e) => set('complemento', e.target.value)} disabled={!carregado} /></div>
        </div>
        {telDigitos > 0 && telDigitos < 10 && <span className="small" style={{ color: 'var(--err)' }}>O WhatsApp precisa do DDD e do número.</span>}
        {cepDigitos > 0 && cepDigitos < 8 && <span className="small" style={{ color: 'var(--err)' }}>O CEP tem 8 números.</span>}
        {erro && <div className="alert err" role="alert">{erro}</div>}
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn btn-ghost grow" onClick={onFechar}>Cancelar</button>
          <button className="btn btn-primary grow" disabled={!valido || salvando || !carregado}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </Folha>
  )
}
