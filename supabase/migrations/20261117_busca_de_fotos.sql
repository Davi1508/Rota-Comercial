-- Busca de fotos de produtos (Brave): site da marca, limite mensal por usuário e cache de 30 dias
alter table public.marcas add column if not exists site text not null default '' check (char_length(site) <= 120);

create table if not exists public.busca_uso(user_id uuid not null references auth.users(id) on delete cascade, mes date not null, n int not null default 0, primary key(user_id, mes));
create table if not exists public.busca_limites(user_id uuid primary key references auth.users(id) on delete cascade, limite int not null check (limite between 0 and 100000));
create table if not exists public.busca_cache(q text primary key check (char_length(q) <= 300), resultado jsonb not null, criado timestamptz not null default now());
alter table public.busca_uso enable row level security;
alter table public.busca_limites enable row level security;
alter table public.busca_cache enable row level security;
revoke all on public.busca_uso, public.busca_limites, public.busca_cache from anon, authenticated;

-- Só a função do servidor (service_role) chama estas
create or replace function public.busca_cache_ler(p_q text) returns jsonb language sql stable security definer set search_path to '' as $$
  select resultado from public.busca_cache where q = p_q and criado > now() - interval '30 days' $$;
create or replace function public.busca_cache_gravar(p_q text, p_res jsonb) returns void language sql security definer set search_path to '' as $$
  insert into public.busca_cache(q, resultado, criado) values (p_q, p_res, now()) on conflict (q) do update set resultado = excluded.resultado, criado = now() $$;
create or replace function public.busca_contar(p_uid uuid) returns json language plpgsql security definer set search_path to '' as $$
declare lim int; usadas int; ativo boolean; m date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
begin
  select (p.plano = 'ativo' or (p.plano = 'trial' and p.trial_ate > now())) into ativo from public.profiles p where p.id = p_uid;
  if not coalesce(ativo, false) then return json_build_object('ok', false, 'motivo', 'conta'); end if;
  lim := coalesce((select limite from public.busca_limites where user_id = p_uid), 150);
  insert into public.busca_uso(user_id, mes, n) values (p_uid, m, 0) on conflict do nothing;
  update public.busca_uso set n = n + 1 where user_id = p_uid and mes = m and n < lim returning n into usadas;
  if usadas is null then return json_build_object('ok', false, 'motivo', 'limite', 'limite', lim); end if;
  return json_build_object('ok', true, 'usadas', usadas, 'limite', lim);
end $$;
create or replace function public.busca_meu_uso() returns json language sql stable security definer set search_path to '' as $$
  select json_build_object('usadas', coalesce((select n from public.busca_uso where user_id = auth.uid() and mes = date_trunc('month', now() at time zone 'America/Sao_Paulo')::date), 0),
                           'limite', coalesce((select limite from public.busca_limites where user_id = auth.uid()), 150)) $$;
revoke execute on function public.busca_cache_ler(text), public.busca_cache_gravar(text, jsonb), public.busca_contar(uuid) from public, anon, authenticated;
grant execute on function public.busca_cache_ler(text), public.busca_cache_gravar(text, jsonb), public.busca_contar(uuid) to service_role;
revoke execute on function public.busca_meu_uso() from public, anon;
grant execute on function public.busca_meu_uso() to authenticated;

-- Dono pode mudar o limite de alguém
create or replace function public.dono_alterar(p_email text, p_acao text, p_valor numeric default null)
 returns text language plpgsql security definer set search_path to '' as $function$
declare uid uuid;
begin
  if not public.eh_dono() then raise exception 'acesso negado' using errcode = '42501'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'e-mail não encontrado'; end if;
  if p_acao = 'ativar' then
    update public.profiles set plano = 'ativo', valor_mensal = coalesce(p_valor, valor_mensal, 29.90) where id = uid;
  elsif p_acao = 'pausar' then
    update public.profiles set plano = 'trial', trial_ate = now() where id = uid;
  elsif p_acao = 'mais7' then
    update public.profiles set plano = 'trial', trial_ate = greatest(coalesce(trial_ate, now()), now()) + interval '7 days' where id = uid;
  elsif p_acao = 'buscas' then
    insert into public.busca_limites(user_id, limite) values (uid, greatest(0, coalesce(p_valor, 150))::int)
      on conflict (user_id) do update set limite = excluded.limite;
  else raise exception 'ação inválida';
  end if;
  return 'ok';
end $function$;

-- Painel do dono: buscas de fotos do mês
create or replace function public.painel_dono()
 returns json language plpgsql stable security definer set search_path to ''
as $function$
declare r json;
begin
  if not public.eh_dono() then raise exception 'acesso negado' using errcode = '42501'; end if;
  with base as (
    select u.id, u.email, u.created_at, u.last_sign_in_at, coalesce(u.raw_app_meta_data->>'provider','email') as provedor,
           p.nome, p.plano, p.trial_ate, p.valor_mensal,
           case when p.plano = 'ativo' then 'pagante' when p.trial_ate > now() then 'teste' else 'vencido' end as situacao,
           (select count(*) from public.pedidos x where x.user_id = u.id) as pedidos,
           (select count(*) from public.lojas x where x.user_id = u.id) as lojas,
           (select count(*) from public.produtos x where x.user_id = u.id) as produtos,
           (select max(x.data) from public.pedidos x where x.user_id = u.id) as ultimo_pedido,
           coalesce((select x.n from public.busca_uso x where x.user_id = u.id and x.mes = date_trunc('month', now() at time zone 'America/Sao_Paulo')::date), 0) as buscas,
           coalesce((select x.limite from public.busca_limites x where x.user_id = u.id), 150) as limite_buscas
    from auth.users u join public.profiles p on p.id = u.id
    where not exists (select 1 from public.donos d where d.user_id = u.id)
  ), fotos as (
    select (storage.foldername(o.name))[1] as dono, count(*) as n, coalesce(sum((o.metadata->>'size')::bigint),0) as bytes
    from storage.objects o where o.bucket_id = 'fotos' group by 1
  )
  select json_build_object(
    'agora', now(),
    'resumo', (select json_build_object(
        'total', count(*),
        'teste', count(*) filter (where situacao = 'teste'),
        'vencido', count(*) filter (where situacao = 'vencido'),
        'pagante', count(*) filter (where situacao = 'pagante'),
        'novos7', count(*) filter (where created_at > now() - interval '7 days'),
        'novos30', count(*) filter (where created_at > now() - interval '30 days'),
        'ativos7', count(*) filter (where last_sign_in_at > now() - interval '7 days'),
        'vencem2', count(*) filter (where situacao = 'teste' and trial_ate < now() + interval '2 days'),
        'receita', coalesce(sum(case when situacao = 'pagante' then coalesce(valor_mensal, 29.90) end), 0),
        'com_pedido', count(*) filter (where pedidos > 0)
      ) from base),
    'espaco', json_build_object(
        'fotos_bytes', (select coalesce(sum(bytes),0) from fotos),
        'fotos_n', (select coalesce(sum(n),0) from fotos),
        'banco_bytes', pg_database_size(current_database()),
        'produtos', (select count(*) from public.produtos),
        'maiores', (select coalesce(json_agg(json_build_object('email', u.email, 'n', f.n, 'bytes', f.bytes) order by f.bytes desc), '[]'::json)
                    from (select * from fotos order by bytes desc limit 5) f left join auth.users u on u.id::text = f.dono)),
    'buscas', (select json_build_object('mes', coalesce(sum(n), 0), 'usuarios', count(*)) from public.busca_uso where mes = date_trunc('month', now() at time zone 'America/Sao_Paulo')::date),
    'por_dia', (select coalesce(json_agg(json_build_object('d', d::date, 'n', n) order by d), '[]'::json) from (
        select g.d, (select count(*) from base b where b.created_at::date = g.d::date) as n
        from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') as g(d)) s),
    'usuarios', (select coalesce(json_agg(json_build_object(
        'email', email, 'nome', nome, 'situacao', situacao, 'plano', plano, 'trial_ate', trial_ate,
        'valor', valor_mensal, 'criado', created_at, 'ultimo_acesso', last_sign_in_at, 'provedor', provedor,
        'pedidos', pedidos, 'lojas', lojas, 'produtos', produtos, 'ultimo_pedido', ultimo_pedido, 'buscas', buscas, 'limite_buscas', limite_buscas) order by created_at desc), '[]'::json) from base),
    'erros', (select coalesce(json_agg(json_build_object('quando', criado_em, 'mensagem', mensagem, 'onde', onde, 'tela', tela, 'versao', versao)
        order by criado_em desc), '[]'::json) from (select * from public.erros order by criado_em desc limit 30) e)
  ) into r;
  return r;
end $function$;
