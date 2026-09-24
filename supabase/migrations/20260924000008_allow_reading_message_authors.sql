create policy "usuarios autenticados podem ler autores das mensagens"
on public.convidados for select
to authenticated
using (true);
