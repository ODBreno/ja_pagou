// Função da Vercel que manda as notificações push.
//   GET  (Vercel Cron, 1x por dia): lembretes de vencimento e o aviso de começo de mês.
//   POST (app, com o login do morador): { acao: 'teste' } ou { acao: 'tudo-pago', mes }.
// Usa a chave secreta do Supabase (ignora o RLS), então toda entrada é validada aqui.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'

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

function variavel(nome: string, ...alternativas: string[]): string {
  for (const n of [nome, ...alternativas]) if (process.env[n]) return process.env[n]!
  throw new Error(`Variável de ambiente ${nome} não configurada`)
}

function clienteAdmin(): SupabaseClient {
  const url = variavel('SUPABASE_URL', 'VITE_SUPABASE_URL').replace(/\/(rest\/v1\/?)?$/, '')
  return createClient(url, variavel('SUPABASE_SECRET_KEY'), { auth: { persistSession: false } })
}

function configurarVapid(origem: string) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || origem,
    variavel('VAPID_PUBLIC_KEY', 'VITE_VAPID_PUBLIC_KEY'),
    variavel('VAPID_PRIVATE_KEY'),
  )
}

/** Manda para os aparelhos inscritos (todos, ou só os de um e-mail) e limpa inscrições expiradas. */
async function enviar(banco: SupabaseClient, aviso: Aviso, email?: string): Promise<number> {
  let consulta = banco.from('inscricoes_push').select('endpoint, p256dh, auth')
  if (email) consulta = consulta.eq('email', email)
  const { data: inscricoes, error } = await consulta
  if (error) throw new Error(error.message)

  const payload = JSON.stringify({ titulo: aviso.titulo, corpo: aviso.corpo, tag: aviso.tag })
  let enviados = 0
  for (const i of inscricoes ?? []) {
    try {
      await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, payload, {
        TTL: 60 * 60 * 24,
      })
      enviados++
    } catch (erro) {
      const status = (erro as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await banco.from('inscricoes_push').delete().eq('endpoint', i.endpoint)
      else console.error('Falha ao enviar push', status, (erro as Error).message)
    }
  }
  return enviados
}

async function registrarEnviados(banco: SupabaseClient, chaves: string[]) {
  const { error } = await banco.from('avisos_enviados').upsert(chaves.map((chave) => ({ chave })))
  if (error) throw new Error(error.message)
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })

/** Vercel Cron: a Vercel manda "Authorization: Bearer <CRON_SECRET>". */
export async function GET(request: Request): Promise<Response> {
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
    const quantos = await enviar(banco, aviso)
    if (quantos > 0) await registrarEnviados(banco, aviso.chaves)
    resultado.push({ titulo: aviso.titulo, aparelhos: quantos })
  }
  return json({ hoje, avisos: resultado })
}

/** Chamado pelo app com o token do morador logado. */
export async function POST(request: Request): Promise<Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  const banco = clienteAdmin()
  const { data: usuario } = await banco.auth.getUser(token)
  const email = usuario.user?.email?.toLowerCase()
  if (!email) return json({ erro: 'não autorizado' }, 401)
  const { data: morador } = await banco.from('moradores').select('email').eq('email', email).maybeSingle()
  if (!morador) return json({ erro: 'não autorizado' }, 403)

  configurarVapid(new URL(request.url).origin)
  const corpo = (await request.json().catch(() => ({}))) as { acao?: string; mes?: string }

  if (corpo.acao === 'teste') {
    const aviso = {
      chaves: [],
      titulo: 'Notificações funcionando! 🔔',
      corpo: 'É assim que os lembretes das contas vão aparecer.',
      tag: 'teste',
    }
    return json({ aparelhos: await enviar(banco, aviso, email) })
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
    const quantos = await enviar(banco, aviso)
    if (quantos > 0) await registrarEnviados(banco, aviso.chaves)
    return json({ aparelhos: quantos })
  }

  return json({ erro: 'ação inválida' }, 400)
}
