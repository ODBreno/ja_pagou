import { useEffect, useState } from 'react'
import { avisarMesTodoPago } from '../dados/notificacoes'
import { carregarMes, salvarConta } from '../dados/repositorio'
import { supabase } from '../dados/supabase'
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

  const [erro, setErro] = useState<string | null>(null)

  // Recarrega ao voltar para o app, para ver o que a outra pessoa mudou nesse meio-tempo.
  useEffect(() => {
    let ativo = true
    function carregar() {
      carregarMes(mes, configuracao.contasFixas)
        .then((carregadas) => {
          if (!ativo) return
          setContas(carregadas)
          setErro(null)
        })
        .catch((e: Error) => ativo && setErro(e.message))
    }
    function aoVoltar() {
      if (document.visibilityState === 'visible') carregar()
    }
    // Tempo real: quando a outra pessoa muda uma conta deste mês, recarrega
    // (com um respiro, para várias mudanças seguidas virarem uma recarga só).
    let espera: ReturnType<typeof setTimeout> | undefined
    const canal = supabase
      .channel(`contas-${mes}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contas_do_mes', filter: `mes=eq.${mes}` }, () => {
        clearTimeout(espera)
        espera = setTimeout(carregar, 500)
      })
      .subscribe()

    carregar()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      ativo = false
      clearTimeout(espera)
      supabase.removeChannel(canal)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [mes, configuracao])

  function alterar(conta: ContaDoMes) {
    const novas = contas?.map((c) => (c.id === conta.id ? conta : c)) ?? []
    const todasPagas = (lista: ContaDoMes[]) => lista.length > 0 && lista.every((c) => statusDa(c) === 'pago')
    const acabouDePagarTudo = todasPagas(novas) && !todasPagas(contas ?? [])
    setContas(novas)
    salvarConta(conta)
      // Depois de salvo, para o servidor ver o mês já todo pago; falha aqui não atrapalha o uso.
      .then(() => {
        if (acabouDePagarTudo) avisarMesTodoPago(mes).catch(() => {})
      })
      .catch((e: Error) => alert(`Não foi possível salvar: ${e.message}`))
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28">
      <CabecalhoMes mes={mes} onMudarMes={onMudarMes} onAbrirConfiguracoes={onAbrirConfiguracoes} />
      {erro && (
        <p className="mb-3 rounded-xl bg-rose-500/15 p-3 text-sm text-rose-300">Erro ao carregar: {erro}</p>
      )}
      {contas === null ? (
        !erro && <p className="py-10 text-center text-apagado">Carregando…</p>
      ) : (
        <div className="space-y-3">
          <ResumoMes contas={contas} />
          {ordenar(contas).map((conta) => (
            <CartaoConta
              key={conta.id}
              conta={conta}
              moradores={configuracao.moradores.map((m) => m.nome)}
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
