export const SUPRIMENTOS = {
  // peso = créditos por retirada; preco = venda avulsa (R$). Atualizados do banco por lib/suprimentos.js
  agua: { label: 'Água', detalhe: 'Copo 200 ml', icon: 'drop', peso: 1, preco: 3 },
  gel: { label: 'Carbo Gel', detalhe: 'Sachê 40 g', icon: 'bolt', peso: 3, preco: 9 },
  eletrolito: { label: 'Eletrólito', detalhe: 'Sachê 20 g', icon: 'bottle', peso: 2, preco: 6 },
  isotonico: { label: 'Isotônico', detalhe: 'Dose 500 ml', icon: 'bottle', peso: 3, preco: 9 },
}

export function suprimento(id) {
  return SUPRIMENTOS[id] || { label: id, detalhe: '', icon: 'drop', peso: 1, preco: 0 }
}
export const rotuloCreditos = (n) => `${n} ${n === 1 ? 'crédito' : 'créditos'}`

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
  PLANO_SEM_ACESSO: 'Esta pessoa não tem acesso aos pontos (clientes: só os planos Runner e Hero).',
  SEM_CREDITOS: 'Sem créditos neste mês. Eles renovam no dia 1º.',
  MOTIVO_OBRIGATORIO: 'Diga o motivo do estorno.',
  JA_ESTORNADA: 'Essa venda já foi estornada.',
  ESTORNO_FORA_DO_DIA: 'Só dá para estornar vendas de hoje pelo app. Peça ao supervisor no painel de gestão.',
  VENDA_INVALIDA: 'Venda não encontrada.',
  LIMITE_DIARIO: 'Limite de 10 créditos por dia da conta admin atingido. Libera amanhã.',
  VENDA_VAZIA: 'Escolha pelo menos um item.',
  FORMA_INVALIDA: 'Escolha a forma de pagamento.',
  CREDITOS_INSUFICIENTES: 'Créditos insuficientes para esse item. Escolha um item que custe menos.',
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
