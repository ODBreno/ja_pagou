/**
 * crypto.randomUUID só existe em contexto seguro (HTTPS/localhost); no celular
 * acessando pelo IP da rede local ele não está disponível.
 */
export function novoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
