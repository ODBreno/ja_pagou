import { supabase } from './supabase'

/** Chave pública VAPID (a privada fica só no servidor, na Vercel). */
const CHAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type EstadoNotificacoes = 'sem_suporte' | 'bloqueadas' | 'desativadas' | 'ativadas'

/** Só em produção: o service worker em desenvolvimento guardaria em cache os módulos do Vite. */
export function notificacoesSuportadas(): boolean {
  return (
    import.meta.env.PROD &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!CHAVE_PUBLICA
  )
}

function paraBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const limpa = base64Url.trim()
  const base64 = (limpa + '='.repeat((4 - (limpa.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

function mesmosBytes(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.byteLength) return false
  const x = new Uint8Array(a)
  return x.every((v, i) => v === b[i])
}

async function registro(): Promise<ServiceWorkerRegistration> {
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
  await navigator.serviceWorker.ready
  return reg
}

export async function estadoNotificacoes(): Promise<EstadoNotificacoes> {
  if (!notificacoesSuportadas()) return 'sem_suporte'
  if (Notification.permission === 'denied') return 'bloqueadas'
  if (Notification.permission !== 'granted') return 'desativadas'
  const inscricao = await (await registro()).pushManager.getSubscription()
  return inscricao ? 'ativadas' : 'desativadas'
}

/** Chama a função da Vercel autenticado com o login atual. */
async function chamarServidor<T = unknown>(corpo: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const resposta = await fetch('/api/notificacoes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token}` },
    body: JSON.stringify(corpo),
  })
  const texto = await resposta.text()
  let json: (T & { erro?: string }) | null = null
  try {
    json = JSON.parse(texto)
  } catch {
    // resposta não era JSON (ex.: erro da própria Vercel)
  }
  if (!resposta.ok) throw new Error(json?.erro ?? (texto || `erro ${resposta.status}`))
  return json as T
}

/**
 * Garante que este aparelho tem uma inscrição de push válida e que ela está cadastrada no servidor.
 * Refaz a inscrição se ela foi criada com outra chave VAPID (senão o envio falha com 403 para sempre).
 */
async function garantirInscricao(): Promise<number> {
  const chave = paraBytes(CHAVE_PUBLICA!)
  const reg = await registro()
  let inscricao = await reg.pushManager.getSubscription()
  // options.applicationServerKey não existe em navegadores antigos: aí confia na inscrição atual.
  const chaveDaInscricao = inscricao?.options?.applicationServerKey
  if (inscricao && chaveDaInscricao && !mesmosBytes(chaveDaInscricao, chave)) {
    await inscricao.unsubscribe()
    inscricao = null
  }
  inscricao ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave })
  const { aparelhos } = await chamarServidor<{ aparelhos: number }>({ acao: 'inscrever', inscricao: inscricao.toJSON() })
  return aparelhos
}

/** Pede permissão, inscreve este aparelho no push e cadastra no servidor. Precisa vir de um toque. */
export async function ativarNotificacoes(): Promise<EstadoNotificacoes> {
  if (!notificacoesSuportadas()) return 'sem_suporte'
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return permissao === 'denied' ? 'bloqueadas' : 'desativadas'
  await garantirInscricao()
  return 'ativadas'
}

/**
 * Roda toda vez que o app abre: se a permissão já foi dada, recadastra a inscrição no servidor.
 * Conserta sozinho o aparelho que "está ativado" mas sumiu do banco (inscrição expirada e
 * apagada, permissão dada pelas configurações do celular sem tocar em "Ativar", troca de chave...).
 */
export async function sincronizarNotificacoes(): Promise<EstadoNotificacoes> {
  if (!notificacoesSuportadas()) return 'sem_suporte'
  if (Notification.permission !== 'granted') return Notification.permission === 'denied' ? 'bloqueadas' : 'desativadas'
  try {
    await garantirInscricao()
    return 'ativadas'
  } catch (erro) {
    console.warn('Não deu para sincronizar as notificações', erro)
    return estadoNotificacoes()
  }
}

export async function desativarNotificacoes(): Promise<EstadoNotificacoes> {
  const inscricao = await (await registro()).pushManager.getSubscription()
  if (inscricao) {
    await chamarServidor({ acao: 'desinscrever', endpoint: inscricao.endpoint }).catch(() => {})
    await inscricao.unsubscribe()
  }
  return 'desativadas'
}

/** Antes do teste recadastra o aparelho, para o teste refletir o estado real. */
export async function enviarNotificacaoDeTeste(): Promise<string> {
  await garantirInscricao()
  const r = await chamarServidor<{ aparelhos: number; total: number; falhas: string[] }>({ acao: 'teste' })
  const base = r.aparelhos === 1 ? 'Teste enviado para 1 aparelho seu.' : `Teste enviado para ${r.aparelhos} aparelhos seus.`
  return r.falhas.length ? `${base} Falhou em ${r.falhas.length}: ${r.falhas.join(' | ')}` : `${base} Deve chegar em segundos.`
}

/** O servidor confere se o mês está mesmo todo pago e só avisa uma vez por mês. */
export async function avisarMesTodoPago(mes: string): Promise<void> {
  await chamarServidor({ acao: 'tudo-pago', mes })
}
