-- LGPD: o próprio usuário pode excluir a conta. Apagar o usuário em auth.users
-- apaga em cascata perfil, marcas, lojas, pedidos e despesas.
create or replace function public.excluir_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'sem sessão';
  end if;
  -- pedidos primeiro: eles apontam para lojas e marcas
  delete from public.pedidos where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.excluir_conta() from public, anon;
grant execute on function public.excluir_conta() to authenticated;

-- Permissões que o app não usa (TRUNCATE ignora o RLS; REFERENCES e TRIGGER não são necessários)
revoke truncate, references, trigger on public.profiles, public.marcas, public.lojas, public.pedidos, public.despesas from anon, authenticated;
