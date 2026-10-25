import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { novoId } from '../lib/id'
import type { Configuracao, ContaFixa, TipoConta } from '../tipos'

interface Props {
  configuracao: Configuracao
  onSalvar: (configuracao: Configuracao) => Promise<void>
  onVoltar: () => void
}

const campo = 'rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-emerald-400'

export function Configuracoes({ configuracao, onSalvar, onVoltar }: Props) {
  const [moradores, setMoradores] = useState(configuracao.moradores)
  const [contasFixas, setContasFixas] = useState(configuracao.contasFixas)

  function alterarFixa(id: string, mudanca: Partial<ContaFixa>) {
    setContasFixas(contasFixas.map((c) => (c.id === id ? { ...c, ...mudanca } : c)))
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    await onSalvar({
      moradores: moradores.map((m) => m.trim()).filter(Boolean),
      contasFixas: contasFixas
        .map((c) => ({ ...c, nome: c.nome.trim(), diaVencimento: Math.min(31, Math.max(1, c.diaVencimento || 1)) }))
        .filter((c) => c.nome)
        .sort((a, b) => a.diaVencimento - b.diaVencimento),
    })
  }

  return (
    <form onSubmit={salvar} className="mx-auto max-w-md space-y-6 px-4 pt-4 pb-10">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVoltar}
          className="rounded-full p-2 text-slate-600 hover:bg-slate-200"
          aria-label="Voltar"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl font-bold">Configurações</h1>
      </header>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <h2 className="font-semibold">Quem mora aqui</h2>
          <p className="text-sm text-slate-500">Aparece no "quem vai pagar" de cada conta.</p>
        </div>
        {moradores.map((nome, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={nome}
              placeholder="Nome"
              onChange={(e) => setMoradores(moradores.map((m, j) => (j === i ? e.target.value : m)))}
              className={`${campo} flex-1`}
            />
            <button
              type="button"
              onClick={() => setMoradores(moradores.filter((_, j) => j !== i))}
              className="rounded-full p-2 text-slate-400 hover:text-rose-600"
              aria-label={`Remover ${nome}`}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setMoradores([...moradores, ''])}
          className="flex items-center gap-1.5 text-sm font-medium text-emerald-700"
        >
          <Plus size={16} /> Adicionar pessoa
        </button>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <h2 className="font-semibold">Contas fixas</h2>
          <p className="text-sm text-slate-500">
            Entram sozinhas na checklist de todo mês. Mudanças valem para o mês atual e os próximos.
          </p>
        </div>
        {contasFixas.map((conta) => (
          <div key={conta.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
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
                className="rounded-full p-2 text-slate-400 hover:text-rose-600"
                aria-label={`Remover ${conta.nome}`}
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex gap-2">
              <label className="flex w-24 items-center gap-2 text-sm text-slate-500">
                Dia
                <input
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  value={conta.diaVencimento || ''}
                  onChange={(e) => alterarFixa(conta.id, { diaVencimento: Number(e.target.value) })}
                  className={`${campo} w-full text-slate-900`}
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
          </div>
        ))}
        <button
          type="button"
          onClick={() => setContasFixas([...contasFixas, { id: novoId(), nome: '', diaVencimento: 10, tipo: 'boleto' }])}
          className="flex items-center gap-1.5 text-sm font-medium text-emerald-700"
        >
          <Plus size={16} /> Adicionar conta fixa
        </button>
      </section>

      <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white">
        Salvar
      </button>
    </form>
  )
}
