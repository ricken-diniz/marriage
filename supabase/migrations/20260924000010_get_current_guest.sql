create or replace function public.obter_convidado_atual()
returns table (
  id uuid,
  nome text,
  confirmacao_presenca boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select convidados.id, convidados.nome, convidados.confirmacao_presenca
  from public.convidados
  join public.access_codes on access_codes.convidado_id = convidados.id
  where access_codes.auth_user_id = auth.uid()
    and access_codes.active = true
  limit 1;
$$;

revoke all on function public.obter_convidado_atual() from public;
grant execute on function public.obter_convidado_atual() to authenticated;