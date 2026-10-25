import { useEffect, useState } from 'react'
import { TelaDoMes } from './components/TelaDoMes'
import { carregarConfiguracao } from './dados/repositorio'
import { mesAtual } from './lib/datas'
import type { Configuracao } from './tipos'

function App() {
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null)
  const [mes, setMes] = useState(mesAtual)

  useEffect(() => {
    carregarConfiguracao().then(setConfiguracao)
  }, [])

  if (!configuracao) return <p className="py-10 text-center text-slate-400">Carregando…</p>

  return (
    <TelaDoMes
      key={mes}
      mes={mes}
      configuracao={configuracao}
      onMudarMes={setMes}
      onAbrirConfiguracoes={() => {}}
    />
  )
}

export default App
