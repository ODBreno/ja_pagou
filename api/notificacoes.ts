// Função da Vercel que manda as notificações push.
//   GET  (Vercel Cron, 1x por dia): lembretes de vencimento e o aviso de começo de mês.
//   POST (app, com o login do morador): { acao: 'inscrever' | 'desinscrever' | 'teste' | 'tudo-pago' }.
//   POST (service worker, sem login):   { acao: 'trocar' } quando o navegador renova a inscrição.
// Usa a chave secreta do Supabase (ignora o RLS), então toda entrada é validada aqui.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as webpushModulo from 'web-push'

// web-push é CommonJS: dependendo de como a Vercel compila, as funções vêm no namespace ou no default.
const webpush = ((webpushModulo as unknown as { default?: typeof webpushModulo }).default ??
  webpushModulo) as typeof webpushModulo

interface Conta {
  id: string
  mes: string
  conta_fixa_id: string | null
  nome: string
  vencimento: string
  valor: number | string | null
  comprovante: unknown
}

interface Fixa {
  id: string
  nome: string
  dia_vencimento: number
  valor_padrao: number | string | null
}

export interface Aviso {
  /** Chaves gravadas em avisos_enviados para não repetir. */
  chaves: string[]
  titulo: string
  corpo: string
  tag: string
}

const NOMES_DOS_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
/** Dias antes do vencimento em que avisa (se ainda não tiver comprovante). */
const DIAS_DE_AVISO = [5, 1, 0]

const doisDigitos = (n: number) => String(n).padStart(2, '0')
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Data de hoje no fuso de São Paulo, como YYYY-MM-DD (o servidor roda em UTC). */
export function hojeEmSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora)
}

function somarMeses(mes: string, quantidade: number): string {
  const [ano, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(ano, m - 1 + quantidade, 1))
  return `${d.getUTCFullYear()}-${doisDigitos(d.getUTCMonth() + 1)}`
}

function vencimentoNoMes(mes: string, dia: number): string {
  const [ano, m] = mes.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  return `${mes}-${doisDigitos(Math.min(dia, ultimoDia))}`
}

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000)
}

const nomeDoMes = (mes: string) => NOMES_DOS_MESES[Number(mes.slice(5, 7)) - 1]

/**
 * Decide o que avisar hoje. Pura (sem banco), para dar para testar.
 * Considera o mês atual e o próximo; contas fixas de um mês que ninguém abriu ainda
 * entram como pendentes, para o aviso de 5 dias funcionar na virada do mês.
 */
export function montarAvisosDoDia(hoje: string, contas: Conta[], fixas: Fixa[], jaEnviados: Set<string>): Aviso[] {
  const mesAtual = hoje.slice(0, 7)
  const avisos: Aviso[] = []

  const inicio = `inicio:${mesAtual}`
  if (Number(hoje.slice(8, 10)) <= 2 && !jaEnviados.has(inicio)) {
    const quantidade = fixas.length
    const nome = nomeDoMes(mesAtual)
    avisos.push({
      chaves: [inicio],
      titulo: `Começou ${nome}! 🗓️`,
      corpo: `${quantidade} contas na lista deste mês. Bora não deixar nenhuma passar? 💪`,
      tag: inicio,
    })
  }

  const itens: { chave: string; nome: string; dias: number; valor: number | null }[] = []
  for (const mes of [mesAtual, somarMeses(mesAtual, 1)]) {
    const doMes = contas.filter((c) => c.mes === mes)
    const virtuais: Conta[] = fixas
      .filter((f) => !doMes.some((c) => c.conta_fixa_id === f.id))
      .map((f) => ({
        id: `fixa-${f.id}`,
        mes,
        conta_fixa_id: f.id,
        nome: f.nome,
        vencimento: vencimentoNoMes(mes, f.dia_vencimento),
        valor: f.valor_padrao,
        comprovante: null,
      }))
    for (const conta of [...doMes, ...virtuais]) {
      if (conta.comprovante) continue
      const dias = diasEntre(hoje, conta.vencimento)
      if (!DIAS_DE_AVISO.includes(dias)) continue
      const chave = `vence:${dias}:${mes}:${conta.conta_fixa_id ?? conta.id}`
      if (jaEnviados.has(chave)) continue
      itens.push({ chave, nome: conta.nome, dias, valor: conta.valor == null ? null : Number(conta.valor) })
    }
  }

  if (itens.length) {
    itens.sort((a, b) => a.dias - b.dias)
    const quando = (dias: number) => (dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`)
    const comValor = (i: (typeof itens)[number]) => (i.valor != null ? ` (${reais(i.valor)})` : '')
    const titulo =
      itens.length === 1
        ? `${itens[0].dias === 0 ? '🚨' : '⏰'} ${itens[0].nome} vence ${quando(itens[0].dias)}`
        : `⏰ ${itens.length} contas vencendo`
    const corpo =
      itens.length === 1
        ? `Ainda sem comprovante${comValor(itens[0])}. Já pagou? Anexa lá no app!`
        : itens.map((i) => `• ${i.nome} vence ${quando(i.dias)}${comValor(i)}`).join('\n')
    avisos.push({ chaves: itens.map((i) => i.chave), titulo, corpo, tag: `vencimentos:${hoje}` })
  }

  return avisos
}

export function montarAvisoTudoPago(mes: string, quantidade: number): Aviso {
  return {
    chaves: [`tudo-pago:${mes}`],
    titulo: `Tudo pago em ${nomeDoMes(mes)}! 🎉`,
    corpo: `As ${quantidade} contas do mês estão quitadas. Pode relaxar 😌`,
    tag: `tudo-pago:${mes}`,
  }
}

// ---- Daqui para baixo: banco e envio ----

/** trim: valor colado no painel com espaço ou quebra de linha no fim quebra as chaves. */
function variavel(nome: string, ...alternativas: string[]): string {
  for (const n of [nome, ...alternativas]) if (process.env[n]?.trim()) return process.env[n]!.trim()
  throw new Error(`Variável de ambiente ${nome} não configurada`)
}

function clienteAdmin(): SupabaseClient {
  const url = variavel('SUPABASE_URL', 'VITE_SUPABASE_URL').replace(/\/(rest\/v1\/?)?$/, '')
  return createClient(url, variavel('SUPABASE_SECRET_KEY'), { auth: { persistSession: false } })
}

function configurarVapid(origem: string) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT?.trim() || origem,
      variavel('VAPID_PUBLIC_KEY', 'VITE_VAPID_PUBLIC_KEY'),
      variavel('VAPID_PRIVATE_KEY'),
    )
  } catch (erro) {
    throw new Error(`Chaves VAPID inválidas: ${(erro as Error).message}`)
  }
}

interface ResultadoEnvio {
  /** Aparelhos que aceitaram a notificação. */
  enviados: number
  /** Aparelhos cadastrados para quem tentou mandar. */
  total: number
  /** Motivo de cada falha (para mostrar no teste e no log). */
  falhas: string[]
}

/** Manda para os aparelhos inscritos (todos, ou só os de um e-mail) e limpa inscrições expiradas. */
async function enviar(banco: SupabaseClient, aviso: Aviso, email?: string): Promise<ResultadoEnvio> {
  let consulta = banco.from('inscricoes_push').select('endpoint, p256dh, auth, email')
  if (email) consulta = consulta.eq('email', email)
  const { data: inscricoes, error } = await consulta
  if (error) throw new Error(`Erro ao ler inscricoes_push: ${error.message}`)

  const payload = JSON.stringify({ titulo: aviso.titulo, corpo: aviso.corpo, tag: aviso.tag })
  const resultado: ResultadoEnvio = { enviados: 0, total: inscricoes?.length ?? 0, falhas: [] }
  for (const i of inscricoes ?? []) {
    try {
      await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, payload, {
        TTL: 60 * 60 * 24,
        // "high": o Android entrega na hora mesmo com o celular parado (modo soneca); "normal" pode atrasar horas.
        urgency: 'high',
      })
      resultado.enviados++
    } catch (erro) {
      const status = (erro as { statusCode?: number }).statusCode
      const detalhe = (erro as { body?: string }).body || (erro as Error).message
      const servico = new URL(i.endpoint).hostname
      if (status === 404 || status === 410) {
        // O navegador cancelou essa inscrição; o app cadastra a nova quando for aberto.
        await banco.from('inscricoes_push').delete().eq('endpoint', i.endpoint)
        resultado.falhas.push(`inscrição expirada em ${servico} (removida)`)
      } else {
        resultado.falhas.push(`${servico} respondeu ${status ?? 'erro'}: ${String(detalhe).slice(0, 160)}`)
      }
      console.error('Falha ao enviar push', i.email, servico, status, detalhe)
    }
  }
  return resultado
}

interface Inscricao {
  endpoint: string
  p256dh: string
  auth: string
}

/** Valida a inscrição que vem do navegador (PushSubscription.toJSON()). */
function lerInscricao(dado: unknown): Inscricao | null {
  const i = dado as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null
  const endpoint = i?.endpoint
  const p256dh = i?.keys?.p256dh
  const auth = i?.keys?.auth
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 2000) return null
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth) return null
  return { endpoint, p256dh, auth }
}

/**
 * Grava (ou passa para este e-mail) a inscrição do aparelho. Fica no servidor, e não no front com RLS,
 * porque um endpoint já gravado com outro e-mail (ex.: celular onde o outro morador já entrou)
 * fazia o upsert do front falhar no RLS e o aparelho nunca entrava na lista.
 */
async function salvarInscricao(banco: SupabaseClient, inscricao: Inscricao, email: string) {
  const { error } = await banco.from('inscricoes_push').upsert({ ...inscricao, email }, { onConflict: 'endpoint' })
  if (error) throw new Error(`Erro ao salvar a inscrição: ${error.message}`)
}

async function contarAparelhos(banco: SupabaseClient, email: string): Promise<number> {
  const { count, error } = await banco
    .from('inscricoes_push')
    .select('endpoint', { count: 'exact', head: true })
    .eq('email', email)
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function registrarEnviados(banco: SupabaseClient, chaves: string[]) {
  const { error } = await banco.from('avisos_enviados').upsert(chaves.map((chave) => ({ chave })))
  if (error) throw new Error(error.message)
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })

/** Erro inesperado vira JSON com a mensagem (aparece no app e no log da Vercel) em vez de um 500 mudo. */
function comTratamento(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request)
    } catch (erro) {
      console.error(erro)
      return json({ erro: (erro as Error).message }, 500)
    }
  }
}

/** Vercel Cron: a Vercel manda "Authorization: Bearer <CRON_SECRET>". */
export const GET = comTratamento(async (request) => {
  if (request.headers.get('authorization') !== `Bearer ${variavel('CRON_SECRET')}`) {
    return json({ erro: 'não autorizado' }, 401)
  }
  configurarVapid(new URL(request.url).origin)
  const banco = clienteAdmin()
  const hoje = hojeEmSaoPaulo()
  const mesAtual = hoje.slice(0, 7)

  const [fixas, contas, enviados] = await Promise.all([
    banco.from('contas_fixas').select('id, nome, dia_vencimento, valor_padrao').eq('ativa', true),
    banco
      .from('contas_do_mes')
      .select('id, mes, conta_fixa_id, nome, vencimento, valor, comprovante')
      .in('mes', [mesAtual, somarMeses(mesAtual, 1)]),
    banco.from('avisos_enviados').select('chave').gte('enviado_em', new Date(Date.now() - 70 * 86_400_000).toISOString()),
  ])
  for (const r of [fixas, contas, enviados]) if (r.error) throw new Error(r.error.message)

  const avisos = montarAvisosDoDia(
    hoje,
    contas.data as Conta[],
    fixas.data as Fixa[],
    new Set((enviados.data ?? []).map((e) => e.chave as string)),
  )
  const resultado = []
  for (const aviso of avisos) {
    const envio = await enviar(banco, aviso)
    if (envio.enviados > 0) await registrarEnviados(banco, aviso.chaves)
    resultado.push({ titulo: aviso.titulo, aparelhos: envio.enviados, de: envio.total, falhas: envio.falhas })
  }
  return json({ hoje, avisos: resultado })
})

interface CorpoPost {
  acao?: string
  mes?: string
  inscricao?: unknown
  endpoint?: unknown
  antigo?: unknown
}

/** E-mail do morador dono do token, ou a resposta de erro. */
async function moradorLogado(banco: SupabaseClient, request: Request): Promise<string | Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return json({ erro: 'não autorizado' }, 401)
  const { data: usuario } = await banco.auth.getUser(token)
  const email = usuario.user?.email?.toLowerCase()
  if (!email) return json({ erro: 'não autorizado' }, 401)
  const { data: morador } = await banco.from('moradores').select('email').eq('email', email).maybeSingle()
  if (!morador) return json({ erro: 'não autorizado' }, 403)
  return email
}

export const POST = comTratamento(async (request) => {
  const banco = clienteAdmin()
  const corpo = (await request.json().catch(() => ({}))) as CorpoPost

  // Service worker (evento pushsubscriptionchange): não tem o login, mas só consegue trocar
  // uma inscrição que já existe, e o endpoint antigo funciona como prova (é secreto).
  if (corpo.acao === 'trocar') {
    const nova = lerInscricao(corpo.inscricao)
    if (!nova || typeof corpo.antigo !== 'string') return json({ erro: 'dados inválidos' }, 400)
    const { data: antiga } = await banco
      .from('inscricoes_push')
      .select('email')
      .eq('endpoint', corpo.antigo)
      .maybeSingle()
    if (!antiga) return json({ erro: 'inscrição antiga não encontrada' }, 404)
    await salvarInscricao(banco, nova, antiga.email as string)
    if (corpo.antigo !== nova.endpoint) await banco.from('inscricoes_push').delete().eq('endpoint', corpo.antigo)
    return json({ ok: true })
  }

  const email = await moradorLogado(banco, request)
  if (email instanceof Response) return email

  if (corpo.acao === 'inscrever') {
    const inscricao = lerInscricao(corpo.inscricao)
    if (!inscricao) return json({ erro: 'inscrição inválida' }, 400)
    await salvarInscricao(banco, inscricao, email)
    return json({ aparelhos: await contarAparelhos(banco, email) })
  }

  if (corpo.acao === 'desinscrever') {
    if (typeof corpo.endpoint !== 'string') return json({ erro: 'endpoint inválido' }, 400)
    await banco.from('inscricoes_push').delete().eq('endpoint', corpo.endpoint).eq('email', email)
    return json({ ok: true })
  }

  configurarVapid(new URL(request.url).origin)

  if (corpo.acao === 'teste') {
    const aviso = {
      chaves: [],
      titulo: 'Notificações funcionando! 🔔',
      corpo: 'É assim que os lembretes das contas vão aparecer.',
      tag: 'teste',
    }
    const envio = await enviar(banco, aviso, email)
    if (envio.total === 0) {
      return json({ erro: 'Nenhum aparelho seu está cadastrado. Desative e ative as notificações neste aparelho.' }, 500)
    }
    if (envio.enviados === 0) {
      return json({ erro: `Nenhum dos seus ${envio.total} aparelho(s) recebeu. ${envio.falhas.join(' | ')}` }, 500)
    }
    return json({ aparelhos: envio.enviados, total: envio.total, falhas: envio.falhas })
  }

  if (corpo.acao === 'tudo-pago' && /^\d{4}-\d{2}$/.test(corpo.mes ?? '')) {
    const mes = corpo.mes!
    const chave = `tudo-pago:${mes}`
    const [contas, jaEnviado] = await Promise.all([
      banco.from('contas_do_mes').select('comprovante').eq('mes', mes),
      banco.from('avisos_enviados').select('chave').eq('chave', chave).maybeSingle(),
    ])
    const lista = contas.data ?? []
    if (jaEnviado.data || !lista.length || lista.some((c) => !c.comprovante)) return json({ aparelhos: 0 })
    const aviso = montarAvisoTudoPago(mes, lista.length)
    const envio = await enviar(banco, aviso)
    if (envio.enviados > 0) await registrarEnviados(banco, aviso.chaves)
    return json({ aparelhos: envio.enviados })
  }

  return json({ erro: 'ação inválida' }, 400)
})
