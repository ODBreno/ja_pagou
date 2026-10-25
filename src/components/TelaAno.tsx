import { CircleAlert, CircleCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { carregarAno } from '../dados/repositorio'
import { MES_INICIAL, mesAtual, mesesEntre, nomeCurtoDoMes } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import { estaAtrasada, statusDa } from '../lib/status'
import type { ContaDoMes } from '../tipos'
import { SeletorPeriodo } from './SeletorPeriodo'

interface Props {
  ano: number
  onMudarAno: (ano: number) => void
  onAbrirMes: (mes: string) => void
  onAbrirConfiguracoes: () => void
}

const ANO_INICIAL = Number(MES_INICIAL.slice(0, 4))

function CartaoMes({ mes, contas, onAbrir }: { mes: string; contas: ContaDoMes[]; onAbrir: () => void }) {
  const antesDoInicio = mes < MES_INICIAL
  const ehAtual = mes === mesAtual()
  const pagas = contas.filter((c) => statusDa(c) === 'pago').length
  const atrasadas = contas.filter(estaAtrasada).length
  const tudoPago = contas.length > 0 && pagas === contas.length

  let situacao
  if (antesDoInicio) situacao = <span className="text-apagado">—</span>
  else if (!contas.length) situacao = <span className="text-apagado">Não aberto</span>
  else if (tudoPago)
    situacao = (
      <span className="flex items-center gap-1 text-emerald-300">
        <CircleCheck size={14} /> Tudo pago
      </span>
    )
  else if (atrasadas)
    situacao = (
      <span className="flex items-center gap-1 text-rose-300">
        <CircleAlert size={14} /> {atrasadas} {atrasadas === 1 ? 'atrasada' : 'atrasadas'}
      </span>
    )
  else situacao = <span className="text-suave">{pagas} de {contas.length} pagas</span>

  return (
    <button
      type="button"
      disabled={antesDoInicio}
      onClick={onAbrir}
      className={`flex aspect-square flex-col justify-between rounded-2xl bg-superficie p-3 text-left disabled:opacity-40 ${
        ehAtual ? 'ring-2 ring-destaque' : 'ring-1 ring-borda'
      }`}
    >
      <span className="text-lg font-bold capitalize">{nomeCurtoDoMes(mes)}</span>
      <span className="space-y-1.5 text-xs font-medium">
        <span className="block">{situacao}</span>
        {!antesDoInicio && contas.length > 0 && (
          <span className="block h-1 overflow-hidden rounded-full bg-elevado">
            <span
              className="block h-full rounded-full bg-destaque"
              style={{ width: `${(pagas / contas.length) * 100}%` }}
            />
          </span>
        )}
      </span>
    </button>
  )
}

export function TelaAno({ ano, onMudarAno, onAbrirMes, onAbrirConfiguracoes }: Props) {
  const [contas, setContas] = useState<ContaDoMes[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    carregarAno(ano)
      .then((carregadas) => ativo && setContas(carregadas))
      .catch((e: Error) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
  }, [ano])

  const totalPago = (contas ?? [])
    .filter((c) => statusDa(c) === 'pago')
    .reduce((soma, c) => soma + (c.valor ?? 0), 0)

  return (
    <div className="mx-auto max-w-md px-4 pb-28">
      <SeletorPeriodo
        titulo={String(ano)}
        podeVoltar={ano > ANO_INICIAL}
        onAnterior={() => onMudarAno(ano - 1)}
        onProximo={() => onMudarAno(ano + 1)}
        onAbrirConfiguracoes={onAbrirConfiguracoes}
      />
      {erro && <p className="mb-3 rounded-xl bg-rose-500/15 p-3 text-sm text-rose-300">Erro ao carregar: {erro}</p>}
      {contas === null ? (
        !erro && <p className="py-10 text-center text-apagado">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {mesesEntre(`${ano}-01`, `${ano}-12`).map((mes) => (
              <CartaoMes
                key={mes}
                mes={mes}
                contas={contas.filter((c) => c.mes === mes)}
                onAbrir={() => onAbrirMes(mes)}
              />
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-suave">
            Pago em {ano}: <strong className="text-texto">{formatarReais(totalPago)}</strong>
          </p>
        </>
      )}
    </div>
  )
}
