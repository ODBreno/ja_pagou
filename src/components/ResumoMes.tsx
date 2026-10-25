import { diasAte } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import { estaAtrasada, statusDa } from '../lib/status'
import type { ContaDoMes } from '../tipos'

export function ResumoMes({ contas }: { contas: ContaDoMes[] }) {
  const pagas = contas.filter((c) => statusDa(c) === 'pago')
  const atrasadas = contas.filter(estaAtrasada).length
  const vencendo = contas.filter((c) => {
    const dias = diasAte(c.vencimento)
    return statusDa(c) !== 'pago' && dias >= 0 && dias <= 3
  }).length
  const total = contas.reduce((soma, c) => soma + (c.valor ?? 0), 0)
  const totalPago = pagas.reduce((soma, c) => soma + (c.valor ?? 0), 0)
  const progresso = contas.length ? (pagas.length / contas.length) * 100 : 0

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <p className="text-lg font-semibold">
          {pagas.length} de {contas.length} pagas
        </p>
        {total > 0 && (
          <p className="text-sm text-slate-500">
            {formatarReais(totalPago)} de {formatarReais(total)}
          </p>
        )}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progresso}%` }} />
      </div>
      {(atrasadas > 0 || vencendo > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          {atrasadas > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">
              {atrasadas} {atrasadas === 1 ? 'atrasada' : 'atrasadas'}
            </span>
          )}
          {vencendo > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
              {vencendo} vencendo em até 3 dias
            </span>
          )}
        </div>
      )}
    </section>
  )
}
