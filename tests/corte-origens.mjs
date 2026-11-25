import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
const db=new PGlite();
try{
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text primary key,public boolean);INSERT INTO storage.buckets VALUES('midia',true),('midia-rascunhos',false);CREATE TABLE storage.objects(bucket_id text,name text);CREATE FUNCTION public.e_administrador() RETURNS boolean LANGUAGE sql AS $$SELECT false$$;CREATE FUNCTION public.foto_esta_publicada(text) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;CREATE FUNCTION public.disparar_publicacao() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW;END$$;`);
const tabelas=['posts','albuns','trofeus','encontros','album_fotos','album_videos','trofeu_fotos'];
for(const t of tabelas)await db.exec(`CREATE TABLE public.${t}(id int,publicado boolean,data date,album_id int,trofeu_id int);ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;CREATE POLICY leitura_publica ON public.${t} FOR SELECT USING(publicado);CREATE TRIGGER publicacao_automatica AFTER INSERT ON public.${t} FOR EACH ROW EXECUTE FUNCTION public.disparar_publicacao();`);
await db.exec(`CREATE POLICY midia_le ON storage.objects FOR SELECT USING(bucket_id='midia');CREATE POLICY rascunhos_le_publicada ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='midia-rascunhos' AND public.foto_esta_publicada(name));`);
await db.exec('BEGIN;'+readFileSync('experiments/corte-producao/fechar-origens.sql','utf8')+'COMMIT;');
assert.equal((await db.query("SELECT count(*)::int n FROM pg_policies WHERE policyname='leitura_publica'")).rows[0].n,0);
assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='midia'")).rows[0].public,false);
assert.equal((await db.query("SELECT count(*)::int n FROM pg_trigger WHERE tgname='publicacao_automatica' AND tgenabled='D'")).rows[0].n,7);
await db.exec('BEGIN;'+readFileSync('experiments/corte-producao/reabrir-origens.sql','utf8')+'COMMIT;');
assert.equal((await db.query("SELECT count(*)::int n FROM pg_policies WHERE policyname='leitura_publica'")).rows[0].n,7);
assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='midia'")).rows[0].public,true);
console.log('Corte SQL e reversão em PGlite: sintaxe/transação, 7políticas, gatilhos e bucket restauráveis. Esquema sintético; não prova fluxo hospedado.');
}finally{await db.close();}
