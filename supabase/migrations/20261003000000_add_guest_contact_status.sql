alter table public.convidados
  add column telefone text,
  add column recebeu_pre_convite boolean not null default false,
  add column recebeu_convite boolean not null default false;