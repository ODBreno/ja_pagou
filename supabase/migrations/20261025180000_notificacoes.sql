-- Notificações push: aparelhos inscritos e registro do que já foi avisado.

-- Cada aparelho que ativou as notificações. O endpoint é único por navegador/aparelho.
create table public.inscricoes_push (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  email text not null,
  criada_em timestamptz not null default now()
);

alter table public.inscricoes_push enable row level security;

-- Cada morador gerencia só as inscrições dos próprios aparelhos.
create policy "moradores gerenciam as proprias inscricoes" on public.inscricoes_push
  for all to authenticated
  using (public.eh_morador() and email = lower(auth.jwt() ->> 'email'))
  with check (public.eh_morador() and email = lower(auth.jwt() ->> 'email'));

-- Evita mandar o mesmo aviso duas vezes (ex.: "vence:1:2026-11:<conta>", "tudo-pago:2026-11").
-- Sem políticas: só o servidor (chave secreta) lê e escreve aqui.
create table public.avisos_enviados (
  chave text primary key,
  enviado_em timestamptz not null default now()
);

alter table public.avisos_enviados enable row level security;
