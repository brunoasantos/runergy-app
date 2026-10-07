import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Foto de perfil (opcional): fica numa pasta privada do Supabase (fotos-perfil), uma subpasta por pessoa.
// O celular reduz a imagem antes de enviar (quadrada, 512 px, JPEG), então cada foto pesa só alguns KB.
export const BUCKET_FOTOS = 'fotos-perfil'
const LADO = 512
const MAX_BYTES = 250 * 1024

function lerImagem(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('FOTO_ILEGIVEL')) }
    img.src = url
  })
}

/** Recorta o centro em quadrado, reduz para 512 px e devolve um JPEG leve (Blob). */
export async function reduzirImagem(file) {
  if (!file || !/^image\//.test(file.type || 'image/jpeg')) throw new Error('FOTO_ILEGIVEL')
  let fonte
  try { fonte = await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch (e) { fonte = await lerImagem(file) }
  const w = fonte.width || fonte.naturalWidth, h = fonte.height || fonte.naturalHeight
  if (!w || !h) throw new Error('FOTO_ILEGIVEL')
  const lado = Math.min(w, h)
  const saida = Math.min(LADO, lado)
  const canvas = document.createElement('canvas')
  canvas.width = saida; canvas.height = saida
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, saida, saida)
  ctx.drawImage(fonte, (w - lado) / 2, (h - lado) / 2, lado, lado, 0, 0, saida, saida)
  if (fonte.close) fonte.close()
  for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', q))
    if (blob && blob.size <= MAX_BYTES) return blob
    if (blob && q === 0.45) return blob
  }
  throw new Error('FOTO_ILEGIVEL')
}

/** Envia a foto nova, grava o caminho no perfil e apaga a anterior. Devolve o novo caminho. */
export async function trocarFoto(uid, blob, caminhoAntigo) {
  const path = `${uid}/${Date.now()}.jpg`
  const up = await supabase.storage.from(BUCKET_FOTOS).upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '3600' })
  if (up.error) throw up.error
  const r = await supabase.rpc('salvar_minha_foto', { p_path: path })
  if (r.error) {
    await supabase.storage.from(BUCKET_FOTOS).remove([path]).catch(() => {})
    throw r.error
  }
  if (caminhoAntigo && caminhoAntigo !== path) await supabase.storage.from(BUCKET_FOTOS).remove([caminhoAntigo]).catch(() => {})
  return path
}

export async function tirarFoto(caminhoAtual) {
  const r = await supabase.rpc('remover_minha_foto')
  if (r.error) throw r.error
  if (caminhoAtual) await supabase.storage.from(BUCKET_FOTOS).remove([caminhoAtual]).catch(() => {})
}

// Endereço temporário (assinado) para mostrar a foto; guardado por ~50 min para não pedir de novo a cada tela
const cache = new Map()
const VALE_S = 3600
export async function urlDaFoto(path) {
  if (!path) return null
  const c = cache.get(path)
  if (c && c.ate > Date.now()) return c.url
  const { data, error } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrl(path, VALE_S)
  if (error || !data?.signedUrl) return null
  cache.set(path, { url: data.signedUrl, ate: Date.now() + (VALE_S - 600) * 1000 })
  return data.signedUrl
}

export function useFotoUrl(path) {
  const [url, setUrl] = useState(() => (path && cache.get(path)?.ate > Date.now() ? cache.get(path).url : null))
  useEffect(() => {
    let vivo = true
    if (!path) { setUrl(null); return undefined }
    urlDaFoto(path).then((u) => { if (vivo) setUrl(u) })
    return () => { vivo = false }
  }, [path])
  return url
}
