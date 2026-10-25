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
      <div className="mt-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMudarMes(somarMeses(mes, -1))}
          className="rounded-full p-2 text-suave hover:bg-elevado"
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
              className="text-xs font-medium text-destaque-claro underline"
            >
              voltar para o mês atual
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onMudarMes(somarMeses(mes, 1))}
          className="rounded-full p-2 text-suave hover:bg-elevado"
          aria-label="Próximo mês"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </header>
  )
}
