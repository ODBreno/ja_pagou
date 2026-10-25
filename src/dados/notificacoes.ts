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
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

async function registro(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register('/sw.js')
}

export async function estadoNotificacoes(): Promise<EstadoNotificacoes> {
  if (!notificacoesSuportadas()) return 'sem_suporte'
  if (Notification.permission === 'denied') return 'bloqueadas'
  const inscricao = await (await registro()).pushManager.getSubscription()
  return inscricao && Notification.permission === 'granted' ? 'ativadas' : 'desativadas'
}

/** Pede permissão, inscreve este aparelho no push e guarda a inscrição no Supabase. */
export async function ativarNotificacoes(email: string): Promise<EstadoNotificacoes> {
  if (!notificacoesSuportadas()) return 'sem_suporte'
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return permissao === 'denied' ? 'bloqueadas' : 'desativadas'

  const reg = await registro()
  await navigator.serviceWorker.ready
  const inscricao =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: paraBytes(CHAVE_PUBLICA!) }))
  const { endpoint, keys } = inscricao.toJSON()
  const { error } = await supabase
    .from('inscricoes_push')
    .upsert({ endpoint, p256dh: keys!.p256dh, auth: keys!.auth, email })
  if (error) throw new Error(error.message)
  return 'ativadas'
}

export async function desativarNotificacoes(): Promise<EstadoNotificacoes> {
  const inscricao = await (await registro()).pushManager.getSubscription()
  if (inscricao) {
    await supabase.from('inscricoes_push').delete().eq('endpoint', inscricao.endpoint)
    await inscricao.unsubscribe()
  }
  return 'desativadas'
}

/** Chama a função da Vercel autenticado com o login atual. */
async function chamarServidor(corpo: Record<string, string>): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const resposta = await fetch('/api/notificacoes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token}` },
    body: JSON.stringify(corpo),
  })
  if (!resposta.ok) throw new Error(await resposta.text())
}

export function enviarNotificacaoDeTeste(): Promise<void> {
  return chamarServidor({ acao: 'teste' })
}

/** O servidor confere se o mês está mesmo todo pago e só avisa uma vez por mês. */
export function avisarMesTodoPago(mes: string): Promise<void> {
  return chamarServidor({ acao: 'tudo-pago', mes })
}
