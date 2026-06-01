import React, { createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

import Splash       from './pages/Splash'
import Onboarding   from './pages/Onboarding'
import Cadastro     from './pages/Cadastro'
import Home         from './pages/Home'
import Scanner      from './pages/Scanner'
import Retirada     from './pages/Retirada'
import Confirmacao  from './pages/Confirmacao'
import Historico    from './pages/Historico'
import Perfil       from './pages/Perfil'

export const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

export default function App() {
  const [atleta, setAtleta] = useState(null)   // { id, nome, email, plano, creditos }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica se há atleta salvo no localStorage (simula sessão)
    const saved = localStorage.getItem('runergy_atleta')
    if (saved) setAtleta(JSON.parse(saved))
    setLoading(false)
  }, [])

  const login = (dados) => {
    setAtleta(dados)
    localStorage.setItem('runergy_atleta', JSON.stringify(dados))
  }

  const logout = () => {
    setAtleta(null)
    localStorage.removeItem('runergy_atleta')
  }

  const atualizarCreditos = (novosCreditos) => {
    const atualizado = { ...atleta, creditos: novosCreditos }
    setAtleta(atualizado)
    localStorage.setItem('runergy_atleta', JSON.stringify(atualizado))
  }

  if (loading) return null

  return (
    <AppCtx.Provider value={{ atleta, login, logout, atualizarCreditos, supabase }}>
      <BrowserRouter>
        <Routes>
          <Route path="/"            element={<Splash />} />
          <Route path="/onboarding"  element={<Onboarding />} />
          <Route path="/cadastro"    element={<Cadastro />} />
          <Route path="/home"        element={atleta ? <Home />       : <Navigate to="/" />} />
          <Route path="/scanner"     element={atleta ? <Scanner />    : <Navigate to="/" />} />
          <Route path="/retirada"    element={atleta ? <Retirada />   : <Navigate to="/" />} />
          <Route path="/confirmacao" element={atleta ? <Confirmacao />: <Navigate to="/" />} />
          <Route path="/historico"   element={atleta ? <Historico />  : <Navigate to="/" />} />
          <Route path="/perfil"      element={atleta ? <Perfil />     : <Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AppCtx.Provider>
  )
}
