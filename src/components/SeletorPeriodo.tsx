import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  titulo: string
  podeVoltar: boolean
  onAnterior: () => void
  onProximo: () => void
  onAbrirConfiguracoes: () => void
  /** Linha extra abaixo do título (ex.: "voltar para o mês atual"). */
  extra?: ReactNode
}

/** Topo fixo com a marca, a engrenagem e as setas para trocar de mês ou de ano. */
export function SeletorPeriodo({ titulo, podeVoltar, onAnterior, onProximo, onAbrirConfiguracoes, extra }: Props) {
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
          onClick={onAnterior}
          disabled={!podeVoltar}
          className="rounded-full p-2 text-suave hover:bg-elevado disabled:invisible"
          aria-label="Anterior"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{titulo}</h1>
          {extra}
        </div>
        <button
          type="button"
          onClick={onProximo}
          className="rounded-full p-2 text-suave hover:bg-elevado"
          aria-label="Próximo"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </header>
  )
}
