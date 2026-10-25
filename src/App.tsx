import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { Configuracoes } from './components/Configuracoes'
import { MenuInferior, type Aba } from './components/MenuInferior'
import { TelaAno } from './components/TelaAno'
import { TelaCompartilhado } from './components/TelaCompartilhado'
import { TelaDoMes } from './components/TelaDoMes'
import { TelaMetricas } from './components/TelaMetricas'
import { TelaLogin } from './components/TelaLogin'
import { carregarConfiguracao, salvarConfiguracao } from './dados/repositorio'
import { supabase, supabaseConfigurado } from './dados/supabase'
import { descartarArquivoCompartilhado, pegarArquivoCompartilhado } from './lib/compartilhado'
import { mesAtual } from './lib/datas'
import type { Configuracao } from './tipos'

function Aviso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <div className="text-suave">{children}</div>
    </main>
  )
}

function App() {
  /** undefined: ainda verificando; null: deslogado. */
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [mes, setMes] = useState(mesAtual)
  const [ano, setAno] = useState(() => Number(mesAtual().slice(0, 4)))
  const [tela, setTela] = useState<Aba | 'configuracoes'>('mes')
  const email = sessao?.user.email?.toLowerCase()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => data.subscription.unsubscribe()
  }, [])

  const [compartilhado, setCompartilhado] = useState<File | null>(null)

  useEffect(() => {
    if (!email) return
    carregarConfiguracao()
      .then(setConfiguracao)
      .catch((e: Error) => setErro(e.message))
    pegarArquivoCompartilhado().then(setCompartilhado)
  }, [email])

  if (!supabaseConfigurado) {
    return (
      <Aviso titulo="Supabase não configurado">
        Preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> no{' '}
        <code>.env.local</code> (veja o <code>.env.example</code>).
      </Aviso>
    )
  }
  if (sessao === undefined) return <p className="py-10 text-center text-apagado">Carregando…</p>
  if (!sessao) return <TelaLogin />
  if (erro) return <Aviso titulo="Erro ao carregar">{erro}</Aviso>
  if (!configuracao) return <p className="py-10 text-center text-apagado">Carregando…</p>

  // Sem estar na tabela moradores o RLS devolve tudo vazio.
  if (!configuracao.moradores.some((m) => m.email === email)) {
    return (
      <Aviso titulo="Acesso não liberado">
        <p>
          O e-mail <strong className="text-texto">{email}</strong> não está cadastrado nesta casa. Peça para
          alguém da casa adicionar você em Configurações.
        </p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="mt-4 font-medium text-destaque-claro"
        >
          Entrar com outro e-mail
        </button>
      </Aviso>
    )
  }

  if (compartilhado) {
    return (
      <TelaCompartilhado
        arquivo={compartilhado}
        configuracao={configuracao}
        onConcluir={async (mesEscolhido) => {
          await descartarArquivoCompartilhado()
          setCompartilhado(null)
          setMes(mesEscolhido)
          setTela('mes')
        }}
      />
    )
  }

  if (tela === 'configuracoes') {
    return (
      <Configuracoes
        configuracao={configuracao}
        emailLogado={email!}
        onVoltar={() => setTela('mes')}
        onSair={() => supabase.auth.signOut()}
        onSalvar={async (nova) => {
          await salvarConfiguracao(nova, configuracao)
          setConfiguracao(await carregarConfiguracao())
          setTela('mes')
        }}
      />
    )
  }

  const abrirConfiguracoes = () => setTela('configuracoes')

  return (
    <>
      {tela === 'mes' && (
        <TelaDoMes
          key={mes}
          mes={mes}
          configuracao={configuracao}
          onMudarMes={setMes}
          onAbrirConfiguracoes={abrirConfiguracoes}
        />
      )}
      {tela === 'ano' && (
        <TelaAno
          ano={ano}
          onMudarAno={setAno}
          onAbrirConfiguracoes={abrirConfiguracoes}
          onAbrirMes={(escolhido) => {
            setMes(escolhido)
            setTela('mes')
          }}
        />
      )}
      {tela === 'metricas' && <TelaMetricas onAbrirConfiguracoes={abrirConfiguracoes} />}
      <MenuInferior
        aba={tela}
        onTrocar={(aba) => {
          if (aba === 'ano') setAno(Number(mes.slice(0, 4)))
          setTela(aba)
        }}
      />
    </>
  )
}

export default App
