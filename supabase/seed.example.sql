-- Copie para o SQL Editor do Supabase, troque os e-mails e rode uma vez.
-- (Não versione os e-mails reais: este arquivo é só o modelo.)

insert into public.moradores (email, nome) values
  (lower('seu-email@exemplo.com'), 'Breno'),
  (lower('email-da-naty@exemplo.com'), 'Naty');

insert into public.contas_fixas (nome, dia_vencimento, tipo) values
  ('Internet', 1, 'debito'),
  ('Condomínio', 8, 'boleto'),
  ('Conta de luz', 10, 'boleto'),
  ('Gás', 15, 'boleto');
