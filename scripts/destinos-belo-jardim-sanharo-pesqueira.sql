-- Já executado no Supabase nesta entrega. Reaplicação idempotente.
-- Requer a migração 202611200001_destinos_mapa.sql.
update public.posts
set destinos_mapa = '[{"nome":"Belo Jardim","uf":"PE"},{"nome":"Sanharó","uf":"PE"},{"nome":"Pesqueira","uf":"PE"}]'::jsonb
where id = '26f336cd-a8b1-49e8-a75b-c19642375244'
  and slug = 'belo-jardim-sanharo-e-pesqueira-tres-paradas-boas-lembracas';
