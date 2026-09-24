alter table public.presentes
  add column if not exists valor_cota numeric(12, 2);

update public.presentes
set valor_cota = valor
where valor_cota is null;

alter table public.presentes
  alter column valor_cota set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'presentes_valor_cota_check'
      and conrelid = 'public.presentes'::regclass
  ) then
    alter table public.presentes
      add constraint presentes_valor_cota_check check (valor_cota >= 0);
  end if;
end $$;

create table if not exists public.contribuicoes_livres (
  id uuid primary key default gen_random_uuid(),
  convidado_id uuid not null references public.convidados(id) on delete cascade,
  valor_cota numeric(12, 2) not null check (valor_cota > 0),
  created_at timestamptz not null default now()
);

create index if not exists contribuicoes_livres_convidado_id_idx
  on public.contribuicoes_livres (convidado_id);

alter table public.contribuicoes_livres enable row level security;

grant select, insert on public.contribuicoes_livres to authenticated;
grant select, insert, update, delete on public.contribuicoes_livres to service_role;

create policy "convidado pode ler suas contribuicoes livres"
on public.contribuicoes_livres for select
to authenticated
using (public.usuario_e_admin() or public.usuario_e_convidado(convidado_id));

create policy "convidado pode criar contribuicao livre"
on public.contribuicoes_livres for insert
to authenticated
with check (public.usuario_e_convidado(convidado_id));

create policy "admin pode gerenciar contribuicoes livres"
on public.contribuicoes_livres for all
to authenticated
using (public.usuario_e_admin())
with check (public.usuario_e_admin());