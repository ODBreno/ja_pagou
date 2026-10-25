import { Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { supabase } from '../dados/supabase'

type Modo = 'senha' | 'link'

/** As mensagens do Supabase vêm em inglês; as que aparecem no uso normal ganham tradução. */
function traduzir(mensagem: string): string {
  if (/invalid login credentials/i.test(mensagem)) return 'E-mail ou senha incorretos.'
  if (/rate limit/i.test(mensagem))
    return 'O limite de e-mails por hora do Supabase foi atingido. Tente de novo mais tarde ou entre com senha.'
  return mensagem
}

/**
 * Senha é o caminho principal: não depende de e-mail (o plano grátis do Supabase manda
 * poucos por hora) e funciona no app instalado. O link por e-mail serve para o primeiro acesso.
 */
export function TelaLogin() {
  const [modo, setModo] = useState<Modo>('senha')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [linkEnviado, setLinkEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const emailLimpo = email.trim().toLowerCase()
    const { error } =
      modo === 'senha'
        ? await supabase.auth.signInWithPassword({ email: emailLimpo, password: senha })
        : await supabase.auth.signInWithOtp({ email: emailLimpo, options: { emailRedirectTo: window.location.origin } })
    setEnviando(false)
    if (error) setErro(traduzir(error.message))
    else if (modo === 'link') setLinkEnviado(true)
  }

  function trocarModo(novo: Modo) {
    setModo(novo)
    setErro(null)
    setLinkEnviado(false)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <p className="text-sm font-semibold tracking-wide text-destaque-claro">Já pagamos?</p>
      <h1 className="mt-1 text-3xl font-bold">As contas da casa, mês a mês.</h1>

      <div className="mt-8 grid grid-cols-2 rounded-xl bg-elevado p-1 text-sm font-medium">
        {(['senha', 'link'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => trocarModo(m)}
            className={`rounded-lg py-2 ${modo === m ? 'bg-destaque text-white' : 'text-suave'}`}
          >
            {m === 'senha' ? 'Com senha' : 'Link por e-mail'}
          </button>
        ))}
      </div>

      {linkEnviado ? (
        <div className="mt-4 rounded-2xl bg-superficie p-5 ring-1 ring-borda">
          <Mail className="text-destaque-claro" />
          <p className="mt-3 font-semibold">Confira seu e-mail</p>
          <p className="mt-1 text-sm text-suave">
            Mandamos um link de acesso para <strong className="text-texto">{email}</strong>. Abra ele neste
            aparelho para entrar. Depois, defina uma senha em Configurações para não precisar mais do e-mail.
          </p>
          <button
            type="button"
            onClick={() => setLinkEnviado(false)}
            className="mt-4 text-sm font-medium text-destaque-claro"
          >
            Usar outro e-mail
          </button>
        </div>
      ) : (
        <form onSubmit={entrar} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm text-suave">Seu e-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-borda bg-elevado px-4 py-3 outline-none focus:border-destaque"
            />
          </label>
          {modo === 'senha' && (
            <label className="block">
              <span className="text-sm text-suave">Senha</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1 w-full rounded-xl border border-borda bg-elevado px-4 py-3 outline-none focus:border-destaque"
              />
            </label>
          )}
          {erro && <p className="text-sm text-rose-400">{erro}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl bg-destaque py-3 font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Aguarde…' : modo === 'senha' ? 'Entrar' : 'Receber link de acesso'}
          </button>
          {modo === 'senha' && (
            <p className="text-center text-xs text-apagado">
              Primeira vez? Entre pelo link por e-mail e crie sua senha em Configurações.
            </p>
          )}
        </form>
      )}
    </main>
  )
}
