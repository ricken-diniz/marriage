create extension if not exists pgcrypto;

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  codigo_criptografado text,
  login_email text not null unique,
  auth_user_id uuid not null unique references auth.users(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists access_codes_active_code_hash_idx
  on public.access_codes (code_hash)
  where active = true;

alter table public.access_codes enable row level security;

grant select, insert, update, delete on public.access_codes to service_role;
