import { Eye, Paperclip, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { abrirAnexo } from '../lib/abrirAnexo'
import type { Anexo } from '../tipos'

interface Props {
  titulo: string
  dica: string
  anexo: Anexo | null
  onAnexar: (arquivo: File) => Promise<void>
  onRemover: () => Promise<void>
}

export function LinhaAnexo({ titulo, dica, anexo, onAnexar, onRemover }: Props) {
  const entrada = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)

  async function aoEscolher(arquivo: File | undefined) {
    if (!arquivo) return
    setEnviando(true)
    try {
      await onAnexar(arquivo)
    } finally {
      setEnviando(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{titulo}</p>
      {anexo ? (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => abrirAnexo(anexo)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-slate-700"
          >
            <Eye size={16} className="shrink-0 text-emerald-600" />
            <span className="truncate underline">{anexo.nome}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Remover "${anexo.nome}"?`)) onRemover()
            }}
            className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            aria-label={`Remover ${titulo.toLowerCase()}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={enviando}
          onClick={() => entrada.current?.click()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
        >
          <Paperclip size={16} />
          {enviando ? 'Salvando…' : dica}
        </button>
      )}
      <input
        ref={entrada}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => aoEscolher(e.target.files?.[0])}
      />
    </div>
  )
}
