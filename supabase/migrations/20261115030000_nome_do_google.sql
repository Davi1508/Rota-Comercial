-- Quem entra com o Google não preenche "nome": usa o primeiro nome da conta Google.
create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, left(coalesce(
    nullif(new.raw_user_meta_data->>'nome', ''),
    split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), ' ', 1),
    ''), 40));
  return new;
end;
$$;
