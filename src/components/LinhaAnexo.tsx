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
    } catch (erro) {
      alert(`Não foi possível salvar o arquivo: ${(erro as Error).message}`)
    } finally {
      setEnviando(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-borda p-3">
      <p className="text-xs font-semibold tracking-wide text-suave uppercase">{titulo}</p>
      {anexo ? (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => abrirAnexo(anexo)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-texto"
          >
            <Eye size={16} className="shrink-0 text-destaque-claro" />
            <span className="truncate underline">{anexo.nome}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Remover "${anexo.nome}"?`))
                onRemover().catch((erro: Error) => alert(`Não foi possível remover: ${erro.message}`))
            }}
            className="rounded-full p-1.5 text-apagado hover:bg-rose-500/15 hover:text-rose-400"
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
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-borda py-2.5 text-sm font-medium text-suave hover:border-destaque hover:text-destaque-claro disabled:opacity-50"
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
