import { urlDoAnexo } from '../dados/repositorio'
import type { Anexo } from '../tipos'

/** A aba é aberta antes da chamada assíncrona para o navegador não bloquear como pop-up. */
export async function abrirAnexo(anexo: Anexo): Promise<void> {
  const janela = window.open('', '_blank')
  try {
    const url = await urlDoAnexo(anexo)
    if (janela) janela.location.href = url
    else window.location.href = url
  } catch {
    janela?.close()
    alert('Não foi possível abrir o arquivo.')
  }
}
