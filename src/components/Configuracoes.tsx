import { ArrowLeft, LogOut, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { novoId } from '../lib/id'
import type { Configuracao, ContaFixa, Morador, TipoConta } from '../tipos'
import { CampoValor } from './CampoValor'
import { DefinirSenha } from './DefinirSenha'
import { SecaoNotificacoes } from './SecaoNotificacoes'

interface Props {
  configuracao: Configuracao
  emailLogado: string
  onSalvar: (configuracao: Configuracao) => Promise<void>
  onVoltar: () => void
  onSair: () => void
}

const campo = 'rounded-lg border border-borda bg-elevado px-3 py-2 outline-none focus:border-destaque'

/** novo: o e-mail só pode ser digitado ao adicionar a pessoa (ele é a chave do acesso). */
type MoradorEditavel = Morador & { novo?: boolean }

export function Configuracoes({ configuracao, emailLogado, onSalvar, onVoltar, onSair }: Props) {
  const [moradores, setMoradores] = useState<MoradorEditavel[]>(configuracao.moradores)
  const [contasFixas, setContasFixas] = useState(configuracao.contasFixas)
  const [salvando, setSalvando] = useState(false)

  function alterarMorador(i: number, mudanca: Partial<Morador>) {
    setMoradores(moradores.map((m, j) => (j === i ? { ...m, ...mudanca } : m)))
  }

  // Contas com valor/código fixo mostram os dois campos; as outras ficam só com o checkbox.
  const [comValorFixo, setComValorFixo] = useState(
    () => new Set(configuracao.contasFixas.filter((c) => c.valorPadrao != null || c.codigoPagamento).map((c) => c.id)),
  )

  function alterarFixa(id: string, mudanca: Partial<ContaFixa>) {
    setContasFixas((atuais) => atuais.map((c) => (c.id === id ? { ...c, ...mudanca } : c)))
  }

  function alternarValorFixo(id: string, ligado: boolean) {
    const ids = new Set(comValorFixo)
    if (ligado) ids.add(id)
    else {
      ids.delete(id)
      alterarFixa(id, { valorPadrao: null, codigoPagamento: null })
    }
    setComValorFixo(ids)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      await onSalvar({
        moradores: moradores
          .map((m) => ({ email: m.email.trim().toLowerCase(), nome: m.nome.trim() }))
          .filter((m) => m.email && m.nome),
        contasFixas: contasFixas
          .map((c) => ({
            ...c,
            nome: c.nome.trim(),
            diaVencimento: Math.min(31, Math.max(1, c.diaVencimento || 1)),
            codigoPagamento: c.codigoPagamento?.trim() || null,
          }))
          .filter((c) => c.nome)
          .sort((a, b) => a.diaVencimento - b.diaVencimento),
      })
    } catch (erro) {
      alert(`Não foi possível salvar: ${(erro as Error).message}`)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="mx-auto max-w-md space-y-6 px-4 pt-4 pb-10">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVoltar}
          className="rounded-full p-2 text-suave hover:bg-elevado"
          aria-label="Voltar"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl font-bold">Configurações</h1>
      </header>

      <section className="space-y-3 rounded-2xl bg-superficie p-4 ring-1 ring-borda">
        <div>
          <h2 className="font-semibold">Quem mora aqui</h2>
          <p className="text-sm text-suave">Quem está aqui consegue entrar no app com o próprio e-mail.</p>
        </div>
        {moradores.map((morador, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={morador.nome}
                placeholder="Nome"
                onChange={(e) => alterarMorador(i, { nome: e.target.value })}
                className={`${campo} w-full`}
              />
              {morador.novo ? (
                <input
                  type="email"
                  value={morador.email}
                  placeholder="E-mail de login"
                  onChange={(e) => alterarMorador(i, { email: e.target.value })}
                  className={`${campo} w-full text-sm`}
                />
              ) : (
                <p className="truncate px-1 text-xs text-apagado">{morador.email}</p>
              )}
            </div>
            {morador.email !== emailLogado && (
              <button
                type="button"
                onClick={() => setMoradores(moradores.filter((_, j) => j !== i))}
                className="rounded-full p-2 text-apagado hover:text-rose-400"
                aria-label={`Remover ${morador.nome}`}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setMoradores([...moradores, { email: '', nome: '', novo: true }])}
          className="flex items-center gap-1.5 text-sm font-medium text-destaque-claro"
        >
          <Plus size={16} /> Adicionar pessoa
        </button>
      </section>

      <section className="space-y-3 rounded-2xl bg-superficie p-4 ring-1 ring-borda">
        <div>
          <h2 className="font-semibold">Contas fixas</h2>
          <p className="text-sm text-suave">
            Entram sozinhas na checklist de todo mês. Mudanças valem para o mês atual e os próximos.
          </p>
        </div>
        {contasFixas.map((conta) => (
          <div key={conta.id} className="space-y-2 rounded-xl border border-borda p-3">
            <div className="flex gap-2">
              <input
                value={conta.nome}
                placeholder="Nome da conta"
                onChange={(e) => alterarFixa(conta.id, { nome: e.target.value })}
                className={`${campo} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={() => setContasFixas(contasFixas.filter((c) => c.id !== conta.id))}
                className="rounded-full p-2 text-apagado hover:text-rose-400"
                aria-label={`Remover ${conta.nome}`}
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex gap-2">
              <label className="flex w-24 items-center gap-2 text-sm text-suave">
                Dia
                <input
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  value={conta.diaVencimento || ''}
                  onChange={(e) => alterarFixa(conta.id, { diaVencimento: Number(e.target.value) })}
                  className={`${campo} w-full text-texto`}
                />
              </label>
              <select
                value={conta.tipo}
                onChange={(e) => alterarFixa(conta.id, { tipo: e.target.value as TipoConta })}
                className={`${campo} min-w-0 flex-1 text-sm`}
              >
                <option value="boleto">Tem conta/boleto</option>
                <option value="debito">Débito automático</option>
              </select>
            </div>
            <label className="flex w-fit items-center gap-2 text-sm text-suave">
              <input
                type="checkbox"
                checked={comValorFixo.has(conta.id)}
                onChange={(e) => alternarValorFixo(conta.id, e.target.checked)}
                className="size-4 accent-destaque"
              />
              Valor fixo
            </label>
            {comValorFixo.has(conta.id) && (
              <>
                <div>
                  <p className="mb-1 text-xs text-suave">Valor todo mês</p>
                  <CampoValor
                    valor={conta.valorPadrao}
                    onMudar={(valorPadrao) => alterarFixa(conta.id, { valorPadrao })}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-suave">
                    {conta.tipo === 'debito' ? 'Chave Pix (opcional)' : 'Código para pagar (opcional)'}
                  </p>
                  <input
                    value={conta.codigoPagamento ?? ''}
                    onChange={(e) => alterarFixa(conta.id, { codigoPagamento: e.target.value })}
                    className={`${campo} w-full font-mono text-sm`}
                  />
                </div>
              </>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setContasFixas([...contasFixas, { id: novoId(), nome: '', diaVencimento: 10, tipo: 'boleto', valorPadrao: null, codigoPagamento: null }])}
          className="flex items-center gap-1.5 text-sm font-medium text-destaque-claro"
        >
          <Plus size={16} /> Adicionar conta fixa
        </button>
      </section>

      <button
        type="submit"
        disabled={salvando}
        className="w-full rounded-xl bg-destaque py-3 font-semibold text-white disabled:opacity-50"
      >
        {salvando ? 'Salvando…' : 'Salvar'}
      </button>

      <SecaoNotificacoes email={emailLogado} />

      <DefinirSenha />

      <button
        type="button"
        onClick={onSair}
        className="mx-auto flex items-center gap-2 text-sm text-suave hover:text-rose-400"
      >
        <LogOut size={16} /> Sair ({emailLogado})
      </button>
    </form>
  )
}
