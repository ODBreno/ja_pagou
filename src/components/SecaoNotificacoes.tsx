import { Bell, BellOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  ativarNotificacoes,
  desativarNotificacoes,
  enviarNotificacaoDeTeste,
  estadoNotificacoes,
  type EstadoNotificacoes,
} from '../dados/notificacoes'

const ehIphone = /iphone|ipad/i.test(navigator.userAgent)
const instalado = window.matchMedia('(display-mode: standalone)').matches

const AVISOS = [
  'Começo do mês: lembrete para não esquecer das contas',
  '5 dias antes, 1 dia antes e no dia do vencimento (se ainda não pagou)',
  'Quando todas as contas do mês forem pagas',
]

/** Fica fora do formulário de configurações: ativar vale na hora, só para este aparelho. */
export function SecaoNotificacoes({ email }: { email: string }) {
  const [estado, setEstado] = useState<EstadoNotificacoes | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)

  useEffect(() => {
    estadoNotificacoes().then(setEstado)
  }, [])

  async function executar(acao: () => Promise<EstadoNotificacoes | void>, sucesso?: string) {
    setOcupado(true)
    setMensagem(null)
    try {
      const novo = await acao()
      if (novo) setEstado(novo)
      if (sucesso) setMensagem(sucesso)
    } catch (erro) {
      setMensagem(`Não deu certo: ${(erro as Error).message}`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="space-y-3 rounded-2xl bg-superficie p-4 ring-1 ring-borda">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <Bell size={16} className="text-destaque-claro" /> Notificações
        </h2>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-suave">
          {AVISOS.map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
        </ul>
      </div>

      {estado === 'sem_suporte' && (
        <p className="text-sm text-amber-300">
          {ehIphone && !instalado
            ? 'No iPhone, primeiro adicione o app à Tela de Início (Compartilhar → Adicionar à Tela de Início) e ative por lá.'
            : 'Este navegador não suporta notificações.'}
        </p>
      )}
      {estado === 'bloqueadas' && (
        <p className="text-sm text-amber-300">
          As notificações foram bloqueadas. Libere nas configurações do navegador (cadeado ao lado do endereço) ou do
          celular e volte aqui.
        </p>
      )}
      {estado === 'desativadas' && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => executar(() => ativarNotificacoes(email), 'Notificações ativadas neste aparelho.')}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-destaque py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Bell size={16} /> Ativar neste aparelho
        </button>
      )}
      {estado === 'ativadas' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => executar(enviarNotificacaoDeTeste, 'Teste enviado. Deve chegar em alguns segundos.')}
            className="flex-1 rounded-lg bg-destaque px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Mandar um teste
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => executar(desativarNotificacoes, 'Notificações desativadas neste aparelho.')}
            className="flex items-center gap-1.5 rounded-lg bg-elevado px-3 py-2.5 text-sm text-suave disabled:opacity-50"
          >
            <BellOff size={16} /> Desativar
          </button>
        </div>
      )}
      {mensagem && <p className="text-sm text-suave">{mensagem}</p>}
    </section>
  )
}
