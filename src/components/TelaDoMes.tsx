import { useEffect, useState } from 'react'
import { carregarMes, salvarConta } from '../dados/repositorio'
import { statusDa } from '../lib/status'
import type { Configuracao, ContaDoMes } from '../tipos'
import { CabecalhoMes } from './CabecalhoMes'
import { CartaoConta } from './CartaoConta'
import { NovaContaAvulsa } from './NovaContaAvulsa'
import { ResumoMes } from './ResumoMes'

interface Props {
  mes: string
  configuracao: Configuracao
  onMudarMes: (mes: string) => void
  onAbrirConfiguracoes: () => void
}

/** Pendentes primeiro, por vencimento; as pagas vão para o fim. */
function ordenar(contas: ContaDoMes[]): ContaDoMes[] {
  return [...contas].sort((a, b) => {
    const pagaA = statusDa(a) === 'pago'
    const pagaB = statusDa(b) === 'pago'
    if (pagaA !== pagaB) return pagaA ? 1 : -1
    return a.vencimento.localeCompare(b.vencimento) || a.nome.localeCompare(b.nome)
  })
}

export function TelaDoMes({ mes, configuracao, onMudarMes, onAbrirConfiguracoes }: Props) {
  const [contas, setContas] = useState<ContaDoMes[] | null>(null)
  const [aberta, setAberta] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    carregarMes(mes, configuracao.contasFixas).then((carregadas) => {
      if (ativo) setContas(carregadas)
    })
    return () => {
      ativo = false
    }
  }, [mes, configuracao])

  function alterar(conta: ContaDoMes) {
    setContas((atuais) => atuais?.map((c) => (c.id === conta.id ? conta : c)) ?? null)
    salvarConta(conta)
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-10">
      <CabecalhoMes mes={mes} onMudarMes={onMudarMes} onAbrirConfiguracoes={onAbrirConfiguracoes} />
      {contas === null ? (
        <p className="py-10 text-center text-slate-400">Carregando…</p>
      ) : (
        <div className="space-y-3">
          <ResumoMes contas={contas} />
          {ordenar(contas).map((conta) => (
            <CartaoConta
              key={conta.id}
              conta={conta}
              moradores={configuracao.moradores}
              aberta={aberta === conta.id}
              onAlternar={() => setAberta(aberta === conta.id ? null : conta.id)}
              onAlterada={alterar}
              onRemovida={() => setContas(contas.filter((c) => c.id !== conta.id))}
            />
          ))}
          <NovaContaAvulsa mes={mes} onAdicionada={(conta) => setContas([...contas, conta])} />
        </div>
      )}
    </div>
  )
}
