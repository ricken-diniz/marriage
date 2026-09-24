create policy "convidado pode excluir suas mensagens"
on public.mensagens for delete
to authenticated
using (public.usuario_e_convidado(convidado_id));

create policy "admin pode excluir mensagens"
on public.mensagens for delete
to authenticated
using (public.usuario_e_admin());