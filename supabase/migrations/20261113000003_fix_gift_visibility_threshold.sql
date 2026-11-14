create or replace function public.atualizar_visibilidade_apos_contribuicao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.presentes as presente
  set visivel = false
  where presente.id = new.presente_id
    and (
      select count(*) * presente.valor_cota
      from public.contribuicoes
      where contribuicoes.presente_id = new.presente_id
    ) >= presente.valor;

  return new;
end;
$$;
