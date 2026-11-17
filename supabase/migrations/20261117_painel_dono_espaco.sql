-- Painel do dono: espaço usado pelas fotos do catálogo e pelo banco (limites do plano grátis: 1 GB e 500 MB)
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
           (select max(x.data) from public.pedidos x where x.user_id = u.id) as ultimo_pedido
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
    'por_dia', (select coalesce(json_agg(json_build_object('d', d::date, 'n', n) order by d), '[]'::json) from (
        select g.d, (select count(*) from base b where b.created_at::date = g.d::date) as n
        from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') as g(d)) s),
    'usuarios', (select coalesce(json_agg(json_build_object(
        'email', email, 'nome', nome, 'situacao', situacao, 'plano', plano, 'trial_ate', trial_ate,
        'valor', valor_mensal, 'criado', created_at, 'ultimo_acesso', last_sign_in_at, 'provedor', provedor,
        'pedidos', pedidos, 'lojas', lojas, 'produtos', produtos, 'ultimo_pedido', ultimo_pedido) order by created_at desc), '[]'::json) from base),
    'erros', (select coalesce(json_agg(json_build_object('quando', criado_em, 'mensagem', mensagem, 'onde', onde, 'tela', tela, 'versao', versao)
        order by criado_em desc), '[]'::json) from (select * from public.erros order by criado_em desc limit 30) e)
  ) into r;
  return r;
end $function$;
