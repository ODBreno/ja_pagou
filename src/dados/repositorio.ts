import { createStore, del, get, set, update } from 'idb-keyval'
import { mesAtual, vencimentoNoMes, hoje } from '../lib/datas'
import { novoId } from '../lib/id'
import type { Anexo, CampoAnexo, Configuracao, ContaDoMes, ContaFixa } from '../tipos'

/**
 * Armazenamento local no IndexedDB do navegador (dados e arquivos).
 * Chaves: "configuracao", "mes:YYYY-MM" (lista de ContaDoMes) e "arquivo:<id>" (Blob).
 */
const banco = createStore('ja-pagamos', 'dados')

const CONTAS_FIXAS_PADRAO: Omit<ContaFixa, 'id'>[] = [
  { nome: 'Internet', diaVencimento: 1, tipo: 'debito' },
  { nome: 'Condomínio', diaVencimento: 5, tipo: 'boleto' },
  { nome: 'Conta de luz', diaVencimento: 10, tipo: 'boleto' },
  { nome: 'Gás', diaVencimento: 15, tipo: 'boleto' },
]

export async function carregarConfiguracao(): Promise<Configuracao> {
  const salva = await get<Configuracao>('configuracao', banco)
  if (salva) return salva
  const padrao: Configuracao = {
    moradores: ['Breno', 'Naty'],
    contasFixas: CONTAS_FIXAS_PADRAO.map((c) => ({ ...c, id: novoId() })),
  }
  await set('configuracao', padrao, banco)
  return padrao
}

export async function salvarConfiguracao(configuracao: Configuracao): Promise<void> {
  await set('configuracao', configuracao, banco)
}

function novaContaDoMes(mes: string, fixa: ContaFixa): ContaDoMes {
  return {
    id: novoId(),
    mes,
    contaFixaId: fixa.id,
    nome: fixa.nome,
    tipo: fixa.tipo,
    vencimento: vencimentoNoMes(mes, fixa.diaVencimento),
    valor: null,
    responsavel: null,
    conta: null,
    comprovante: null,
    pagoEm: null,
  }
}

/**
 * Reflete as contas fixas na checklist do mês: cria as que faltam, atualiza
 * nome/tipo/vencimento das não pagas e tira as que deixaram de existir (se não tiverem anexo).
 */
function sincronizarComContasFixas(mes: string, contas: ContaDoMes[], fixas: ContaFixa[]): ContaDoMes[] {
  const resultado: ContaDoMes[] = []
  for (const conta of contas) {
    const fixa = conta.contaFixaId && fixas.find((f) => f.id === conta.contaFixaId)
    if (!conta.contaFixaId || conta.comprovante) resultado.push(conta)
    else if (fixa)
      resultado.push({ ...conta, nome: fixa.nome, tipo: fixa.tipo, vencimento: vencimentoNoMes(mes, fixa.diaVencimento) })
    else if (conta.conta) resultado.push(conta)
  }
  for (const fixa of fixas) {
    if (!contas.some((c) => c.contaFixaId === fixa.id)) resultado.push(novaContaDoMes(mes, fixa))
  }
  return resultado
}

/** Meses que já passaram ficam como estão; o atual e os futuros acompanham as contas fixas. */
export async function carregarMes(mes: string, fixas: ContaFixa[]): Promise<ContaDoMes[]> {
  const salvas = await get<ContaDoMes[]>(`mes:${mes}`, banco)
  if (salvas && mes < mesAtual()) return salvas
  const contas = sincronizarComContasFixas(mes, salvas ?? [], fixas)
  await set(`mes:${mes}`, contas, banco)
  return contas
}

async function atualizarMes(mes: string, alterar: (contas: ContaDoMes[]) => ContaDoMes[]): Promise<void> {
  await update<ContaDoMes[]>(`mes:${mes}`, (contas) => alterar(contas ?? []), banco)
}

export async function salvarConta(conta: ContaDoMes): Promise<void> {
  await atualizarMes(conta.mes, (contas) => contas.map((c) => (c.id === conta.id ? conta : c)))
}

export async function adicionarContaAvulsa(
  dados: Pick<ContaDoMes, 'mes' | 'nome' | 'tipo' | 'vencimento'>,
): Promise<ContaDoMes> {
  const conta: ContaDoMes = {
    ...dados,
    id: novoId(),
    contaFixaId: null,
    valor: null,
    responsavel: null,
    conta: null,
    comprovante: null,
    pagoEm: null,
  }
  await atualizarMes(conta.mes, (contas) => [...contas, conta])
  return conta
}

export async function removerConta(conta: ContaDoMes): Promise<void> {
  for (const anexo of [conta.conta, conta.comprovante]) {
    if (anexo) await del(`arquivo:${anexo.id}`, banco)
  }
  await atualizarMes(conta.mes, (contas) => contas.filter((c) => c.id !== conta.id))
}

export async function anexarArquivo(conta: ContaDoMes, campo: CampoAnexo, arquivo: File): Promise<ContaDoMes> {
  const anexo: Anexo = {
    id: novoId(),
    nome: arquivo.name,
    tipoMime: arquivo.type,
    tamanho: arquivo.size,
    enviadoEm: new Date().toISOString(),
  }
  await set(`arquivo:${anexo.id}`, arquivo, banco)
  const anterior = conta[campo]
  if (anterior) await del(`arquivo:${anterior.id}`, banco)
  const atualizada: ContaDoMes = {
    ...conta,
    [campo]: anexo,
    pagoEm: campo === 'comprovante' ? hoje() : conta.pagoEm,
  }
  await salvarConta(atualizada)
  return atualizada
}

export async function removerAnexo(conta: ContaDoMes, campo: CampoAnexo): Promise<ContaDoMes> {
  const anexo = conta[campo]
  if (anexo) await del(`arquivo:${anexo.id}`, banco)
  const atualizada: ContaDoMes = {
    ...conta,
    [campo]: null,
    pagoEm: campo === 'comprovante' ? null : conta.pagoEm,
  }
  await salvarConta(atualizada)
  return atualizada
}

export async function lerArquivo(anexo: Anexo): Promise<Blob | undefined> {
  return get<Blob>(`arquivo:${anexo.id}`, banco)
}
