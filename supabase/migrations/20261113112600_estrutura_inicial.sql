-- Estrutura inicial do banco do Rota Comercial (aplicada no projeto Supabase rota-comercial em 13/11/2026)

-- Perfil de cada representante, com o trial de 7 dias
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 40),
  plano text not null default 'trial' check (plano in ('trial','ativo','cancelado')),
  trial_ate timestamptz not null default (now() + interval '7 days'),
  regioes text[] not null default '{}',
  colecoes text[] not null default '{Outono,Inverno,Primavera,Verão}',
  extras jsonb not null default '{}',
  criado_em timestamptz not null default now()
);

-- Conta pode lançar? (trial em dia ou assinatura ativa)
create or replace function public.conta_ativa()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (p.plano = 'ativo' or (p.plano = 'trial' and p.trial_ate > now()))
  );
$$;

-- Cria o perfil quando a pessoa se cadastra
create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'nome', ''), 40));
  return new;
end;
$$;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_usuario();

create table public.marcas (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 40),
  nome text not null check (char_length(nome) between 1 and 80),
  taxa numeric(6,4) not null check (taxa >= 0 and taxa <= 1),
  cor text not null default '#2F6FED' check (cor ~ '^#[0-9A-Fa-f]{3,8}$'),
  atualizado timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.lojas (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 40),
  nome text not null check (char_length(nome) between 1 and 80),
  cidade text not null default '' check (char_length(cidade) <= 80),
  uf char(2) not null default 'BA',
  regiao text not null default '' check (char_length(regiao) <= 80),
  marcas text[] not null default '{}',
  lng double precision,
  lat double precision,
  arquivada boolean not null default false,
  atualizado timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.pedidos (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 40),
  loja text not null,
  marca text not null,
  data date not null,
  valor numeric(12,2) not null default 0 check (valor >= 0),
  previsto numeric(12,2) check (previsto is null or previsto >= 0),
  pendente boolean not null default false,
  pago boolean not null default false,
  taxa numeric(6,4) not null check (taxa >= 0 and taxa <= 1),
  colecao text not null default '' check (char_length(colecao) <= 80),
  atualizado timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, loja) references public.lojas(user_id, id),
  foreign key (user_id, marca) references public.marcas(user_id, id)
);
create index pedidos_por_data on public.pedidos (user_id, data);
create index pedidos_por_loja on public.pedidos (user_id, loja);
create index pedidos_por_marca on public.pedidos (user_id, marca);

create table public.despesas (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 40),
  data date not null,
  valor numeric(12,2) not null check (valor > 0),
  categoria text not null default '' check (char_length(categoria) <= 80),
  descricao text not null default '' check (char_length(descricao) <= 120),
  atualizado timestamptz not null default now(),
  primary key (user_id, id)
);
create index despesas_por_data on public.despesas (user_id, data);

-- Segurança: cada um só vê o que é seu; só lança com trial ou assinatura em dia
alter table public.profiles enable row level security;
alter table public.marcas enable row level security;
alter table public.lojas enable row level security;
alter table public.pedidos enable row level security;
alter table public.despesas enable row level security;

create policy "ver o próprio perfil" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "editar o próprio perfil" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- O usuário não pode mexer no plano nem no fim do trial
revoke update on public.profiles from authenticated, anon;
grant update (nome, regioes, colecoes, extras) on public.profiles to authenticated;

do $$
declare t text;
begin
  foreach t in array array['marcas','lojas','pedidos','despesas'] loop
    execute format('create policy "ver os seus" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "criar com conta ativa" on public.%I for insert to authenticated with check (user_id = (select auth.uid()) and (select public.conta_ativa()))', t);
    execute format('create policy "alterar com conta ativa" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (select public.conta_ativa()))', t);
    execute format('create policy "apagar com conta ativa" on public.%I for delete to authenticated using (user_id = (select auth.uid()) and (select public.conta_ativa()))', t);
  end loop;
end $$;

revoke execute on function public.novo_usuario() from public, anon, authenticated;
