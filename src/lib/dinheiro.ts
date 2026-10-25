const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarReais(valor: number): string {
  return formatador.format(valor)
}

/** Aceita "1.234,56", "123,4" e também "123.45" (ponto como decimal). */
export function lerValor(texto: string): number | null {
  let limpo = texto.replace(/[^\d,.]/g, '')
  if (!limpo) return null
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.')
  else if (!/^\d+\.\d{1,2}$/.test(limpo)) limpo = limpo.replace(/\./g, '')
  const valor = Number(limpo)
  return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : null
}

export function valorParaTexto(valor: number | null): string {
  return valor == null ? '' : valor.toFixed(2).replace('.', ',')
}
