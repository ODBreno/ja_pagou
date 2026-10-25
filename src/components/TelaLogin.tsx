import { Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { supabase } from '../dados/supabase'

/** Login sem senha: o Supabase manda um link por e-mail que volta para este endereço já logado. */
export function TelaLogin() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    })
    setEnviando(false)
    if (error) setErro(error.message)
    else setEnviado(true)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <p className="text-sm font-semibold tracking-wide text-destaque-claro">Já pagamos?</p>
      <h1 className="mt-1 text-3xl font-bold">As contas da casa, mês a mês.</h1>

      {enviado ? (
        <div className="mt-8 rounded-2xl bg-superficie p-5 ring-1 ring-borda">
          <Mail className="text-destaque-claro" />
          <p className="mt-3 font-semibold">Confira seu e-mail</p>
          <p className="mt-1 text-sm text-suave">
            Mandamos um link de acesso para <strong className="text-texto">{email}</strong>. Abra ele neste
            aparelho para entrar.
          </p>
          <button
            type="button"
            onClick={() => setEnviado(false)}
            className="mt-4 text-sm font-medium text-destaque-claro"
          >
            Usar outro e-mail
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="mt-8 space-y-3">
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
          {erro && <p className="text-sm text-rose-400">{erro}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl bg-destaque py-3 font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Receber link de acesso'}
          </button>
        </form>
      )}
    </main>
  )
}
