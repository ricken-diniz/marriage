update public.convidados
set confirmacao_presenca = false
where confirmacao_presenca is null;

update public.companhias
set confirmacao_presenca = false
where confirmacao_presenca is null;

alter table public.convidados
  alter column confirmacao_presenca set default false,
  alter column confirmacao_presenca set not null;

alter table public.companhias
  alter column confirmacao_presenca set default false,
  alter column confirmacao_presenca set not null;