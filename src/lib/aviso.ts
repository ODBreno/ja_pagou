/** Avisos rápidos no topo da tela ("Salvo ✓"). Qualquer parte do app chama mostrarAviso. */
export type TipoAviso = 'sucesso' | 'erro'

export interface AvisoRapido {
  id: number
  texto: string
  tipo: TipoAviso
}

const EVENTO = 'ja-pagamos:aviso'
let proximoId = 1

export function mostrarAviso(texto: string, tipo: TipoAviso = 'sucesso') {
  window.dispatchEvent(new CustomEvent<AvisoRapido>(EVENTO, { detail: { id: proximoId++, texto, tipo } }))
}

export function ouvirAvisos(aoReceber: (aviso: AvisoRapido) => void): () => void {
  const ouvinte = (e: Event) => aoReceber((e as CustomEvent<AvisoRapido>).detail)
  window.addEventListener(EVENTO, ouvinte)
  return () => window.removeEventListener(EVENTO, ouvinte)
}
