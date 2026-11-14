import { BellRing, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ativarNotificacoes, sincronizarNotificacoes, type EstadoNotificacoes } from '../dados/notificacoes'
import { mostrarAviso } from '../lib/aviso'

const CHAVE_DISPENSADO = 'ja-pagamos:aviso-notificacoes-dispensado'
const ehIphone = /iphone|ipad/i.test(navigator.userAgent)
const instalado = window.matchMedia('(display-mode: standalone)').matches

function dispensado(): boolean {
  try {
    return localStorage.getItem(CHAVE_DISPENSADO) === '1'
  } catch {
    return false
  }
}

/**
 * Cartão no topo do mês para quem ainda não ativou as notificações neste aparelho.
 * Liberar a permissão nas configurações do celular não basta: o app precisa se inscrever no push
 * e cadastrar o aparelho no servidor, e isso só acontece pelo botão (ou sozinho, ao abrir o app,
 * quando a permissão já está dada).
 */
export function AvisoNotificacoes() {
  const [estado, setEstado] = useState<EstadoNotificacoes | null>(null)
  const [fechado, setFechado] = useState(dispensado)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    sincronizarNotificacoes().then(setEstado)
  }, [])

  const precisaInstalar = estado === 'sem_suporte' && ehIphone && !instalado
  if (fechado || !(estado === 'desativadas' || precisaInstalar)) return null

  function fechar() {
    try {
      localStorage.setItem(CHAVE_DISPENSADO, '1')
    } catch {
      // sem armazenamento: só esconde nesta sessão
    }
    setFechado(true)
  }

  async function ativar() {
    setOcupado(true)
    try {
      const novo = await ativarNotificacoes()
      setEstado(novo)
      if (novo === 'ativadas') mostrarAviso('Notificações ativadas neste celular ✓')
      else if (novo === 'bloqueadas') mostrarAviso('Notificações bloqueadas. Libere nas configurações do celular.', 'erro')
    } catch (erro) {
      mostrarAviso(`Não deu para ativar: ${(erro as Error).message}`, 'erro')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl bg-destaque/15 p-4 ring-1 ring-destaque/40">
      <BellRing size={20} className="mt-0.5 shrink-0 text-destaque-claro" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Receber os lembretes neste celular?</p>
        {precisaInstalar ? (
          <p className="mt-1 text-sm text-suave">
            No iPhone, primeiro adicione o app à Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-suave">Avisamos antes do vencimento das contas que ainda não foram pagas.</p>
            <button
              type="button"
              disabled={ocupado}
              onClick={ativar}
              className="mt-3 w-full rounded-lg bg-destaque py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {ocupado ? 'Ativando…' : 'Ativar notificações'}
            </button>
          </>
        )}
      </div>
      <button type="button" onClick={fechar} className="-m-1 rounded-full p-1 text-apagado" aria-label="Fechar aviso">
        <X size={18} />
      </button>
    </div>
  )
}
