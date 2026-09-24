drop policy if exists "convidado pode remover interesse" on public.contribuicoes;

create policy "convidado pode remover interesse"
on public.contribuicoes for delete
to authenticated
using (
  public.usuario_e_convidado(convidado_id)
  and coalesce(confirmado, false) = false
);