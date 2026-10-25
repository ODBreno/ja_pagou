import { createClient } from '@supabase/supabase-js'

// Aceita também a URL copiada da tela da API (".../rest/v1/").
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/(rest\/v1\/?)?$/, '')
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && chave)

/**
 * flowType implicit: o link de login funciona mesmo se o e-mail for aberto em outro
 * navegador do aparelho (no PKCE ele só vale no navegador que pediu o link).
 */
export const supabase = createClient(url ?? 'http://localhost', chave ?? 'nao-configurado', {
  auth: { flowType: 'implicit' },
})
