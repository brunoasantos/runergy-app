export const SUPRIMENTOS = {
  agua: { label: 'Água', detalhe: 'Copo 200 ml', icon: 'drop' },
  gel: { label: 'Carbo Gel', detalhe: 'Sachê 40 g', icon: 'bolt' },
  eletrolito: { label: 'Eletrólito', detalhe: 'Sachê 20 g', icon: 'bottle' },
}

export function suprimento(id) {
  return SUPRIMENTOS[id] || { label: id, detalhe: '', icon: 'drop' }
}

const tz = 'America/Sao_Paulo'
export const fmtHora = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz })
export const fmtDia = (d) => new Date(d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: tz }).replace('.', '')
export const fmtData = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: tz })
export const fmtMes = (d) => new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: tz })
export const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function inicioDoDiaSP() {
  // meia-noite em São Paulo (UTC-3), em ISO
  const agora = new Date()
  const sp = new Date(agora.toLocaleString('en-US', { timeZone: tz }))
  const offsetMs = agora.getTime() - sp.getTime()
  const meiaNoiteSP = new Date(sp.getFullYear(), sp.getMonth(), sp.getDate())
  return new Date(meiaNoiteSP.getTime() + offsetMs).toISOString()
}

export function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export function primeiroNome(nome) {
  return (nome || '').trim().split(/\s+/)[0] || 'atleta'
}

// Mensagens de erro do banco e do login, em português simples
const ERROS = {
  NAO_AUTENTICADO: 'Sua sessão expirou. Entre de novo.',
  PERFIL_INEXISTENTE: 'Não encontramos seu perfil. Saia e entre de novo.',
  SEM_PERMISSAO: 'Sua conta não tem acesso ao modo equipe.',
  CODIGO_INVALIDO: 'QR não reconhecido. Peça para o atleta abrir o QR de novo.',
  CODIGO_EXPIRADO: 'Esse QR expirou. Peça para o atleta atualizar a tela.',
  CODIGO_JA_USADO: 'Esse QR já foi usado. Peça para o atleta gerar um novo.',
  TOTEM_INVALIDO: 'Ponto não encontrado ou desativado.',
  QUANTIDADE_INVALIDA: 'Quantidade inválida.',
  SUPRIMENTO_INDISPONIVEL: 'Esse item não está disponível neste ponto.',
  PLANO_SEM_ACESSO: 'O plano desse atleta não dá acesso aos pontos. Só o Hero retira.',
  SEM_CREDITOS: 'O atleta está sem créditos neste mês.',
  SEM_ESTOQUE: 'Acabou esse item no ponto. Reponha o estoque no painel.',
}

export function mensagemErro(err) {
  const msg = (err && (err.message || err.error_description || String(err))) || ''
  for (const k of Object.keys(ERROS)) if (msg.includes(k)) return ERROS[k]
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas. Espere alguns minutos e tente de novo.'
  if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(msg)) return 'Código inválido ou expirado. Confira o e-mail ou peça outro.'
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.'
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Sem conexão. Verifique a internet e tente de novo.'
  if (/Signups not allowed/i.test(msg)) return 'Cadastro desativado no momento.'
  return 'Algo deu errado. Tente de novo.'
}

export function distanciaKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null
  const R = 6371, toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
export const fmtKm = (km) => (km == null ? '' : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`)

export const LINK_PLANOS = 'https://www.runergyapp.com/#planos'
