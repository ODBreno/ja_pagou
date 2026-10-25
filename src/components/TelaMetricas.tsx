import { ArrowDownRight, ArrowUpRight, Settings } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { carregarHistoricoDeValores } from '../dados/repositorio'
import { MES_INICIAL, mesAtual, mesesEntre, nomeDoMes, somarMeses } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import type { ContaDoMes } from '../tipos'
import { GraficoColunas, type Ponto } from './GraficoColunas'

const TOTAL = 'total'

interface Opcao {
  id: string
  nome: string
}

/** Contas avulsas entram só no total; cada conta fixa vira uma opção (com o nome mais recente). */
function opcoesDe(contas: ContaDoMes[]): Opcao[] {
  const porId = new Map<string, string>()
  for (const c of contas) if (c.contaFixaId) porId.set(c.contaFixaId, c.nome)
  return [{ id: TOTAL, nome: 'Total' }, ...[...porId].map(([id, nome]) => ({ id, nome }))]
}

/** Últimos 12 meses até o mês atual (ou o último com valor, se for depois), nunca antes do início. */
function pontosDe(contas: ContaDoMes[], opcao: string): Ponto[] {
  const ultimoComValor = contas.length ? contas[contas.length - 1].mes : MES_INICIAL
  const fim = ultimoComValor > mesAtual() ? ultimoComValor : mesAtual()
  const inicio = somarMeses(fim, -11) > MES_INICIAL ? somarMeses(fim, -11) : MES_INICIAL
  return mesesEntre(inicio, fim).map((mes) => {
    const doMes = contas.filter((c) => c.mes === mes && (opcao === TOTAL || c.contaFixaId === opcao))
    return { mes, valor: doMes.length ? doMes.reduce((soma, c) => soma + c.valor!, 0) : null }
  })
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-superficie p-3 ring-1 ring-borda">
      <p className="text-xs text-suave">{rotulo}</p>
      <p className="mt-1 font-semibold">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs">{detalhe}</p>}
    </div>
  )
}

export function TelaMetricas({ onAbrirConfiguracoes }: { onAbrirConfiguracoes: () => void }) {
  const [contas, setContas] = useState<ContaDoMes[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [opcao, setOpcao] = useState(TOTAL)

  useEffect(() => {
    carregarHistoricoDeValores()
      .then(setContas)
      .catch((e: Error) => setErro(e.message))
  }, [])

  const pontos = contas ? pontosDe(contas, opcao) : []
  const comValor = pontos.filter((p) => p.valor != null)
  const ultimo = comValor[comValor.length - 1]
  const anterior = comValor[comValor.length - 2]
  const media = comValor.length ? comValor.reduce((s, p) => s + p.valor!, 0) / comValor.length : 0
  const variacao = ultimo && anterior?.valor ? (ultimo.valor! - anterior.valor) / anterior.valor : null

  return (
    <div className="mx-auto max-w-md px-4 pb-28">
      <header className="sticky top-0 z-10 bg-fundo/90 pt-4 pb-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-wide text-destaque-claro">Já pagamos?</p>
          <button
            type="button"
            onClick={onAbrirConfiguracoes}
            className="rounded-full p-2 text-suave hover:bg-elevado"
            aria-label="Configurações"
          >
            <Settings size={20} />
          </button>
        </div>
        <h1 className="mt-1 text-2xl font-bold">Métricas</h1>
      </header>

      {erro && <p className="mb-3 rounded-xl bg-rose-500/15 p-3 text-sm text-rose-300">Erro ao carregar: {erro}</p>}
      {contas === null ? (
        !erro && <p className="py-10 text-center text-apagado">Carregando…</p>
      ) : !contas.length ? (
        <p className="rounded-2xl bg-superficie p-4 text-sm text-suave ring-1 ring-borda">
          Preencha o valor das contas na tela do mês para ver quanto cada uma custou ao longo do tempo.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
            {opcoesDe(contas).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOpcao(o.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                  opcao === o.id ? 'bg-destaque text-white' : 'bg-elevado text-suave'
                }`}
              >
                {o.nome}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Indicador rotulo="Último mês" valor={ultimo ? formatarReais(ultimo.valor!) : '—'} />
            <Indicador rotulo="Média" valor={comValor.length ? formatarReais(media) : '—'} />
            <Indicador
              rotulo="Vs. anterior"
              valor={variacao == null ? '—' : `${variacao > 0 ? '+' : ''}${Math.round(variacao * 100)}%`}
              detalhe={
                variacao != null &&
                variacao !== 0 &&
                (variacao > 0 ? (
                  <span className="flex items-center gap-0.5 text-rose-300">
                    <ArrowUpRight size={12} /> subiu
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-emerald-300">
                    <ArrowDownRight size={12} /> caiu
                  </span>
                ))
              }
            />
          </div>

          <section className="rounded-2xl bg-superficie p-4 ring-1 ring-borda">
            <h2 className="font-semibold">Valor por mês</h2>
            <GraficoColunas key={opcao} pontos={pontos} />
          </section>

          <section className="rounded-2xl bg-superficie ring-1 ring-borda">
            <h2 className="px-4 pt-4 font-semibold">Tabela</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {[...pontos].reverse().map((p) => (
                  <tr key={p.mes} className="border-t border-borda">
                    <td className="px-4 py-2 text-suave">{nomeDoMes(p.mes)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {p.valor == null ? '—' : formatarReais(p.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  )
}
