import { MES_INICIAL, mesAtual, nomeDoMes, somarMeses } from '../lib/datas'
import { SeletorPeriodo } from './SeletorPeriodo'

interface Props {
  mes: string
  onMudarMes: (mes: string) => void
  onAbrirConfiguracoes: () => void
}

export function CabecalhoMes({ mes, onMudarMes, onAbrirConfiguracoes }: Props) {
  return (
    <SeletorPeriodo
      titulo={nomeDoMes(mes)}
      podeVoltar={mes > MES_INICIAL}
      onAnterior={() => onMudarMes(somarMeses(mes, -1))}
      onProximo={() => onMudarMes(somarMeses(mes, 1))}
      onAbrirConfiguracoes={onAbrirConfiguracoes}
      extra={
        mes !== mesAtual() && (
          <button
            type="button"
            onClick={() => onMudarMes(mesAtual())}
            className="text-xs font-medium text-destaque-claro underline"
          >
            voltar para o mês atual
          </button>
        )
      }
    />
  )
}
