-- Comissão combinada com o cliente, por marca: {"<marca>": 0.035}. Vazio = comissão da marca.
alter table public.lojas add column if not exists taxas jsonb;
alter table public.lojas drop constraint if exists lojas_taxas_objeto;
alter table public.lojas add constraint lojas_taxas_objeto check (taxas is null or jsonb_typeof(taxas) = 'object');
