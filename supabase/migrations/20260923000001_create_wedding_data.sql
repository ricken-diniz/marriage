create table public.convidados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  confirmacao_presenca boolean,
  created_at timestamptz not null default now()
);

alter table public.access_codes
  add column convidado_id uuid references public.convidados(id);

create unique index access_codes_convidado_id_idx
  on public.access_codes (convidado_id)
  where convidado_id is not null;

create table public.companhias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  convidado_id uuid not null references public.convidados(id) on delete cascade,
  confirmacao_presenca boolean,
  created_at timestamptz not null default now()
);

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  convidado_id uuid not null references public.convidados(id) on delete cascade,
  mensagem text not null,
  created_at timestamptz not null default now()
);

create table public.presentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(12, 2) not null check (valor >= 0),
  imagem_url text,
  created_at timestamptz not null default now()
);

create table public.contribuicoes (
  id uuid primary key default gen_random_uuid(),
  presente_id uuid not null references public.presentes(id) on delete cascade,
  convidado_id uuid not null references public.convidados(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (presente_id, convidado_id)
);

create index companhias_convidado_id_idx
  on public.companhias (convidado_id);

create index mensagens_convidado_id_idx
  on public.mensagens (convidado_id);

create index contribuicoes_convidado_id_idx
  on public.contribuicoes (convidado_id);

alter table public.convidados enable row level security;
alter table public.companhias enable row level security;
alter table public.mensagens enable row level security;
alter table public.presentes enable row level security;
alter table public.contribuicoes enable row level security;

grant select, insert, update, delete on public.access_codes to authenticated;
grant select, insert, update, delete on public.convidados to authenticated;
grant select, insert, update, delete on public.companhias to authenticated;
grant select, insert, update, delete on public.mensagens to authenticated;
grant select, insert, update, delete on public.presentes to authenticated;
grant select, insert, update, delete on public.contribuicoes to authenticated;
grant select, insert, update, delete on public.convidados to service_role;
grant select, insert, update, delete on public.companhias to service_role;
grant select, insert, update, delete on public.mensagens to service_role;
grant select, insert, update, delete on public.presentes to service_role;
grant select, insert, update, delete on public.contribuicoes to service_role;

create or replace function public.usuario_e_convidado(convidado uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.access_codes
    where access_codes.convidado_id = convidado
      and access_codes.auth_user_id = auth.uid()
      and access_codes.active = true
  );
$$;

create or replace function public.usuario_e_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.usuario_e_convidado(uuid) from public;
grant execute on function public.usuario_e_convidado(uuid) to authenticated;
revoke all on function public.usuario_e_admin() from public;
grant execute on function public.usuario_e_admin() to authenticated;

create policy "usuarios podem ler seu convidado"
on public.convidados for select
to authenticated
using (public.usuario_e_admin() or public.usuario_e_convidado(id));

create policy "admin pode cadastrar convidados"
on public.convidados for insert
to authenticated
with check (public.usuario_e_admin());

create policy "admin pode alterar convidados"
on public.convidados for update
to authenticated
using (public.usuario_e_admin())
with check (public.usuario_e_admin());

create policy "convidado pode confirmar presenca"
on public.convidados for update
to authenticated
using (public.usuario_e_convidado(id))
with check (public.usuario_e_convidado(id));

create policy "admin pode excluir convidados"
on public.convidados for delete
to authenticated
using (public.usuario_e_admin());

create policy "usuarios podem ler suas companhias"
on public.companhias for select
to authenticated
using (public.usuario_e_admin() or public.usuario_e_convidado(convidado_id));

create policy "admin pode cadastrar companhias"
on public.companhias for insert
to authenticated
with check (public.usuario_e_admin());

create policy "admin pode alterar companhias"
on public.companhias for update
to authenticated
using (public.usuario_e_admin())
with check (public.usuario_e_admin());

create policy "convidado pode confirmar companhia"
on public.companhias for update
to authenticated
using (public.usuario_e_convidado(convidado_id))
with check (public.usuario_e_convidado(convidado_id));

create policy "admin pode excluir companhias"
on public.companhias for delete
to authenticated
using (public.usuario_e_admin());

create policy "usuarios autenticados podem ler mensagens"
on public.mensagens for select
to authenticated
using (true);

create policy "convidado pode criar mensagens"
on public.mensagens for insert
to authenticated
with check (public.usuario_e_convidado(convidado_id));

create policy "usuarios autenticados podem ler presentes"
on public.presentes for select
to authenticated
using (true);

create policy "admin pode cadastrar presentes"
on public.presentes for insert
to authenticated
with check (public.usuario_e_admin());

create policy "admin pode alterar presentes"
on public.presentes for update
to authenticated
using (public.usuario_e_admin())
with check (public.usuario_e_admin());

create policy "admin pode excluir presentes"
on public.presentes for delete
to authenticated
using (public.usuario_e_admin());

create policy "usuarios podem ler suas contribuicoes"
on public.contribuicoes for select
to authenticated
using (public.usuario_e_admin() or public.usuario_e_convidado(convidado_id));

create policy "convidado pode declarar interesse"
on public.contribuicoes for insert
to authenticated
with check (public.usuario_e_convidado(convidado_id));

create policy "convidado pode remover interesse"
on public.contribuicoes for delete
to authenticated
using (public.usuario_e_convidado(convidado_id));

create policy "admin pode gerenciar contribuicoes"
on public.contribuicoes for update
to authenticated
using (public.usuario_e_admin())
with check (public.usuario_e_admin());

create policy "admin pode gerenciar codigos"
on public.access_codes for all
to authenticated
using (public.usuario_e_admin())
with check (public.usuario_e_admin());
