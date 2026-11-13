alter table public.contribuicoes_livres
  drop constraint if exists contribuicoes_livres_valor_cota_check;

alter table public.contribuicoes_livres
  add constraint contribuicoes_livres_valor_cota_min_check
  check (valor_cota >= 100);