-- Leads de venda do painel do dono: empresas para oferecer o app pelo WhatsApp.
-- Só o dono lê e escreve (eh_dono); ninguém mais vê pela API.
create table if not exists public.leads (
  id bigint generated always as identity primary key,
  empresa text not null check (char_length(empresa) between 1 and 120),
  ramo text check (char_length(ramo) <= 120),
  regiao text check (char_length(regiao) <= 120),
  telefone text check (telefone ~ '^[0-9]{10,13}$'),
  prioridade text not null default 'media' check (prioridade in ('alta','media','baixa')),
  status text not null default 'novo' check (status in ('novo','contatado','respondeu','cliente','sem_interesse')),
  notas text check (char_length(notas) <= 2000),
  fonte text check (char_length(fonte) <= 500),
  contatado_em timestamptz,
  criado_em timestamptz not null default now()
);
alter table public.leads enable row level security;
revoke all on public.leads from anon;
grant select, insert, update, delete on public.leads to authenticated;

drop policy if exists "leads só do dono" on public.leads;
create policy "leads só do dono" on public.leads for all to authenticated
  using ((select public.eh_dono())) with check ((select public.eh_dono()));
