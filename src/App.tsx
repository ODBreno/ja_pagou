import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { Configuracoes } from './components/Configuracoes'
import { TelaDoMes } from './components/TelaDoMes'
import { TelaLogin } from './components/TelaLogin'
import { carregarConfiguracao, salvarConfiguracao } from './dados/repositorio'
import { supabase, supabaseConfigurado } from './dados/supabase'
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
  const [tela, setTela] = useState<'mes' | 'configuracoes'>('mes')
  const email = sessao?.user.email?.toLowerCase()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!email) return
    carregarConfiguracao()
      .then(setConfiguracao)
      .catch((e: Error) => setErro(e.message))
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

  return (
    <TelaDoMes
      key={mes}
      mes={mes}
      configuracao={configuracao}
      onMudarMes={setMes}
      onAbrirConfiguracoes={() => setTela('configuracoes')}
    />
  )
}

export default App
