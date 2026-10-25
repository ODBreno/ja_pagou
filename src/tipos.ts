/** boleto: chega uma conta (PDF/foto) para pagar. debito: debitado sozinho, só tem comprovante. */
export type TipoConta = 'boleto' | 'debito'

export type CampoAnexo = 'conta' | 'comprovante'

/** Conta que se repete todo mês; serve de modelo para gerar a checklist. */
export interface ContaFixa {
  id: string
  nome: string
  diaVencimento: number
  tipo: TipoConta
  /** Valor que entra sozinho todo mês (ex.: condomínio, Pix fixo). */
  valorPadrao: number | null
  /** Código que se repete todo mês (ex.: chave Pix da conta do débito automático). */
  codigoPagamento: string | null
  /** Nome de quem costuma pagar; vira o responsável da conta em cada mês. */
  responsavel: string | null
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
  /** Linha digitável do boleto, Pix copia e cola ou chave Pix, para copiar na hora de pagar. */
  codigoPagamento: string | null
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
