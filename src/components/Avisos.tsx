import { CircleAlert, CircleCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ouvirAvisos, type AvisoRapido } from '../lib/aviso'

/** Mostra os avisos de mostrarAviso() no topo, um embaixo do outro, por alguns segundos. */
export function Avisos() {
  const [avisos, setAvisos] = useState<AvisoRapido[]>([])

  useEffect(
    () =>
      ouvirAvisos((aviso) => {
        setAvisos((atuais) => [...atuais.slice(-2), aviso])
        setTimeout(
          () => setAvisos((atuais) => atuais.filter((a) => a.id !== aviso.id)),
          aviso.tipo === 'erro' ? 6000 : 2500,
        )
      }),
    [],
  )

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
    >
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          role={aviso.tipo === 'erro' ? 'alert' : 'status'}
          className={`flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg shadow-black/40 ${
            aviso.tipo === 'erro' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {aviso.tipo === 'erro' ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
          {aviso.texto}
        </div>
      ))}
    </div>
  )
}
