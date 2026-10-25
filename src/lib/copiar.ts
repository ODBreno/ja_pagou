/**
 * navigator.clipboard só existe em contexto seguro (HTTPS/localhost); no celular acessando
 * pelo IP da rede local cai no método antigo, com um textarea temporário.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto)
      return true
    } catch {
      // segue para o método antigo
    }
  }
  const campo = document.createElement('textarea')
  campo.value = texto
  campo.setAttribute('readonly', '')
  campo.style.position = 'fixed'
  campo.style.opacity = '0'
  document.body.appendChild(campo)
  campo.select()
  const copiou = document.execCommand('copy')
  campo.remove()
  return copiou
}
