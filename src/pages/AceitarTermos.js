import React, { useState } from 'react'
import { useAuth } from '../lib/auth'
import { TERMOS_URL, PRIVACIDADE_URL } from '../lib/termos'
import Icon from '../components/Icon'

/** Aparece antes de qualquer tela quando a pessoa ainda não aceitou a versão vigente dos termos. */
export default function AceitarTermos({ versao, aceitar }) {
  const { sair } = useAuth()
  const [li, setLi] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  async function continuar() {
    if (!li || enviando) return
    setEnviando(true); setErro('')
    const ok = await aceitar()
    if (!ok) { setErro('Não foi possível registrar agora. Confira a internet e tente de novo.'); setEnviando(false) }
  }
  return (
    <main className="screen center" style={{ gap: 16 }}>
      <section className="card stack" style={{ gap: 14 }} aria-labelledby="tt-titulo">
        <span className="icon-tile" style={{ width: 52, height: 52, borderRadius: 16 }}><Icon name="check" size={26} /></span>
        <h1 id="tt-titulo" className="h2" style={{ margin: 0 }}>{versao > 1 ? 'Atualizamos nossos termos' : 'Termos de uso e privacidade'}</h1>
        <p className="small" style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.55 }}>
          Para continuar usando a Runergy, leia e aceite os Termos de Uso e a Política de Privacidade. Em resumo:
        </p>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: 'var(--text-2)' }}>
          <li>Usamos seus dados só para a conta, as retiradas, os pagamentos e as entregas.</li>
          <li>Não vendemos seus dados. Pagamentos são feitos no Mercado Pago.</li>
          <li>Você pode pedir para ver, corrigir ou apagar seus dados quando quiser.</li>
        </ul>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <a href={TERMOS_URL} target="_blank" rel="noopener noreferrer" className="small" style={{ fontWeight: 800, color: 'var(--accent-text)' }}>Ler os Termos de Uso</a>
          <a href={PRIVACIDADE_URL} target="_blank" rel="noopener noreferrer" className="small" style={{ fontWeight: 800, color: 'var(--accent-text)' }}>Ler a Política de Privacidade</a>
        </div>
        <label className="row small" style={{ gap: 10, alignItems: 'flex-start', lineHeight: 1.45, cursor: 'pointer' }}>
          <input type="checkbox" checked={li} onChange={(e) => setLi(e.target.checked)} style={{ width: 20, height: 20, margin: 0, accentColor: 'var(--orange)', flexShrink: 0 }} />
          <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span>
        </label>
        {erro && <div className="alert err" role="alert">{erro}</div>}
        <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!li || enviando} onClick={continuar}>{enviando ? 'Salvando…' : 'Aceitar e continuar'}</button>
        <button type="button" className="btn-link" style={{ alignSelf: 'center' }} onClick={sair}>Sair da conta</button>
      </section>
    </main>
  )
}
