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

revoke all on function public.usuario_e_convidado(uuid) from public;
grant execute on function public.usuario_e_convidado(uuid) to authenticated;