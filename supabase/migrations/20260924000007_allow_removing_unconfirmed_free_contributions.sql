grant delete on public.contribuicoes_livres to authenticated;

create policy "convidado pode remover contribuicao livre"
on public.contribuicoes_livres for delete
to authenticated
using (
  public.usuario_e_convidado(convidado_id)
  and coalesce(confirmado, false) = false
);