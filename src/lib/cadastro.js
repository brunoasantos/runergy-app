// Utilidades do cadastro padrão (mesmos campos e máscaras do checkout do site)
export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
export const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e || '').trim())
export const mascaraTel = (v) => {
  const d = (v || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
export const mascaraCep = (v) => { const d = (v || '').replace(/\D/g, '').slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d }
export async function buscarCep(cep) {
  const d = (cep || '').replace(/\D/g, '')
  if (d.length !== 8) return null
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`)
    const j = await r.json()
    // Endereço = rua + bairro (o número fica no campo próprio). CEP geral de cidade pequena vem sem rua.
    const endereco = [j.logradouro, j.bairro].filter(Boolean).join(' - ')
    return j.erro ? null : { cidade: j.localidade || '', estado: j.uf || '', endereco, temRua: !!j.logradouro }
  } catch (e) { return null }
}
// Quem confirmou o código de "Esqueci minha senha" precisa definir a nova senha antes de seguir
export const PEDIR_NOVA_SENHA = 'runergy_nova_senha'
export const SITE_URL = 'https://www.runergyapp.com'
