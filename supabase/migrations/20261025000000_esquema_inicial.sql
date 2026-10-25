-- Já pagamos? — esquema inicial
-- Uma casa só: quem está na tabela moradores (pelo e-mail do login) enxerga e edita tudo.

create table public.moradores (
  email text primary key check (email = lower(email)),
  nome text not null
);

-- Contas que se repetem todo mês. Desativar em vez de apagar preserva o histórico.
create table public.contas_fixas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  tipo text not null check (tipo in ('boleto', 'debito')),
  ativa boolean not null default true,
  criada_em timestamptz not null default now()
);

-- Linhas da checklist de cada mês. conta/comprovante guardam os metadados do anexo
-- ({ id, nome, tipoMime, tamanho, enviadoEm, caminho }); o arquivo fica no Storage.
create table public.contas_do_mes (
  id uuid primary key default gen_random_uuid(),
  mes text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  conta_fixa_id uuid references public.contas_fixas (id),
  nome text not null,
  tipo text not null check (tipo in ('boleto', 'debito')),
  vencimento date not null,
  valor numeric(12, 2),
  responsavel text,
  conta jsonb,
  comprovante jsonb,
  pago_em date,
  criada_em timestamptz not null default now(),
  -- evita gerar a mesma conta fixa duas vezes se os dois abrirem o mês ao mesmo tempo
  unique (mes, conta_fixa_id)
);

create index contas_do_mes_mes_idx on public.contas_do_mes (mes);

create function public.eh_morador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.moradores where email = lower(auth.jwt() ->> 'email')
  );
$$;

alter table public.moradores enable row level security;
alter table public.contas_fixas enable row level security;
alter table public.contas_do_mes enable row level security;

create policy "moradores gerenciam moradores" on public.moradores
  for all to authenticated using (public.eh_morador()) with check (public.eh_morador());

create policy "moradores gerenciam contas fixas" on public.contas_fixas
  for all to authenticated using (public.eh_morador()) with check (public.eh_morador());

create policy "moradores gerenciam contas do mes" on public.contas_do_mes
  for all to authenticated using (public.eh_morador()) with check (public.eh_morador());

-- Arquivos: bucket privado, só PDF e imagem, até 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos', 'anexos', false, 10485760, array['application/pdf', 'image/*'])
on conflict (id) do nothing;

create policy "moradores gerenciam anexos" on storage.objects
  for all to authenticated
  using (bucket_id = 'anexos' and public.eh_morador())
  with check (bucket_id = 'anexos' and public.eh_morador());
