-- Unidade de venda do produto (cx, mil, kg...). Vazio = unidade.
alter table public.produtos add column if not exists un text;
alter table public.produtos drop constraint if exists produtos_un_formato;
alter table public.produtos add constraint produtos_un_formato check (un is null or un ~ '^[a-z0-9]{1,8}$');
