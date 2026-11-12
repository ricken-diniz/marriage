insert into storage.buckets (id, name, public)
values ('presentes', 'presentes', true)
on conflict (id) do update set public = excluded.public;

create policy "administradores podem enviar imagens de presentes"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'presentes'
  and public.usuario_e_admin()
);

create policy "administradores podem atualizar imagens de presentes"
on storage.objects for update
to authenticated
using (
  bucket_id = 'presentes'
  and public.usuario_e_admin()
)
with check (
  bucket_id = 'presentes'
  and public.usuario_e_admin()
);

create policy "administradores podem excluir imagens de presentes"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'presentes'
  and public.usuario_e_admin()
);
