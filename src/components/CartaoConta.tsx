import { ChevronDown, FileText, Repeat, ScanText, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { anexarArquivo, baixarAnexo, removerAnexo, removerConta } from '../dados/repositorio'
import { lerCodigoDoPdf } from '../lib/lerPdf'
import { diaEMes, diasAte, hoje } from '../lib/datas'
import { formatarReais, valorParaTexto } from '../lib/dinheiro'
import { estaAtrasada, statusDa, type Status } from '../lib/status'
import type { CampoAnexo, ContaDoMes } from '../tipos'
import { BotaoCopiar } from './BotaoCopiar'
import { CampoCodigo } from './CampoCodigo'
import { CampoValor } from './CampoValor'
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
  pago: 'bg-emerald-500/15 text-emerald-300',
  a_pagar: 'bg-amber-400/15 text-amber-300',
  aguardando_conta: 'bg-elevado text-suave',
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
  const Icone = conta.tipo === 'debito' ? Repeat : FileText

  const [lendoPdf, setLendoPdf] = useState(false)
  const [leitura, setLeitura] = useState<{ ok: boolean; texto: string } | null>(null)

  /** Procura a linha digitável / Pix no PDF da conta e preenche o código (e o valor, se vazio). */
  async function preencherPeloPdf(base: ContaDoMes, arquivo: Blob) {
    setLendoPdf(true)
    setLeitura(null)
    try {
      const achado = await lerCodigoDoPdf(arquivo)
      if (!achado) {
        setLeitura({ ok: false, texto: 'Não achei o código neste PDF. Cole manualmente.' })
        return
      }
      const pegouValor = base.valor == null && achado.valor != null
      onAlterada({ ...base, codigoPagamento: achado.codigo, valor: base.valor ?? achado.valor })
      setLeitura({ ok: true, texto: pegouValor ? 'Código e valor lidos do PDF ✓' : 'Código lido do PDF ✓' })
    } catch {
      setLeitura({ ok: false, texto: 'Não consegui ler este PDF.' })
    } finally {
      setLendoPdf(false)
    }
  }

  async function anexar(campo: CampoAnexo, arquivo: File) {
    const atualizada = await anexarArquivo(conta, campo, arquivo)
    onAlterada(atualizada)
    if (campo === 'conta' && arquivo.type === 'application/pdf' && !atualizada.codigoPagamento) {
      await preencherPeloPdf(atualizada, arquivo)
    }
  }

  async function lerPdfAnexado() {
    try {
      await preencherPeloPdf(conta, await baixarAnexo(conta.conta!))
    } catch (erro) {
      setLeitura({ ok: false, texto: `Não consegui baixar o PDF: ${(erro as Error).message}` })
    }
  }

  const podeLerPdf = status !== 'pago' && !conta.codigoPagamento && conta.conta?.tipoMime === 'application/pdf'

  async function desanexar(campo: CampoAnexo) {
    onAlterada(await removerAnexo(conta, campo))
  }

  async function remover() {
    if (!confirm(`Remover "${conta.nome}" deste mês?`)) return
    try {
      await removerConta(conta)
      onRemovida()
    } catch (erro) {
      alert(`Não foi possível remover: ${(erro as Error).message}`)
    }
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl bg-superficie ring-1 ${atrasada ? 'ring-rose-500/50' : 'ring-borda'}`}
    >
      <button type="button" onClick={onAlternar} className="flex w-full items-center gap-3 p-4 text-left">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            status === 'pago' ? 'bg-emerald-500/20 text-emerald-400' : atrasada ? 'bg-rose-500/15 text-rose-400' : 'bg-elevado text-suave'
          }`}
        >
          <Icone size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className={`truncate font-semibold ${status === 'pago' ? 'text-suave' : ''}`}>{conta.nome}</span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILO_STATUS[status]}`}>
              {rotuloStatus(conta, status)}
            </span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2 text-sm">
            <span className={atrasada ? 'font-medium text-rose-400' : 'text-suave'}>
              {textoVencimento(conta, status)}
            </span>
            <span className="flex items-center gap-1 text-suave">
              {conta.valor != null && formatarReais(conta.valor)}
              <ChevronDown size={16} className={`text-apagado transition-transform ${aberta ? 'rotate-180' : ''}`} />
            </span>
          </span>
        </span>
      </button>

      {aberta && (
        <div className="space-y-3 border-t border-borda p-4">
          <p className="text-xs text-suave">
            {conta.tipo === 'debito'
              ? 'Débito automático: anexe o comprovante do Pix para a conta.'
              : 'Anexe a conta quando ela chegar e o comprovante depois de pagar.'}
          </p>

          {(status !== 'pago' || conta.codigoPagamento) && (
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-suave uppercase">
                {conta.tipo === 'debito' ? 'Chave Pix / código' : 'Código para pagar'}
              </p>
              <CampoCodigo
                key={conta.codigoPagamento ?? ''}
                codigo={conta.codigoPagamento}
                onMudar={(codigoPagamento) => onAlterada({ ...conta, codigoPagamento })}
              />
              {lendoPdf && <p className="mt-2 text-sm text-suave">Lendo o PDF…</p>}
              {!lendoPdf && leitura && (
                <p className={`mt-2 text-sm ${leitura.ok ? 'text-emerald-300' : 'text-amber-300'}`}>{leitura.texto}</p>
              )}
              {!lendoPdf && podeLerPdf && (
                <button
                  type="button"
                  onClick={lerPdfAnexado}
                  className="mt-2 flex items-center gap-1.5 text-sm font-medium text-destaque-claro"
                >
                  <ScanText size={16} /> Ler código do PDF anexado
                </button>
              )}
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-suave uppercase">Valor</p>
            <CampoValor
              key={conta.valor ?? ''}
              valor={conta.valor}
              onMudar={(valor) => onAlterada({ ...conta, valor })}
              acessorio={
                conta.valor != null && (
                  <BotaoCopiar texto={valorParaTexto(conta.valor)} rotulo="Copiar valor" compacto />
                )
              }
            />
          </div>

          {status === 'pago' && (
            <label className="block">
              <span className="text-xs font-semibold tracking-wide text-suave uppercase">Pago em</span>
              <input
                type="date"
                required
                value={conta.pagoEm ?? ''}
                max={hoje()}
                onChange={(e) => e.target.value && onAlterada({ ...conta, pagoEm: e.target.value })}
                className="mt-1 w-full rounded-lg border border-borda bg-elevado px-3 py-2 outline-none focus:border-destaque"
              />
            </label>
          )}

          {status !== 'pago' && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-suave uppercase">Quem vai pagar</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {moradores.map((nome) => (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => onAlterada({ ...conta, responsavel: conta.responsavel === nome ? null : nome })}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                      conta.responsavel === nome ? 'bg-destaque text-white' : 'bg-elevado text-suave'
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
              className="flex items-center gap-1.5 text-sm font-medium text-rose-400"
            >
              <Trash2 size={14} /> Remover conta avulsa
            </button>
          )}
        </div>
      )}
    </article>
  )
}
