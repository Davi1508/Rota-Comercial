-- Painel do dono: contagem dos e-mails automáticos (enviados, na semana, por tipo, quem pediu para sair)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.painel_dono'::regproc);
  if position('''emails''' in d) = 0 then
    d := replace(d, '''erros'', (select', '''emails'', json_build_object(
        ''enviados'', (select count(*) from public.emails_enviados),
        ''semana'', (select count(*) from public.emails_enviados where enviado_em > now() - interval ''7 days''),
        ''por_tipo'', (select coalesce(json_object_agg(tipo, n), ''{}''::json) from (select tipo, count(*) n from public.emails_enviados group by tipo) t),
        ''sairam'', (select count(*) from public.email_preferencias where optout)),
    ''erros'', (select');
    execute d;
  end if;
end $$;
