-- Registro de erros do app: qualquer pessoa só consegue INSERIR; ninguém lê pela API.
-- O dono lê pelo SQL Editor: select * from public.erros order by criado_em desc limit 50;
create table if not exists public.erros (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  mensagem text not null check (length(mensagem) <= 500),
  onde text check (length(onde) <= 300),
  pilha text check (length(pilha) <= 2000),
  tela text check (length(tela) <= 200),
  navegador text check (length(navegador) <= 300),
  versao text check (length(versao) <= 20)
);
alter table public.erros enable row level security;
create policy "registrar erro" on public.erros for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
revoke all on public.erros from anon, authenticated;
grant insert (mensagem, onde, pilha, tela, navegador, versao, user_id) on public.erros to anon, authenticated;
create index if not exists erros_criado_em on public.erros (criado_em desc);
