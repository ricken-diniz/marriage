alter table public.presentes
  add column if not exists descricao text;

alter table public.contribuicoes
  add column if not exists quantidade_cotas integer default 1;

update public.contribuicoes
set quantidade_cotas = 1
where quantidade_cotas is null or quantidade_cotas < 1;

alter table public.contribuicoes
  alter column quantidade_cotas set default 1,
  alter column quantidade_cotas set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contribuicoes_quantidade_cotas_check'
      and conrelid = 'public.contribuicoes'::regclass
  ) then
    alter table public.contribuicoes
      add constraint contribuicoes_quantidade_cotas_check check (quantidade_cotas > 0);
  end if;
end $$;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.contribuicoes'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (presente_id, convidado_id)'
  loop
    execute format('alter table public.contribuicoes drop constraint %I', constraint_record.conname);
  end loop;
end $$;

insert into public.contribuicoes (presente_id, convidado_id, created_at)
select contribuicao.presente_id, contribuicao.convidado_id, contribuicao.created_at
from public.contribuicoes as contribuicao
cross join lateral generate_series(1, contribuicao.quantidade_cotas - 1);

drop policy if exists "convidado pode alterar suas contribuicoes" on public.contribuicoes;

alter table public.contribuicoes
  drop constraint if exists contribuicoes_quantidade_cotas_check,
  drop column if exists quantidade_cotas;