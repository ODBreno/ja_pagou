import type { PostgrestError } from '@supabase/supabase-js'
import { MES_INICIAL, mesAtual, hoje, vencimentoNoMes } from '../lib/datas'
import { novoId } from '../lib/id'
import type { Anexo, CampoAnexo, Configuracao, ContaDoMes, ContaFixa, Morador, TipoConta } from '../tipos'
import { supabase } from './supabase'

/**
 * Dados no Postgres do Supabase e arquivos no bucket privado "anexos".
 * O acesso é liberado pelas políticas de RLS só para quem está na tabela moradores.
 */
const BUCKET = 'anexos'

interface LinhaContaFixa {
  id: string
  nome: string
  dia_vencimento: number
  tipo: TipoConta
  valor_padrao: number | string | null
  codigo_pagamento: string | null
}

interface LinhaContaDoMes {
  id: string
  mes: string
  conta_fixa_id: string | null
  nome: string
  tipo: TipoConta
  vencimento: string
  valor: number | string | null
  codigo_pagamento: string | null
  responsavel: string | null
  conta: Anexo | null
  comprovante: Anexo | null
  pago_em: string | null
}

/** O Postgres devolve numeric como texto em alguns casos; aqui vira número. */
const paraNumero = (v: number | string | null) => (v == null ? null : Number(v))

function exigir<T>({ data, error }: { data: T | null; error: PostgrestError | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

function daLinha(l: LinhaContaDoMes): ContaDoMes {
  return {
    id: l.id,
    mes: l.mes,
    contaFixaId: l.conta_fixa_id,
    nome: l.nome,
    tipo: l.tipo,
    vencimento: l.vencimento,
    valor: paraNumero(l.valor),
    codigoPagamento: l.codigo_pagamento,
    responsavel: l.responsavel,
    conta: l.conta,
    comprovante: l.comprovante,
    pagoEm: l.pago_em,
  }
}

function paraLinha(c: Omit<ContaDoMes, 'id'>): Omit<LinhaContaDoMes, 'id'> {
  return {
    mes: c.mes,
    conta_fixa_id: c.contaFixaId,
    nome: c.nome,
    tipo: c.tipo,
    vencimento: c.vencimento,
    valor: c.valor,
    codigo_pagamento: c.codigoPagamento,
    responsavel: c.responsavel,
    conta: c.conta,
    comprovante: c.comprovante,
    pago_em: c.pagoEm,
  }
}

export async function carregarConfiguracao(): Promise<Configuracao> {
  const [moradores, fixas] = await Promise.all([
    supabase.from('moradores').select('email, nome').order('nome'),
    supabase
      .from('contas_fixas')
      .select('id, nome, dia_vencimento, tipo, valor_padrao, codigo_pagamento')
      .eq('ativa', true)
      .order('dia_vencimento'),
  ])
  return {
    moradores: exigir<Morador[]>(moradores),
    contasFixas: exigir<LinhaContaFixa[]>(fixas).map((f) => ({
      id: f.id,
      nome: f.nome,
      diaVencimento: f.dia_vencimento,
      tipo: f.tipo,
      valorPadrao: paraNumero(f.valor_padrao),
      codigoPagamento: f.codigo_pagamento,
    })),
  }
}

/** Contas fixas novas (id ainda não salvo) são inseridas; as que sumiram são desativadas. */
export async function salvarConfiguracao(nova: Configuracao, anterior: Configuracao): Promise<void> {
  const emails = new Set(nova.moradores.map((m) => m.email))
  const moradoresRemovidos = anterior.moradores.filter((m) => !emails.has(m.email)).map((m) => m.email)
  exigir(await supabase.from('moradores').upsert(nova.moradores))
  if (moradoresRemovidos.length) exigir(await supabase.from('moradores').delete().in('email', moradoresRemovidos))

  const idsAnteriores = new Set(anterior.contasFixas.map((c) => c.id))
  const paraBanco = (c: ContaFixa) => ({
    nome: c.nome,
    dia_vencimento: c.diaVencimento,
    tipo: c.tipo,
    valor_padrao: c.valorPadrao,
    codigo_pagamento: c.codigoPagamento,
  })
  const existentes = nova.contasFixas.filter((c) => idsAnteriores.has(c.id))
  const novas = nova.contasFixas.filter((c) => !idsAnteriores.has(c.id))
  const idsNovos = new Set(existentes.map((c) => c.id))
  const removidas = anterior.contasFixas.filter((c) => !idsNovos.has(c.id)).map((c) => c.id)

  if (existentes.length)
    exigir(await supabase.from('contas_fixas').upsert(existentes.map((c) => ({ id: c.id, ...paraBanco(c) }))))
  if (novas.length) exigir(await supabase.from('contas_fixas').insert(novas.map(paraBanco)))
  if (removidas.length) exigir(await supabase.from('contas_fixas').update({ ativa: false }).in('id', removidas))
}

async function buscarMes(mes: string): Promise<ContaDoMes[]> {
  const linhas = exigir<LinhaContaDoMes[]>(await supabase.from('contas_do_mes').select('*').eq('mes', mes))
  return linhas.map(daLinha)
}

function novaContaDoMes(mes: string, fixa: ContaFixa): Omit<ContaDoMes, 'id'> {
  return {
    mes,
    contaFixaId: fixa.id,
    nome: fixa.nome,
    tipo: fixa.tipo,
    vencimento: vencimentoNoMes(mes, fixa.diaVencimento),
    valor: fixa.valorPadrao,
    codigoPagamento: fixa.codigoPagamento,
    responsavel: null,
    conta: null,
    comprovante: null,
    pagoEm: null,
  }
}

/**
 * Meses que já passaram ficam como estão; o atual e os futuros acompanham as contas fixas:
 * cria as que faltam, atualiza nome/tipo/vencimento das não pagas (e preenche valor e código
 * se ainda estiverem vazios) e tira as desativadas sem anexo.
 */
export async function carregarMes(mes: string, fixas: ContaFixa[]): Promise<ContaDoMes[]> {
  const contas = await buscarMes(mes)
  if (contas.length && mes < mesAtual()) return contas

  const faltando = fixas.filter((f) => !contas.some((c) => c.contaFixaId === f.id))
  const desatualizadas = contas.flatMap((c) => {
    const fixa = !c.comprovante && fixas.find((f) => f.id === c.contaFixaId)
    if (!fixa) return []
    const mudanca = {
      nome: fixa.nome,
      tipo: fixa.tipo,
      vencimento: vencimentoNoMes(mes, fixa.diaVencimento),
      valor: c.valor ?? fixa.valorPadrao,
      codigo_pagamento: c.codigoPagamento ?? fixa.codigoPagamento,
    }
    const igual =
      c.nome === mudanca.nome &&
      c.tipo === mudanca.tipo &&
      c.vencimento === mudanca.vencimento &&
      c.valor === mudanca.valor &&
      c.codigoPagamento === mudanca.codigo_pagamento
    return igual ? [] : [{ id: c.id, ...mudanca }]
  })
  const orfas = contas
    .filter((c) => c.contaFixaId && !c.conta && !c.comprovante && !fixas.some((f) => f.id === c.contaFixaId))
    .map((c) => c.id)

  if (!faltando.length && !desatualizadas.length && !orfas.length) return contas

  if (faltando.length) {
    exigir(
      await supabase
        .from('contas_do_mes')
        .upsert(faltando.map((f) => paraLinha(novaContaDoMes(mes, f))), {
          onConflict: 'mes,conta_fixa_id',
          ignoreDuplicates: true,
        }),
    )
  }
  for (const { id, ...mudanca } of desatualizadas) {
    exigir(await supabase.from('contas_do_mes').update(mudanca).eq('id', id))
  }
  if (orfas.length) exigir(await supabase.from('contas_do_mes').delete().in('id', orfas))
  return buscarMes(mes)
}

/** Tudo o que já existe no ano, sem gerar meses novos (para a visão do ano). */
export async function carregarAno(ano: number): Promise<ContaDoMes[]> {
  const linhas = exigir<LinhaContaDoMes[]>(
    await supabase.from('contas_do_mes').select('*').gte('mes', `${ano}-01`).lte('mes', `${ano}-12`),
  )
  return linhas.map(daLinha)
}

/** Contas com valor preenchido desde o início do app, em ordem de mês (para as métricas). */
export async function carregarHistoricoDeValores(): Promise<ContaDoMes[]> {
  const linhas = exigir<LinhaContaDoMes[]>(
    await supabase
      .from('contas_do_mes')
      .select('*')
      .gte('mes', MES_INICIAL)
      .not('valor', 'is', null)
      .order('mes'),
  )
  return linhas.map(daLinha)
}

export async function salvarConta(conta: ContaDoMes): Promise<void> {
  exigir(await supabase.from('contas_do_mes').update(paraLinha(conta)).eq('id', conta.id))
}

export async function adicionarContaAvulsa(
  dados: Pick<ContaDoMes, 'mes' | 'nome' | 'tipo' | 'vencimento'>,
): Promise<ContaDoMes> {
  const linha = exigir<LinhaContaDoMes>(
    await supabase
      .from('contas_do_mes')
      .insert(
        paraLinha({
          ...dados,
          contaFixaId: null,
          valor: null,
          codigoPagamento: null,
          responsavel: null,
          conta: null,
          comprovante: null,
          pagoEm: null,
        }),
      )
      .select()
      .single(),
  )
  return daLinha(linha)
}

async function apagarArquivos(anexos: (Anexo | null)[]): Promise<void> {
  const caminhos = anexos.filter((a): a is Anexo => a != null).map((a) => a.caminho)
  if (!caminhos.length) return
  const { error } = await supabase.storage.from(BUCKET).remove(caminhos)
  if (error) throw new Error(error.message)
}

export async function removerConta(conta: ContaDoMes): Promise<void> {
  exigir(await supabase.from('contas_do_mes').delete().eq('id', conta.id))
  await apagarArquivos([conta.conta, conta.comprovante])
}

export async function anexarArquivo(conta: ContaDoMes, campo: CampoAnexo, arquivo: File): Promise<ContaDoMes> {
  const id = novoId()
  const extensao = arquivo.name.includes('.') ? arquivo.name.split('.').pop()!.toLowerCase() : 'bin'
  const anexo: Anexo = {
    id,
    nome: arquivo.name,
    tipoMime: arquivo.type,
    tamanho: arquivo.size,
    enviadoEm: new Date().toISOString(),
    caminho: `${conta.mes}/${conta.id}/${campo}-${id}.${extensao}`,
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(anexo.caminho, arquivo, { contentType: arquivo.type || undefined })
  if (error) throw new Error(error.message)

  const atualizada: ContaDoMes = {
    ...conta,
    [campo]: anexo,
    pagoEm: campo === 'comprovante' ? hoje() : conta.pagoEm,
  }
  await salvarConta(atualizada)
  await apagarArquivos([conta[campo]])
  return atualizada
}

export async function removerAnexo(conta: ContaDoMes, campo: CampoAnexo): Promise<ContaDoMes> {
  const atualizada: ContaDoMes = {
    ...conta,
    [campo]: null,
    pagoEm: campo === 'comprovante' ? null : conta.pagoEm,
  }
  await salvarConta(atualizada)
  await apagarArquivos([conta[campo]])
  return atualizada
}

/** Link temporário (5 min) para abrir o arquivo do bucket privado. */
export async function urlDoAnexo(anexo: Anexo): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(anexo.caminho, 300)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
