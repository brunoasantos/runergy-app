// Totens de demonstração — esses serão inseridos no Supabase
// O QR Code de cada totem contém apenas o totem_code (ex: "RUNERGY-001")
export const TOTENS_MOCK = [
  {
    totem_code: 'RUNERGY-001',
    nome: 'Beira-Mar Norte — KM 3',
    cidade: 'Florianópolis',
    estado: 'SC',
    lat: -27.5934,
    lng: -48.5477,
    suprimentos: ['agua', 'gel', 'eletrolito'],
    ativo: true,
  },
  {
    totem_code: 'RUNERGY-002',
    nome: 'Beira-Mar Norte — KM 6',
    cidade: 'Florianópolis',
    estado: 'SC',
    lat: -27.5701,
    lng: -48.5512,
    suprimentos: ['agua', 'gel'],
    ativo: true,
  },
  {
    totem_code: 'RUNERGY-003',
    nome: 'Parque da Luz — KM 2',
    cidade: 'Florianópolis',
    estado: 'SC',
    lat: -27.5954,
    lng: -48.5489,
    suprimentos: ['agua', 'eletrolito'],
    ativo: true,
  },
]

export const SUPRIMENTOS = {
  agua:      { label: 'Água',        emoji: '💧', cor: '#3B82F6' },
  gel:       { label: 'Carbo Gel',   emoji: '⚡', cor: '#D85A30' },
  eletrolito:{ label: 'Eletrólito',  emoji: '🔋', cor: '#16A34A' },
}
