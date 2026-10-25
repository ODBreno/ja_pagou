import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { adicionarContaAvulsa } from '../dados/repositorio'
import { vencimentoNoMes } from '../lib/datas'
import type { ContaDoMes, TipoConta } from '../tipos'

interface Props {
  mes: string
  onAdicionada: (conta: ContaDoMes) => void
}

export function NovaContaAvulsa({ mes, onAdicionada }: Props) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [dia, setDia] = useState('')
  const [tipo, setTipo] = useState<TipoConta>('boleto')

  async function salvar(e: FormEvent) {
    e.preventDefault()
    try {
      onAdicionada(
        await adicionarContaAvulsa({
          mes,
          nome: nome.trim(),
          tipo,
          vencimento: vencimentoNoMes(mes, Number(dia)),
        }),
      )
    } catch (erro) {
      alert(`Não foi possível adicionar: ${(erro as Error).message}`)
      return
    }
    setNome('')
    setDia('')
    setAberto(false)
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-borda py-3 text-sm font-medium text-suave hover:border-destaque hover:text-destaque-claro"
      >
        <Plus size={16} /> Conta avulsa neste mês
      </button>
    )
  }

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-2xl bg-superficie p-4 ring-1 ring-borda">
      <p className="font-semibold">Nova conta avulsa</p>
      <input
        required
        autoFocus
        placeholder="Nome (ex.: IPTU, consulta)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="w-full rounded-lg border border-borda px-3 py-2 outline-none focus:border-destaque"
      />
      <div className="flex gap-2">
        <input
          required
          type="number"
          min={1}
          max={31}
          inputMode="numeric"
          placeholder="Dia do vencimento"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          className="w-1/2 rounded-lg border border-borda px-3 py-2 outline-none focus:border-destaque"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoConta)}
          className="w-1/2 rounded-lg border border-borda bg-elevado px-3 py-2 text-sm outline-none focus:border-destaque"
        >
          <option value="boleto">Tem conta/boleto</option>
          <option value="debito">Débito automático</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setAberto(false)} className="px-3 py-2 text-sm text-suave">
          Cancelar
        </button>
        <button type="submit" className="rounded-lg bg-destaque px-4 py-2 text-sm font-medium text-white">
          Adicionar
        </button>
      </div>
    </form>
  )
}
