-- Catálogo de produtos por marca, itens no pedido e fotos dos produtos
create table if not exists public.produtos(
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 40),
  marca text not null,
  ref text not null default '' check (char_length(ref) <= 60),
  nome text not null check (char_length(nome) between 1 and 160),
  preco numeric not null default 0 check (preco >= 0 and preco < 10000000),
  foto text not null default '' check (char_length(foto) <= 600),
  primary key (user_id, id),
  foreign key (user_id, marca) references public.marcas(user_id, id) on delete cascade
);
alter table public.produtos enable row level security;
create policy "ver os seus" on public.produtos for select to authenticated using (user_id = (select auth.uid()));
create policy "criar com conta ativa" on public.produtos for insert to authenticated with check (user_id = (select auth.uid()) and (select public.conta_ativa()));
create policy "alterar com conta ativa" on public.produtos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (select public.conta_ativa()));
create policy "apagar com conta ativa" on public.produtos for delete to authenticated using (user_id = (select auth.uid()) and (select public.conta_ativa()));
revoke all on public.produtos from anon;
grant select, insert, update, delete on public.produtos to authenticated;

-- Itens do pedido (opcional): cópia de cada produto no dia do pedido
alter table public.pedidos add column if not exists itens jsonb
  check (itens is null or (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) <= 500 and pg_column_size(itens) < 200000));

-- Fotos: cada pessoa só grava na própria pasta; leitura pública pelo link (para mandar ao cliente)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
create policy "fotos: ver as suas" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: enviar na sua pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.conta_ativa()));
create policy "fotos: apagar as suas" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
