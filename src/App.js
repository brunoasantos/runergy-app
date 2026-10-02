import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { useTheme } from './lib/theme'
import { TemaCtx } from './lib/temaCtx'
import { deveAbrirNoModoEquipe, salvarModo, marcarSessao } from './lib/modo'

import Entrar from './pages/Entrar'
import EntrarEquipe from './pages/EntrarEquipe'
import CriarConta from './pages/CriarConta'
import NovaSenha from './pages/NovaSenha'
import Pontos from './pages/Pontos'
import Planos from './pages/Planos'
import CancelarAssinatura from './pages/CancelarAssinatura'
import MeuKit from './pages/MeuKit'
import { PEDIR_NOVA_SENHA } from './lib/cadastro'
import BemVindo from './pages/BemVindo'
import Inicio from './pages/Inicio'
import MeuQR from './pages/MeuQR'
import Confirmado from './pages/Confirmado'
import Historico from './pages/Historico'
import Perfil from './pages/Perfil'
import Scanner from './pages/equipe/Scanner'
import Validar from './pages/equipe/Validar'
import Painel from './pages/equipe/Painel'
import Vender from './pages/equipe/Vender'
import Fechar from './pages/equipe/Fechar'
import { sincronizarSuprimentos } from './lib/suprimentos'

// Peso (créditos) e preço avulso de cada item vêm do banco
sincronizarSuprimentos()


function Carregando() {
  return (
    <div className="screen center" style={{ alignItems: 'center' }}>
      <img src="/brand/r_mark.png" alt="Runergy" width={64} style={{ width: 64 }} />
      <div className="spinner" />
    </div>
  )
}

function Protegida({ children, equipe = false }) {
  const { session, perfil, carregando, ehEquipe } = useAuth()
  const loc = useLocation()
  if (carregando || (session && !perfil)) return <Carregando />
  if (!session) return <Navigate to="/entrar" replace state={{ de: loc.pathname }} />
  // Acabou de confirmar o código do "Esqueci minha senha": cria a senha nova antes de qualquer coisa
  let novaSenha = false
  try { novaSenha = sessionStorage.getItem(PEDIR_NOVA_SENHA) === '1' } catch (e) {}
  if (novaSenha && loc.pathname !== '/nova-senha') return <Navigate to="/nova-senha" replace />
  if (!perfil.nome && !novaSenha && loc.pathname !== '/bem-vindo') return <Navigate to="/bem-vindo" replace />
  if (equipe && !ehEquipe) return <Navigate to="/" replace />
  if (equipe) salvarModo('equipe')
  // Ao abrir o app: quem estava no modo equipe (ou operador) volta direto para o Scanner
  if (!equipe && ehEquipe && loc.pathname === '/' && deveAbrirNoModoEquipe(perfil.papel)) return <Navigate to="/equipe" replace />
  marcarSessao()
  return children
}

function SoDeslogado({ children }) {
  const { session, carregando } = useAuth()
  if (carregando) return <Carregando />
  if (session) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const tema = useTheme()
  return (
    <TemaCtx.Provider value={tema}>
      <AuthProvider>
        <BrowserRouter>
          <div className="shell">
            <Routes>
              <Route path="/entrar" element={<SoDeslogado><Entrar /></SoDeslogado>} />
              <Route path="/entrar/equipe" element={<SoDeslogado><EntrarEquipe /></SoDeslogado>} />
              <Route path="/criar-conta" element={<SoDeslogado><CriarConta /></SoDeslogado>} />
              <Route path="/nova-senha" element={<Protegida><NovaSenha /></Protegida>} />
              <Route path="/pontos" element={<Protegida><Pontos /></Protegida>} />
              <Route path="/planos" element={<Protegida><Planos /></Protegida>} />
              <Route path="/assinatura/cancelar" element={<Protegida><CancelarAssinatura /></Protegida>} />
              <Route path="/kit" element={<Protegida><MeuKit /></Protegida>} />
              <Route path="/bem-vindo" element={<Protegida><BemVindo /></Protegida>} />
              <Route path="/" element={<Protegida><Inicio /></Protegida>} />
              <Route path="/qr" element={<Protegida><MeuQR /></Protegida>} />
              <Route path="/confirmado/:id" element={<Protegida><Confirmado /></Protegida>} />
              <Route path="/historico" element={<Protegida><Historico /></Protegida>} />
              <Route path="/perfil" element={<Protegida><Perfil /></Protegida>} />
              <Route path="/equipe" element={<Protegida equipe><Scanner /></Protegida>} />
              <Route path="/equipe/validar" element={<Protegida equipe><Validar /></Protegida>} />
              <Route path="/equipe/painel" element={<Protegida equipe><Painel /></Protegida>} />
              <Route path="/equipe/vender" element={<Protegida equipe><Vender /></Protegida>} />
              <Route path="/equipe/fechar" element={<Protegida equipe><Fechar /></Protegida>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TemaCtx.Provider>
  )
}
