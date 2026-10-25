import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { mesAtual, nomeDoMes, somarMeses } from '../lib/datas'

interface Props {
  mes: string
  onMudarMes: (mes: string) => void
  onAbrirConfiguracoes: () => void
}

export function CabecalhoMes({ mes, onMudarMes, onAbrirConfiguracoes }: Props) {
  const ehMesAtual = mes === mesAtual()

  return (
    <header className="sticky top-0 z-10 bg-slate-100/90 pt-4 pb-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-emerald-700">Já pagamos?</p>
        <button
          type="button"
          onClick={onAbrirConfiguracoes}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-200"
          aria-label="Configurações"
        >
          <Settings size={20} />
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMudarMes(somarMeses(mes, -1))}
          className="rounded-full p-2 text-slate-600 hover:bg-slate-200"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{nomeDoMes(mes)}</h1>
          {!ehMesAtual && (
            <button
              type="button"
              onClick={() => onMudarMes(mesAtual())}
              className="text-xs font-medium text-emerald-700 underline"
            >
              voltar para o mês atual
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onMudarMes(somarMeses(mes, 1))}
          className="rounded-full p-2 text-slate-600 hover:bg-slate-200"
          aria-label="Próximo mês"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </header>
  )
}
