/**
 * Acha o código de pagamento no texto de uma conta (PDF): linha digitável de boleto bancário
 * (47 dígitos), de conta de consumo/convênio (48 dígitos, começa com 8) ou Pix copia e cola.
 * Todo candidato passa pelos dígitos verificadores (ou CRC do Pix), então número qualquer
 * do PDF (CPF, protocolo, nº de instalação) não é confundido com o código.
 */

export interface CodigoEncontrado {
  tipo: 'boleto' | 'convenio' | 'pix'
  /** Só os dígitos (boleto/convênio) ou o payload do Pix: é o que se cola no app do banco. */
  codigo: string
  /** Valor lido do próprio código, quando ele traz. */
  valor: number | null
}

const digitos = (s: string) => [...s].map(Number)

/** Módulo 10: pesos 2,1,2,1... da direita; soma os algarismos de cada produto. */
export function modulo10(numero: string): number {
  let soma = 0
  digitos(numero)
    .reverse()
    .forEach((d, i) => {
      const produto = d * (i % 2 === 0 ? 2 : 1)
      soma += produto > 9 ? produto - 9 : produto
    })
  return (10 - (soma % 10)) % 10
}

/** Soma do módulo 11 com pesos 2..9 da direita para a esquerda. */
function somaModulo11(numero: string): number {
  return digitos(numero)
    .reverse()
    .reduce((soma, d, i) => soma + d * (2 + (i % 8)), 0)
}

/** DV geral do código de barras de boleto bancário (resto 0, 1 ou 10 vira 1). */
export function modulo11Bancario(numero: string): number {
  const dv = 11 - (somaModulo11(numero) % 11)
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv
}

/** DV de convênio/arrecadação: resto 0 ou 1 vira 0, resto 10 vira 1. */
export function modulo11Convenio(numero: string): number {
  const resto = somaModulo11(numero) % 11
  if (resto === 0 || resto === 1) return 0
  if (resto === 10) return 1
  return 11 - resto
}

/** Linha digitável de boleto bancário (47 dígitos): 3 campos com DV + DV geral + fator/valor. */
export function validarBoleto(linha: string): CodigoEncontrado | null {
  if (!/^\d{47}$/.test(linha)) return null
  const campos: [string, string][] = [
    [linha.slice(0, 9), linha[9]],
    [linha.slice(10, 20), linha[20]],
    [linha.slice(21, 31), linha[31]],
  ]
  if (campos.some(([campo, dv]) => modulo10(campo) !== Number(dv))) return null
  // Código de barras: banco+moeda, DV geral, fator+valor, campo livre.
  const semDvGeral = linha.slice(0, 4) + linha.slice(33, 47) + linha.slice(4, 9) + linha.slice(10, 20) + linha.slice(21, 31)
  if (modulo11Bancario(semDvGeral) !== Number(linha[32])) return null
  const valor = Number(linha.slice(37, 47)) / 100
  return { tipo: 'boleto', codigo: linha, valor: valor > 0 ? valor : null }
}

/** Linha de conta de consumo/convênio (48 dígitos): 4 blocos de 11 + DV. */
export function validarConvenio(linha: string): CodigoEncontrado | null {
  if (!/^8\d{47}$/.test(linha)) return null
  // O 3º dígito diz qual módulo usar e se o valor é real (6 ou 8) ou referência (7 ou 9).
  const identificador = linha[2]
  if (!'6789'.includes(identificador)) return null
  const calcular = identificador === '6' || identificador === '7' ? modulo10 : modulo11Convenio
  const blocos = [0, 1, 2, 3].map((i) => linha.slice(i * 12, i * 12 + 11))
  if (blocos.some((bloco, i) => calcular(bloco) !== Number(linha[i * 12 + 11]))) return null
  const barras = blocos.join('')
  if (calcular(barras.slice(0, 3) + barras.slice(4)) !== Number(barras[3])) return null
  const valorReal = identificador === '6' || identificador === '8'
  const valor = valorReal ? Number(barras.slice(4, 15)) / 100 : 0
  return { tipo: 'convenio', codigo: linha, valor: valor > 0 ? valor : null }
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), usado no fim do Pix copia e cola. */
export function crc16(texto: string): string {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Lê o valor (campo 54) do Pix: o payload é uma lista de ID(2) + tamanho(2) + conteúdo. */
function valorDoPix(payload: string): number | null {
  for (let i = 0; i + 4 <= payload.length; ) {
    const id = payload.slice(i, i + 2)
    const tamanho = Number(payload.slice(i + 2, i + 4))
    if (!Number.isFinite(tamanho)) return null
    if (id === '54') return Number(payload.slice(i + 4, i + 4 + tamanho)) || null
    i += 4 + tamanho
  }
  return null
}

export function validarPix(payload: string): CodigoEncontrado | null {
  if (!payload.startsWith('000201') || !/br\.gov\.bcb\.pix/i.test(payload)) return null
  const corpo = payload.slice(0, -4)
  if (!corpo.endsWith('6304') || crc16(corpo) !== payload.slice(-4).toUpperCase()) return null
  return { tipo: 'pix', codigo: payload, valor: valorDoPix(payload) }
}

/** Sequências de dígitos que podem estar separadas por espaço, ponto ou hífen (como no boleto). */
function sequenciasNumericas(texto: string): string[] {
  return (texto.match(/\d(?:\d|[ .-]{1,3}(?=\d))+/g) ?? []).map((s) => s.replace(/\D/g, ''))
}

/**
 * Procura o código no texto. comEspacos: texto com os pedaços separados (bom para boleto);
 * junto: pedaços colados (o Pix às vezes vem quebrado em várias linhas no PDF).
 */
export function encontrarCodigo(comEspacos: string, junto = comEspacos): CodigoEncontrado | null {
  for (const texto of [comEspacos, junto]) {
    for (const [pix] of texto.matchAll(/000201.*?6304[0-9A-Fa-f]{4}/g)) {
      const valido = validarPix(pix)
      if (valido) return valido
    }
  }
  for (const sequencia of sequenciasNumericas(comEspacos)) {
    // A sequência pode vir grudada em outros números; testa cada janela do tamanho certo.
    for (let i = 0; i + 47 <= sequencia.length; i++) {
      const convenio = i + 48 <= sequencia.length ? validarConvenio(sequencia.slice(i, i + 48)) : null
      if (convenio) return convenio
      const boleto = validarBoleto(sequencia.slice(i, i + 47))
      if (boleto) return boleto
    }
  }
  return null
}
