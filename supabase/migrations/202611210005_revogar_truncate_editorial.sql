-- Autorizado pelo usuário e aplicado via conector: revogar_truncate_editorial.
-- Ajuste mínimo: sem alteração de dados, políticas RLS ou grants CRUD.
REVOKE TRUNCATE ON TABLE
  public.posts,
  public.albuns,
  public.trofeus,
  public.encontros,
  public.album_fotos,
  public.album_videos,
  public.trofeu_fotos
FROM anon, authenticated;
