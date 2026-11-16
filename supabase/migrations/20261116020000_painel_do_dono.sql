-- Painel do dono: só quem está na tabela donos consegue ler os números e mudar planos.
create table if not exists public.donos (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.donos enable row level security;           -- sem políticas: ninguém lê pela API
revoke all on public.donos from anon, authenticated;
insert into public.donos (user_id) select id from auth.users where email = 'davi1508gomes@gmail.com' on conflict do nothing;

-- valor que cada pagante paga (fundador R$ 19,90, normal R$ 29,90); usuários não conseguem alterar
alter table public.profiles add column if not exists valor_mensal numeric(8,2);

create or replace function public.eh_dono() returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.donos d where d.user_id = (select auth.uid())) $$;

create or replace function public.painel_dono() returns json language plpgsql stable security definer set search_path = ''
as $$
declare r json;
begin
  if not public.eh_dono() then raise exception 'acesso negado' using errcode = '42501'; end if;
  with base as (
    select u.id, u.email, u.created_at, u.last_sign_in_at, coalesce(u.raw_app_meta_data->>'provider','email') as provedor,
           p.nome, p.plano, p.trial_ate, p.valor_mensal,
           case when p.plano = 'ativo' then 'pagante' when p.trial_ate > now() then 'teste' else 'vencido' end as situacao,
           (select count(*) from public.pedidos x where x.user_id = u.id) as pedidos,
           (select count(*) from public.lojas x where x.user_id = u.id) as lojas,
           (select max(x.data) from public.pedidos x where x.user_id = u.id) as ultimo_pedido
    from auth.users u join public.profiles p on p.id = u.id
    where not exists (select 1 from public.donos d where d.user_id = u.id)
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
    'por_dia', (select coalesce(json_agg(json_build_object('d', d::date, 'n', n) order by d), '[]'::json) from (
        select g.d, (select count(*) from base b where b.created_at::date = g.d::date) as n
        from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') as g(d)) s),
    'usuarios', (select coalesce(json_agg(json_build_object(
        'email', email, 'nome', nome, 'situacao', situacao, 'plano', plano, 'trial_ate', trial_ate,
        'valor', valor_mensal, 'criado', created_at, 'ultimo_acesso', last_sign_in_at, 'provedor', provedor,
        'pedidos', pedidos, 'lojas', lojas, 'ultimo_pedido', ultimo_pedido) order by created_at desc), '[]'::json) from base),
    'erros', (select coalesce(json_agg(json_build_object('quando', criado_em, 'mensagem', mensagem, 'onde', onde, 'tela', tela, 'versao', versao)
        order by criado_em desc), '[]'::json) from (select * from public.erros order by criado_em desc limit 30) e)
  ) into r;
  return r;
end $$;

create or replace function public.dono_alterar(p_email text, p_acao text, p_valor numeric default null)
returns text language plpgsql security definer set search_path = ''
as $$
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
  else raise exception 'ação inválida';
  end if;
  return 'ok';
end $$;

revoke all on function public.eh_dono() from public, anon;
revoke all on function public.painel_dono() from public, anon;
revoke all on function public.dono_alterar(text, text, numeric) from public, anon;
grant execute on function public.eh_dono() to authenticated;
grant execute on function public.painel_dono() to authenticated;
grant execute on function public.dono_alterar(text, text, numeric) to authenticated;
