import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../dados/supabase'

/** Salva na hora, independente do botão "Salvar" das configurações. */
export function DefinirSenha() {
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null)

  async function salvar() {
    if (senha.length < 6) {
      setMensagem({ ok: false, texto: 'A senha precisa ter pelo menos 6 caracteres.' })
      return
    }
    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvando(false)
    if (error) setMensagem({ ok: false, texto: error.message })
    else {
      setSenha('')
      setMensagem({ ok: true, texto: 'Senha salva. Da próxima vez, entre com e-mail e senha.' })
    }
  }

  return (
    <section className="space-y-3 rounded-2xl bg-superficie p-4 ring-1 ring-borda">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound size={16} className="text-destaque-claro" /> Sua senha
        </h2>
        <p className="text-sm text-suave">Para entrar sem precisar do link por e-mail.</p>
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Nova senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            salvar()
          }}
          className="min-w-0 flex-1 rounded-lg border border-borda bg-elevado px-3 py-2 outline-none focus:border-destaque"
        />
        <button
          type="button"
          onClick={salvar}
          disabled={salvando || !senha}
          className="rounded-lg bg-destaque px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
      {mensagem && (
        <p className={`text-sm ${mensagem.ok ? 'text-emerald-300' : 'text-rose-400'}`}>{mensagem.texto}</p>
      )}
    </section>
  )
}
