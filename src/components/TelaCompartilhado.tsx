import { ChevronLeft, ChevronRight, FileText, Receipt, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { anexarArquivo, carregarMes, salvarConta } from '../dados/repositorio'
import { diaEMes, mesAtual, nomeDoMes, somarMeses } from '../lib/datas'
import { lerCodigoDoPdf } from '../lib/lerPdf'
import { statusDa } from '../lib/status'
import type { CampoAnexo, Configuracao, ContaDoMes } from '../tipos'

interface Props {
  arquivo: File
  configuracao: Configuracao
  onConcluir: (mes: string) => void
}

/** Tela que abre quando um PDF/foto chega pelo "Compartilhar" do celular: escolher em qual conta anexar. */
export function TelaCompartilhado({ arquivo, configuracao, onConcluir }: Props) {
  const [mes, setMes] = useState(mesAtual)
  const [contas, setContas] = useState<ContaDoMes[] | null>(null)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    carregarMes(mes, configuracao.contasFixas)
      .then((carregadas) => ativo && setContas(carregadas))
      .catch((e: Error) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
  }, [mes, configuracao])

  function trocarMes(quantidade: number) {
    setContas(null)
    setMes(somarMeses(mes, quantidade))
  }

  async function anexar(conta: ContaDoMes, campo: CampoAnexo) {
    setSalvando(`${conta.id}:${campo}`)
    setErro(null)
    try {
      let atualizada = await anexarArquivo(conta, campo, arquivo)
      if (campo === 'conta' && arquivo.type === 'application/pdf' && !atualizada.codigoPagamento) {
        const achado = await lerCodigoDoPdf(arquivo).catch(() => null)
        if (achado) {
          atualizada = { ...atualizada, codigoPagamento: achado.codigo, valor: atualizada.valor ?? achado.valor }
          await salvarConta(atualizada)
        }
      }
      onConcluir(mes)
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(null)
    }
  }

  const pendentesPrimeiro = [...(contas ?? [])].sort(
    (a, b) =>
      Number(statusDa(a) === 'pago') - Number(statusDa(b) === 'pago') || a.vencimento.localeCompare(b.vencimento),
  )

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pt-4 pb-10">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-wide text-destaque-claro">Já pagamos?</p>
          <h1 className="text-2xl font-bold">Anexar em qual conta?</h1>
          <p className="mt-1 truncate text-sm text-suave">{arquivo.name}</p>
        </div>
        <button
          type="button"
          onClick={() => onConcluir(mesAtual())}
          className="rounded-full p-2 text-suave hover:bg-elevado"
          aria-label="Cancelar"
        >
          <X size={22} />
        </button>
      </header>

      <div className="flex items-center justify-between rounded-xl bg-superficie px-2 py-1 ring-1 ring-borda">
        <button type="button" onClick={() => trocarMes(-1)} className="p-2 text-suave" aria-label="Mês anterior">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold">{nomeDoMes(mes)}</span>
        <button type="button" onClick={() => trocarMes(1)} className="p-2 text-suave" aria-label="Próximo mês">
          <ChevronRight size={20} />
        </button>
      </div>

      {erro && <p className="rounded-xl bg-rose-500/15 p-3 text-sm text-rose-300">{erro}</p>}
      {contas === null && !erro && <p className="py-6 text-center text-apagado">Carregando…</p>}

      {pendentesPrimeiro.map((conta) => {
        const pago = statusDa(conta) === 'pago'
        const botoes: { campo: CampoAnexo; rotulo: string; Icone: typeof FileText }[] = [
          ...(conta.tipo === 'boleto' && !pago ? [{ campo: 'conta' as const, rotulo: 'É a conta', Icone: FileText }] : []),
          { campo: 'comprovante', rotulo: 'É o comprovante', Icone: Receipt },
        ]
        return (
          <div key={conta.id} className="rounded-2xl bg-superficie p-4 ring-1 ring-borda">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">{conta.nome}</p>
              <p className="text-sm text-suave">{pago ? 'Pago' : `Vence ${diaEMes(conta.vencimento)}`}</p>
            </div>
            <div className="mt-3 flex gap-2">
              {botoes.map(({ campo, rotulo, Icone }) => (
                <button
                  key={campo}
                  type="button"
                  disabled={salvando !== null}
                  onClick={() => anexar(conta, campo)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-elevado py-2.5 text-sm font-medium text-texto hover:bg-destaque hover:text-white disabled:opacity-50"
                >
                  <Icone size={16} />
                  {salvando === `${conta.id}:${campo}` ? 'Anexando…' : rotulo}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
