import { useState } from 'react'
import { BotaoCopiar } from './BotaoCopiar'

interface Props {
  codigo: string | null
  placeholder: string
  onMudar: (codigo: string | null) => void
}

/** Código de pagamento colável (boleto, Pix copia e cola, chave Pix) com botão de copiar. */
export function CampoCodigo({ codigo, placeholder, onMudar }: Props) {
  const [texto, setTexto] = useState(codigo ?? '')

  function confirmar() {
    const limpo = texto.trim() || null
    if (limpo !== codigo) onMudar(limpo)
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={texto.length > 60 ? 3 : 1}
        value={texto}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        className="w-full resize-none rounded-lg border border-borda bg-elevado px-3 py-2 font-mono text-sm break-all outline-none focus:border-destaque"
      />
      {codigo && <BotaoCopiar texto={codigo} rotulo="Copiar código" />}
    </div>
  )
}
