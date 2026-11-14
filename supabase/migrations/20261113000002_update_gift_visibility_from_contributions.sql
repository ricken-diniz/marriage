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
    ) > presente.valor;

  return new;
end;
$$;

create or replace function public.atualizar_visibilidade_apos_remocao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.presentes as presente
  set visivel = true
  where presente.id = old.presente_id
    and (
      select count(*) * presente.valor_cota
      from public.contribuicoes
      where contribuicoes.presente_id = old.presente_id
    ) < presente.valor;

  return old;
end;
$$;

drop trigger if exists atualizar_visibilidade_apos_contribuicao on public.contribuicoes;
create trigger atualizar_visibilidade_apos_contribuicao
after insert on public.contribuicoes
for each row
execute function public.atualizar_visibilidade_apos_contribuicao();

drop trigger if exists atualizar_visibilidade_apos_remocao on public.contribuicoes;
create trigger atualizar_visibilidade_apos_remocao
after delete on public.contribuicoes
for each row
execute function public.atualizar_visibilidade_apos_remocao();

revoke all on function public.atualizar_visibilidade_apos_contribuicao() from public;
revoke all on function public.atualizar_visibilidade_apos_remocao() from public;
