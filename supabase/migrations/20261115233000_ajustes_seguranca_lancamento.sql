-- conta_ativa() só precisa ser executada por quem está logado (usada nas políticas de gravação)
revoke execute on function public.conta_ativa() from anon, public;
grant execute on function public.conta_ativa() to authenticated;
create index if not exists erros_user_id on public.erros (user_id);
