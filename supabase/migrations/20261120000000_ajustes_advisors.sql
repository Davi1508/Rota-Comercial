-- Avisos do Supabase: search_path fixo no gatilho e índice da chave estrangeira de produtos
alter function public.ignorar_edicao_antiga() set search_path = '';
create index if not exists produtos_user_marca on public.produtos (user_id, marca);
