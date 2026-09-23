alter table public.access_codes
  add column if not exists codigo_criptografado text;
