-- Contas novas começam sem campanhas prontas (antes: estações da moda)
alter table public.profiles alter column colecoes set default '{}'::text[];
