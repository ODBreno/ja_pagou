/** Arquivo recebido pelo "Compartilhar" do celular, guardado pelo service worker (public/sw.js). */
const CACHE = 'ja-pagamos-compartilhado'
const CHAVE = '/compartilhado'

export async function pegarArquivoCompartilhado(): Promise<File | null> {
  if (!new URLSearchParams(location.search).has('compartilhado') || !('caches' in window)) return null
  const resposta = await (await caches.open(CACHE)).match(CHAVE)
  if (!resposta) return null
  const nome = decodeURIComponent(resposta.headers.get('x-nome') ?? 'arquivo')
  const tipo = resposta.headers.get('content-type') ?? ''
  return new File([await resposta.blob()], nome, { type: tipo })
}

/** Apaga o arquivo guardado e tira o "?compartilhado" do endereço. */
export async function descartarArquivoCompartilhado(): Promise<void> {
  if ('caches' in window) await (await caches.open(CACHE)).delete(CHAVE)
  history.replaceState(null, '', '/')
}
