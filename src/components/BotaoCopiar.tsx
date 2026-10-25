import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { copiarTexto } from '../lib/copiar'

interface Props {
  texto: string
  rotulo?: string
  /** compacto: só o ícone, para ficar dentro de um campo. */
  compacto?: boolean
}

export function BotaoCopiar({ texto, rotulo = 'Copiar', compacto = false }: Props) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    if (!(await copiarTexto(texto))) {
      alert('Não foi possível copiar. Selecione o texto e copie manualmente.')
      return
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const Icone = copiado ? Check : Copy
  if (compacto) {
    return (
      <button
        type="button"
        onClick={copiar}
        aria-label={copiado ? 'Copiado' : rotulo}
        className={`shrink-0 rounded-md p-1.5 ${copiado ? 'text-emerald-400' : 'text-suave hover:text-destaque-claro'}`}
      >
        <Icone size={16} />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={copiar}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
        copiado ? 'bg-emerald-500/15 text-emerald-300' : 'bg-destaque text-white'
      }`}
    >
      <Icone size={16} />
      {copiado ? 'Copiado!' : rotulo}
    </button>
  )
}
