import { lerArquivo } from '../dados/repositorio'
import type { Anexo } from '../tipos'

/** A aba é aberta antes da leitura assíncrona para o navegador não bloquear como pop-up. */
export async function abrirAnexo(anexo: Anexo): Promise<void> {
  const janela = window.open('', '_blank')
  const arquivo = await lerArquivo(anexo)
  if (!arquivo) {
    janela?.close()
    alert('Arquivo não encontrado.')
    return
  }
  const url = URL.createObjectURL(arquivo)
  if (janela) janela.location.href = url
  else window.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
