-- Aditiva: não altera o bucket público midia nem move objetos existentes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midia-rascunhos', 'midia-rascunhos', false, 10485760, array['image/jpeg','image/webp'])
on conflict (id) do nothing;
do $$ begin
  if exists (select 1 from storage.buckets where id='midia-rascunhos' and public) then
    raise exception 'Bucket de rascunhos não pode ser público';
  end if;
end $$;

create or replace function public.foto_esta_publicada(caminho text)
returns boolean language sql stable security definer set search_path = ''
as $func$
  select caminho ~ '^v1/[a-f0-9-]{36}\.(webp|jpg)$' and exists (
    select 1 from (
      select capa_url as url, publicado, data from public.posts
      union all select capa_mini, publicado, data from public.posts
      union all select capa_url, publicado, data from public.albuns
      union all select capa_mini, publicado, data from public.albuns
      union all select foto_url, publicado, data from public.trofeus
      union all select foto_mini, publicado, data from public.trofeus
      union all select f.url, a.publicado, a.data from public.album_fotos f join public.albuns a on a.id=f.album_id
      union all select f.url, t.publicado, t.data from public.trofeu_fotos f join public.trofeus t on t.id=f.trofeu_id
    ) referencias
    where publicado and (data is null or data <= (now() at time zone 'America/Recife')::date)
    and url = 'https://pjglrlullnchqazxpvyn.supabase.co/functions/v1/foto-publicada/' || caminho
  );
$func$;
revoke all on function public.foto_esta_publicada(text) from public;
grant execute on function public.foto_esta_publicada(text) to anon, authenticated;

create policy rascunhos_le_admin on storage.objects for select to authenticated
  using (bucket_id='midia-rascunhos' and (select public.e_administrador()));
create policy rascunhos_le_publicada on storage.objects for select to anon, authenticated
  using (bucket_id='midia-rascunhos' and public.foto_esta_publicada(name));
create policy rascunhos_envia on storage.objects for insert to authenticated
  with check (bucket_id='midia-rascunhos' and name ~ '^v1/[a-f0-9-]{36}\.(webp|jpg)$' and (select public.e_administrador()));
-- Sem UPDATE: objetos imutáveis, novos UUIDs para trocas. DELETE só pelo administrador.
create policy rascunhos_apaga on storage.objects for delete to authenticated
  using (bucket_id='midia-rascunhos' and (select public.e_administrador()));
notify pgrst, 'reload schema';
