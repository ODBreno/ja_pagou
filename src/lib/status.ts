import type { ContaDoMes } from '../tipos'
import { diasAte } from './datas'

/**
 * O status sai dos anexos, não de um campo editável: com comprovante está pago,
 * com a conta em mãos (ou débito automático) falta pagar, senão falta chegar a conta.
 */
export type Status = 'aguardando_conta' | 'a_pagar' | 'pago'

export function statusDa(conta: ContaDoMes): Status {
  if (conta.comprovante) return 'pago'
  if (conta.tipo === 'debito' || conta.conta) return 'a_pagar'
  return 'aguardando_conta'
}

export function estaAtrasada(conta: ContaDoMes): boolean {
  return statusDa(conta) !== 'pago' && diasAte(conta.vencimento) < 0
}
