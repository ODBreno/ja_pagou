import { CalendarCheck, CalendarDays, ChartColumn } from 'lucide-react'

export type Aba = 'mes' | 'ano' | 'metricas'

const ABAS = [
  { id: 'mes', rotulo: 'Mês', Icone: CalendarCheck },
  { id: 'ano', rotulo: 'Ano', Icone: CalendarDays },
  { id: 'metricas', rotulo: 'Métricas', Icone: ChartColumn },
] as const

export function MenuInferior({ aba, onTrocar }: { aba: Aba; onTrocar: (aba: Aba) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-borda bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {ABAS.map(({ id, rotulo, Icone }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTrocar(id)}
            aria-current={aba === id ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
              aba === id ? 'text-destaque-claro' : 'text-apagado'
            }`}
          >
            <Icone size={22} />
            {rotulo}
          </button>
        ))}
      </div>
    </nav>
  )
}
