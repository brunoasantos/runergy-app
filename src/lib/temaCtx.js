import { createContext, useContext } from 'react'
export const TemaCtx = createContext(null)
export const useTema = () => useContext(TemaCtx)
