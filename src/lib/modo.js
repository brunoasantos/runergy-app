// Lembra se a pessoa da equipe estava no "modo equipe" ou no app de atleta.
// Ao abrir o app, quem estava no modo equipe volta direto para o Scanner.
// Operador sem preferência salva também abre direto no modo equipe.
const KEY = 'runergy_modo' // 'equipe' | 'atleta'
const SESSAO = 'runergy_modo_resolvido'

export function salvarModo(m) { try { localStorage.setItem(KEY, m) } catch (e) {} }
export function lerModo() { try { return localStorage.getItem(KEY) } catch (e) { return null } }

/** true só na primeira tela da sessão do app (abrir o app/aba), para não prender a pessoa no modo equipe. */
export function deveAbrirNoModoEquipe(papel) {
  try {
    if (sessionStorage.getItem(SESSAO)) return false
    sessionStorage.setItem(SESSAO, '1')
  } catch (e) { return false }
  const m = lerModo()
  return m === 'equipe' || (!m && papel === 'operador')
}

/** Marca a sessão como já resolvida (a pessoa abriu outra tela primeiro). */
export function marcarSessao() { try { sessionStorage.setItem(SESSAO, '1') } catch (e) {} }
