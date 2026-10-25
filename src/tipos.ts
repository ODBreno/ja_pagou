/** boleto: chega uma conta (PDF/foto) para pagar. debito: debitado sozinho, só tem comprovante. */
export type TipoConta = 'boleto' | 'debito'

export type CampoAnexo = 'conta' | 'comprovante'

/** Conta que se repete todo mês; serve de modelo para gerar a checklist. */
export interface ContaFixa {
  id: string
  nome: string
  diaVencimento: number
  tipo: TipoConta
}

export interface Anexo {
  id: string
  nome: string
  tipoMime: string
  tamanho: number
  enviadoEm: string
  /** Caminho do arquivo no bucket "anexos" do Supabase Storage. */
  caminho: string
}

/** Uma linha da checklist de um mês específico. */
export interface ContaDoMes {
  id: string
  /** YYYY-MM */
  mes: string
  /** null quando é uma conta avulsa, só deste mês. */
  contaFixaId: string | null
  nome: string
  tipo: TipoConta
  /** YYYY-MM-DD */
  vencimento: string
  valor: number | null
  responsavel: string | null
  conta: Anexo | null
  comprovante: Anexo | null
  /** YYYY-MM-DD */
  pagoEm: string | null
}

/** Pessoa da casa; o e-mail é o do login e é o que libera o acesso aos dados. */
export interface Morador {
  email: string
  nome: string
}

export interface Configuracao {
  moradores: Morador[]
  contasFixas: ContaFixa[]
}
