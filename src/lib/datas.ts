const doisDigitos = (n: number) => String(n).padStart(2, '0')

function partes(data: string): number[] {
  return data.split('-').map(Number)
}

export function paraDataIso(d: Date): string {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`
}

export function hoje(): string {
  return paraDataIso(new Date())
}

export function mesAtual(): string {
  return hoje().slice(0, 7)
}

export function somarMeses(mes: string, quantidade: number): string {
  const [ano, m] = partes(mes)
  const d = new Date(ano, m - 1 + quantidade, 1)
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}`
}

export function nomeDoMes(mes: string): string {
  const [ano, m] = partes(mes)
  const nome = new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
  return `${nome[0].toUpperCase()}${nome.slice(1)} ${ano}`
}

/** Dia 31 em fevereiro vira o último dia do mês. */
export function vencimentoNoMes(mes: string, dia: number): string {
  const [ano, m] = partes(mes)
  const ultimoDia = new Date(ano, m, 0).getDate()
  return `${mes}-${doisDigitos(Math.min(dia, ultimoDia))}`
}

export function diasAte(data: string): number {
  const [a, m, d] = partes(data)
  const [ha, hm, hd] = partes(hoje())
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86_400_000)
}

export function diaEMes(data: string): string {
  const [, m, d] = partes(data)
  return `${doisDigitos(d)}/${doisDigitos(m)}`
}
