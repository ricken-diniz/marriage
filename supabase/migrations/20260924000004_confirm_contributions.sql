alter table public.contribuicoes_livres
  add column if not exists confirmado boolean default false;

alter table public.contribuicoes
  add column if not exists confirmado boolean default false;

alter table public.presentes
  add column if not exists visivel boolean default true;