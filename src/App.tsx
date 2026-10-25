import { useEffect, useState } from 'react'
import { Configuracoes } from './components/Configuracoes'
import { TelaDoMes } from './components/TelaDoMes'
import { carregarConfiguracao, salvarConfiguracao } from './dados/repositorio'
import { mesAtual } from './lib/datas'
import type { Configuracao } from './tipos'

function App() {
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null)
  const [mes, setMes] = useState(mesAtual)
  const [tela, setTela] = useState<'mes' | 'configuracoes'>('mes')

  useEffect(() => {
    carregarConfiguracao().then(setConfiguracao)
  }, [])

  if (!configuracao) return <p className="py-10 text-center text-apagado">Carregando…</p>

  if (tela === 'configuracoes') {
    return (
      <Configuracoes
        configuracao={configuracao}
        onVoltar={() => setTela('mes')}
        onSalvar={async (nova) => {
          await salvarConfiguracao(nova)
          setConfiguracao(nova)
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
