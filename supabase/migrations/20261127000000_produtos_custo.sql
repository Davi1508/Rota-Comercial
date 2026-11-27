-- Custo do produto (opcional): quanto o representante paga; usado para mostrar o lucro só para ele
alter table public.produtos add column if not exists custo numeric;
alter table public.produtos drop constraint if exists produtos_custo_ok;
alter table public.produtos add constraint produtos_custo_ok check (custo is null or (custo >= 0 and custo <= 10000000));
