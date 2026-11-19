-- CNPJ opcional da loja (só os 14 dígitos), usado na planilha de pedidos para o ERP
alter table public.lojas add column if not exists cnpj text;
alter table public.lojas drop constraint if exists lojas_cnpj_formato;
alter table public.lojas add constraint lojas_cnpj_formato check (cnpj is null or cnpj ~ '^[0-9]{14}$');
