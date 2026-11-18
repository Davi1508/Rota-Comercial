-- Sync sem sobrescrever edição mais nova: cada registro guarda quando foi editado (ms desde 1970, relógio do aparelho).
-- Um UPDATE com editado_em menor que o já gravado é ignorado em silêncio. Aparelhos antigos, que não mandam
-- editado_em, continuam funcionando como antes (o valor gravado não muda, então a comparação empata e passa).

alter table public.marcas   add column if not exists editado_em bigint not null default 0;
alter table public.lojas    add column if not exists editado_em bigint not null default 0;
alter table public.pedidos  add column if not exists editado_em bigint not null default 0;
alter table public.despesas add column if not exists editado_em bigint not null default 0;
alter table public.produtos add column if not exists editado_em bigint not null default 0;

create or replace function public.ignorar_edicao_antiga() returns trigger
language plpgsql as $$
begin
  if new.editado_em < old.editado_em then
    return null; -- pula esta linha, sem erro
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['marcas','lojas','pedidos','despesas','produtos'] loop
    execute format('drop trigger if exists ignorar_edicao_antiga on public.%I', t);
    execute format('create trigger ignorar_edicao_antiga before update on public.%I for each row execute function public.ignorar_edicao_antiga()', t);
  end loop;
end $$;
