-- E-mails automáticos (fim do teste, teste acabou, conta parada), enviados uma vez por dia pela função emails-diarios.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- quem pediu para não receber e o código do link "não quero mais receber"
create table if not exists public.email_preferencias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  optout boolean not null default false,
  token uuid not null unique default gen_random_uuid(),
  optout_em timestamptz
);
alter table public.email_preferencias enable row level security;

-- cada e-mail sai uma vez só por pessoa
create table if not exists public.emails_enviados (
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('teste_acabando','teste_acabou','sem_uso')),
  enviado_em timestamptz not null default now(),
  primary key (user_id, tipo)
);
alter table public.emails_enviados enable row level security;

-- quem deve receber hoje (no máximo um e-mail por pessoa por dia)
create or replace function public.emails_pendentes()
returns table (user_id uuid, email text, nome text, tipo text, trial_ate timestamptz, token uuid)
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.email_preferencias (user_id) select u.id from auth.users u on conflict do nothing;
  return query
  with base as (
    select u.id, u.email::text as email, coalesce(nullif(p.nome,''), split_part(u.email,'@',1)) as nome, p.trial_ate, p.criado_em, ep.token,
           exists (select 1 from public.pedidos x where x.user_id = u.id) as tem_pedido
    from auth.users u
    join public.profiles p on p.id = u.id
    join public.email_preferencias ep on ep.user_id = u.id
    where p.plano = 'trial' and not ep.optout
      and u.email is not null and (u.email_confirmed_at is not null or u.raw_app_meta_data->>'provider' = 'google')
      and not exists (select 1 from public.donos d where d.user_id = u.id)
      and not exists (select 1 from public.emails_enviados e where e.user_id = u.id and e.enviado_em > now() - interval '20 hours')
  ), cand as (
    select b.*, 'teste_acabando'::text as t, 1 as prio from base b where b.trial_ate > now() and b.trial_ate <= now() + interval '2 days'
    union all
    select b.*, 'teste_acabou', 2 from base b where b.trial_ate <= now() and b.trial_ate > now() - interval '3 days'
    union all
    select b.*, 'sem_uso', 3 from base b where not b.tem_pedido and b.criado_em < now() - interval '3 days' and b.trial_ate > now() + interval '2 days'
  )
  select distinct on (c.id) c.id, c.email, c.nome, c.t, c.trial_ate, c.token
  from cand c
  where not exists (select 1 from public.emails_enviados e where e.user_id = c.id and e.tipo = c.t)
  order by c.id, c.prio;
end $$;

create or replace function public.emails_marcar(p_user uuid, p_tipo text)
returns void language sql security definer set search_path = '' as $$
  insert into public.emails_enviados (user_id, tipo) values (p_user, p_tipo) on conflict do nothing;
$$;

create or replace function public.emails_descadastrar(p_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.email_preferencias set optout = true, optout_em = coalesce(optout_em, now()) where token = p_token;
  return found;
end $$;

-- código secreto que só o agendador e a função conhecem (fica no cofre do banco)
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'cron_emails') then
    perform vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text, 'cron_emails');
  end if;
end $$;
create or replace function public.cron_emails_ok(p text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select decrypted_secret = p from vault.decrypted_secrets where name = 'cron_emails'), false);
$$;

revoke all on function public.emails_pendentes(), public.emails_marcar(uuid,text), public.emails_descadastrar(uuid), public.cron_emails_ok(text) from public, anon, authenticated;
grant execute on function public.emails_pendentes(), public.emails_marcar(uuid,text), public.emails_descadastrar(uuid), public.cron_emails_ok(text) to service_role;

-- todo dia às 9h17 (Bahia) = 12h17 UTC
select cron.unschedule('emails-diarios') where exists (select 1 from cron.job where jobname = 'emails-diarios');
select cron.schedule('emails-diarios', '17 12 * * *', $cron$
  select net.http_post(
    url := 'https://ulafdnjjdiscowijqwdg.supabase.co/functions/v1/emails-diarios',
    headers := jsonb_build_object('content-type','application/json','x-cron',(select decrypted_secret from vault.decrypted_secrets where name = 'cron_emails')),
    body := '{}'::jsonb, timeout_milliseconds := 60000)
$cron$);
