import { encontrarCodigo, type CodigoEncontrado } from './codigoPagamento'

/**
 * Extrai o texto das primeiras páginas do PDF com o pdf.js e procura o código de pagamento.
 * O pdf.js é pesado, então só é baixado quando alguém anexa ou lê um PDF.
 */
export async function lerCodigoDoPdf(arquivo: Blob): Promise<CodigoEncontrado | null> {
  const pdfjs = await import('pdfjs-dist')
  const { default: urlDoWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = urlDoWorker

  const tarefa = pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) })
  const documento = await tarefa.promise
  const pedacos: string[] = []
  for (let pagina = 1; pagina <= Math.min(documento.numPages, 3); pagina++) {
    const conteudo = await (await documento.getPage(pagina)).getTextContent()
    for (const item of conteudo.items) if ('str' in item) pedacos.push(item.str)
  }
  await tarefa.destroy()
  return encontrarCodigo(pedacos.join(' '), pedacos.join(''))
}
