import { useState } from 'react'
import { nomeCurtoDoMes, nomeDoMes } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'

export interface Ponto {
  mes: string
  valor: number | null
}

const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

/** Escala "redonda": passos de 1, 2, 2,5 ou 5 × 10ⁿ, com 3 a 4 linhas de grade. */
function escala(maximo: number): number[] {
  if (maximo <= 0) return [0]
  const bruto = maximo / 3
  const magnitude = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((p) => p >= bruto)!
  const marcas: number[] = []
  for (let v = 0; v <= maximo + passo * 0.001 || marcas.length < 2; v += passo) marcas.push(v)
  if (marcas[marcas.length - 1] < maximo) marcas.push(marcas[marcas.length - 1] + passo)
  return marcas
}

/**
 * Colunas de uma série só (sem legenda: o título já diz o que é). Tocar ou passar o mouse
 * numa coluna mostra o valor no topo; por padrão mostra o último mês com valor.
 */
export function GraficoColunas({ pontos }: { pontos: Ponto[] }) {
  const comValor = pontos.filter((p) => p.valor != null)
  const ultimo = comValor[comValor.length - 1]
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const destaque = pontos.find((p) => p.mes === selecionado) ?? ultimo
  const marcas = escala(Math.max(0, ...comValor.map((p) => p.valor!)))
  const topo = marcas[marcas.length - 1] || 1

  return (
    <div>
      <p className="h-12 text-sm text-suave" aria-live="polite">
        {destaque && (
          <>
            {nomeDoMes(destaque.mes)}
            <br />
            <strong className="text-base text-texto">
              {destaque.valor == null ? 'sem valor' : formatarReais(destaque.valor)}
            </strong>
          </>
        )}
      </p>
      <div className="mt-5 flex gap-2">
        <div className="relative h-40 w-10 shrink-0 text-right text-[10px] text-apagado tabular-nums">
          {marcas.map((m) => (
            <span key={m} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(m / topo) * 100}%` }}>
              {compacto.format(m)}
            </span>
          ))}
        </div>
        <div className="relative h-40 flex-1">
          {marcas.map((m) => (
            <div
              key={m}
              className="absolute inset-x-0 h-px bg-borda"
              style={{ bottom: `${(m / topo) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex">
            {pontos.map((p) => (
              <button
                key={p.mes}
                type="button"
                onMouseEnter={() => setSelecionado(p.mes)}
                onFocus={() => setSelecionado(p.mes)}
                onClick={() => setSelecionado(p.mes)}
                aria-label={`${nomeDoMes(p.mes)}: ${p.valor == null ? 'sem valor' : formatarReais(p.valor)}`}
                className="flex h-full flex-1 items-end justify-center"
              >
                {p.valor != null && (
                  <span
                    className={`block w-full max-w-6 rounded-t-[4px] transition-opacity ${
                      destaque?.mes === p.mes ? 'bg-destaque-claro' : 'bg-destaque'
                    }`}
                    style={{ height: `${Math.max((p.valor / topo) * 100, 1)}%` }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-1 flex gap-2">
        <div className="w-10 shrink-0" />
        <div className="flex flex-1">
          {pontos.map((p) => (
            <span key={p.mes} className="flex-1 text-center text-[10px] text-apagado capitalize">
              {nomeCurtoDoMes(p.mes)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
