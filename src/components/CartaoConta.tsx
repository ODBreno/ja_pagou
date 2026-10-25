import { ChevronDown, FileText, Repeat, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { anexarArquivo, removerAnexo, removerConta } from '../dados/repositorio'
import { diaEMes, diasAte } from '../lib/datas'
import { formatarReais, lerValor, valorParaTexto } from '../lib/dinheiro'
import { estaAtrasada, statusDa, type Status } from '../lib/status'
import type { CampoAnexo, ContaDoMes } from '../tipos'
import { LinhaAnexo } from './LinhaAnexo'

interface Props {
  conta: ContaDoMes
  moradores: string[]
  aberta: boolean
  onAlternar: () => void
  onAlterada: (conta: ContaDoMes) => void
  onRemovida: () => void
}

const ESTILO_STATUS: Record<Status, string> = {
  pago: 'bg-emerald-100 text-emerald-800',
  a_pagar: 'bg-amber-100 text-amber-800',
  aguardando_conta: 'bg-slate-100 text-slate-600',
}

function rotuloStatus(conta: ContaDoMes, status: Status): string {
  if (status === 'pago') return 'Pago'
  if (status === 'aguardando_conta') return 'Aguardando conta'
  const acao = conta.tipo === 'debito' ? 'Mandar Pix' : 'A pagar'
  return conta.responsavel ? `${acao} · ${conta.responsavel}` : acao
}

function textoVencimento(conta: ContaDoMes, status: Status): string {
  if (status === 'pago') return conta.pagoEm ? `Pago em ${diaEMes(conta.pagoEm)}` : 'Pago'
  const dias = diasAte(conta.vencimento)
  if (dias < -1) return `Venceu há ${-dias} dias`
  if (dias === -1) return 'Venceu ontem'
  if (dias === 0) return 'Vence hoje'
  if (dias === 1) return 'Vence amanhã'
  if (dias <= 3) return `Vence em ${dias} dias`
  return `Vence ${diaEMes(conta.vencimento)}`
}

export function CartaoConta({ conta, moradores, aberta, onAlternar, onAlterada, onRemovida }: Props) {
  const status = statusDa(conta)
  const atrasada = estaAtrasada(conta)
  const [textoValor, setTextoValor] = useState(valorParaTexto(conta.valor))
  const Icone = conta.tipo === 'debito' ? Repeat : FileText

  function confirmarValor() {
    const valor = lerValor(textoValor)
    setTextoValor(valorParaTexto(valor))
    if (valor !== conta.valor) onAlterada({ ...conta, valor })
  }

  async function anexar(campo: CampoAnexo, arquivo: File) {
    onAlterada(await anexarArquivo(conta, campo, arquivo))
  }

  async function desanexar(campo: CampoAnexo) {
    onAlterada(await removerAnexo(conta, campo))
  }

  async function remover() {
    if (!confirm(`Remover "${conta.nome}" deste mês?`)) return
    await removerConta(conta)
    onRemovida()
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${atrasada ? 'ring-rose-300' : 'ring-transparent'}`}
    >
      <button type="button" onClick={onAlternar} className="flex w-full items-center gap-3 p-4 text-left">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            status === 'pago' ? 'bg-emerald-500 text-white' : atrasada ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Icone size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className={`truncate font-semibold ${status === 'pago' ? 'text-slate-500' : ''}`}>{conta.nome}</span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILO_STATUS[status]}`}>
              {rotuloStatus(conta, status)}
            </span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2 text-sm">
            <span className={atrasada ? 'font-medium text-rose-600' : 'text-slate-500'}>
              {textoVencimento(conta, status)}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              {conta.valor != null && formatarReais(conta.valor)}
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${aberta ? 'rotate-180' : ''}`} />
            </span>
          </span>
        </span>
      </button>

      {aberta && (
        <div className="space-y-3 border-t border-slate-100 p-4">
          <p className="text-xs text-slate-500">
            {conta.tipo === 'debito'
              ? 'Débito automático: anexe o comprovante do Pix para a conta.'
              : 'Anexe a conta quando ela chegar e o comprovante depois de pagar.'}
          </p>

          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Valor</span>
            <div className="mt-1 flex items-center rounded-lg border border-slate-200 px-3 focus-within:border-emerald-400">
              <span className="text-sm text-slate-400">R$</span>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={textoValor}
                onChange={(e) => setTextoValor(e.target.value)}
                onBlur={confirmarValor}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-full bg-transparent px-2 py-2 outline-none"
              />
            </div>
          </label>

          {status !== 'pago' && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Quem vai pagar</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {moradores.map((nome) => (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => onAlterada({ ...conta, responsavel: conta.responsavel === nome ? null : nome })}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                      conta.responsavel === nome ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {conta.tipo === 'boleto' && (
            <LinhaAnexo
              titulo="Conta"
              dica="Anexar conta (PDF ou foto)"
              anexo={conta.conta}
              onAnexar={(arquivo) => anexar('conta', arquivo)}
              onRemover={() => desanexar('conta')}
            />
          )}
          <LinhaAnexo
            titulo="Comprovante"
            dica="Anexar comprovante e marcar como pago"
            anexo={conta.comprovante}
            onAnexar={(arquivo) => anexar('comprovante', arquivo)}
            onRemover={() => desanexar('comprovante')}
          />

          {!conta.contaFixaId && (
            <button
              type="button"
              onClick={remover}
              className="flex items-center gap-1.5 text-sm font-medium text-rose-600"
            >
              <Trash2 size={14} /> Remover conta avulsa
            </button>
          )}
        </div>
      )}
    </article>
  )
}
