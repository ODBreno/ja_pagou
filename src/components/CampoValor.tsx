import { useState, type ReactNode } from 'react'
import { lerValor, valorParaTexto } from '../lib/dinheiro'

interface Props {
  valor: number | null
  onMudar: (valor: number | null) => void
  /** Algo à direita dentro do campo (ex.: botão de copiar). */
  acessorio?: ReactNode
}

/** Campo em reais que aceita "1.234,56" e só avisa a mudança ao sair do campo. */
export function CampoValor({ valor, onMudar, acessorio }: Props) {
  const [texto, setTexto] = useState(valorParaTexto(valor))

  function confirmar() {
    const lido = lerValor(texto)
    setTexto(valorParaTexto(lido))
    if (lido !== valor) onMudar(lido)
  }

  return (
    <div className="flex items-center rounded-lg border border-borda bg-elevado px-3 focus-within:border-destaque">
      <span className="text-sm text-apagado">R$</span>
      <input
        inputMode="decimal"
        placeholder="0,00"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
        className="w-full min-w-0 bg-transparent px-2 py-2 outline-none"
      />
      {acessorio}
    </div>
  )
}
