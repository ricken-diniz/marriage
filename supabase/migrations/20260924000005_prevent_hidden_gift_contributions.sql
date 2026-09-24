drop policy if exists "convidado pode declarar interesse" on public.contribuicoes;

create policy "convidado pode declarar interesse"
on public.contribuicoes for insert
to authenticated
with check (
  public.usuario_e_convidado(convidado_id)
  and exists (
    select 1
    from public.presentes
    where presentes.id = contribuicoes.presente_id
      and presentes.visivel = true
  )
);

drop policy if exists "convidado pode remover interesse" on public.contribuicoes;

create policy "convidado pode remover interesse"
on public.contribuicoes for delete
to authenticated
using (
  public.usuario_e_convidado(convidado_id)
  and coalesce(confirmado, false) = false
);

drop policy if exists "usuarios autenticados podem ler presentes" on public.presentes;

create policy "usuarios autenticados podem ler presentes"
on public.presentes for select
to authenticated
using (
  public.usuario_e_admin()
  or visivel = true
  or exists (
    select 1
    from public.contribuicoes
    where contribuicoes.presente_id = presentes.id
      and public.usuario_e_convidado(contribuicoes.convidado_id)
  )
);