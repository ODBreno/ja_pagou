-- Código para pagar (linha digitável do boleto, Pix copia e cola ou chave Pix) e valor padrão.
-- Na conta fixa vale para todo mês (ex.: a chave Pix do débito automático);
-- na conta do mês é o código daquele mês, preenchido com o da conta fixa ao gerar o mês.

alter table public.contas_fixas
  add column valor_padrao numeric(12, 2),
  add column codigo_pagamento text;

alter table public.contas_do_mes
  add column codigo_pagamento text;
