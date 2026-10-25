-- Quem costuma pagar cada conta fixa (entra sozinho como responsável ao gerar o mês).
alter table public.contas_fixas
  add column responsavel text;

-- Publica as mudanças da checklist no Realtime, para um celular ver na hora o que o outro marcou.
-- O Realtime respeita o RLS: só moradores recebem os eventos.
alter publication supabase_realtime add table public.contas_do_mes;
