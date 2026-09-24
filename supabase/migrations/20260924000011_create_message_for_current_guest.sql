create or replace function public.criar_mensagem(p_mensagem text)
returns table (
  id uuid,
  mensagem text,
  created_at timestamptz,
  convidado_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  convidadoAtual uuid;
begin
  select access_codes.convidado_id
    into convidadoAtual
    from public.access_codes
   where access_codes.auth_user_id = auth.uid()
     and access_codes.active = true
   limit 1;

  if convidadoAtual is null then
    raise exception 'Convidado autenticado não encontrado.' using errcode = '42501';
  end if;

  return query
    insert into public.mensagens (convidado_id, mensagem)
    values (convidadoAtual, trim(p_mensagem))
    returning mensagens.id, mensagens.mensagem, mensagens.created_at, mensagens.convidado_id;
end;
$$;

revoke all on function public.criar_mensagem(text) from public;
grant execute on function public.criar_mensagem(text) to authenticated;