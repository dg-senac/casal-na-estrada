-- Publicação agendada deve ser protegida pela API, não só pelo build.
-- Somente posts têm agendamento documentado. Datas de encontros e troféus
-- descrevem eventos, não permissões de leitura: não alterá-las aqui.
alter policy leitura_publica on public.posts
  using (publicado = true and data <= (now() at time zone 'America/Recife')::date);
-- admin_le continua independente e permite revisar rascunhos/agendamentos.
notify pgrst, 'reload schema';
