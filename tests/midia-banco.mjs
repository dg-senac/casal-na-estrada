import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
set timezone='America/Recife';
create role anon; create role authenticated;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
insert into storage.buckets values ('midia','midia',true,10485760,array['image/jpeg']);
create table storage.objects(bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;
grant select on storage.objects to anon,authenticated; grant insert,delete on storage.objects to authenticated;
create function public.e_administrador() returns boolean language sql stable as $$ select current_setting('test.admin',true)='aal2' $$;
revoke all on function public.e_administrador() from public; grant execute on function public.e_administrador() to authenticated;
create table posts(capa_url text,capa_mini text,publicado boolean,data date);
create table albuns(id int,capa_url text,capa_mini text,publicado boolean,data date);
create table trofeus(id int,foto_url text,foto_mini text,publicado boolean,data date);
create table album_fotos(album_id int,url text);
create table trofeu_fotos(trofeu_id int,url text);
`);
await db.exec(readFileSync('supabase/migrations/202611090003_midia_rascunhos.sql','utf8'));
assert.equal((await db.query("select public from storage.buckets where id='midia'")).rows[0].public,true);
assert.equal((await db.query("select public from storage.buckets where id='midia-rascunhos'")).rows[0].public,false);
const caminho='v1/12345678-1234-1234-1234-123456789abc.webp';
const url='https://pjglrlullnchqazxpvyn.supabase.co/functions/v1/foto-publicada/'+caminho;
await db.query('insert into storage.objects values ($1,$2)',['midia-rascunhos',caminho]);
const ver=async()=> (await db.query('select * from storage.objects')).rows.length;
await db.exec('set role anon');assert.equal(await ver(),0);
await assert.rejects(db.query("insert into storage.objects values ('midia-rascunhos','x')"));
await db.exec('reset role');await db.query('insert into posts values ($1,null,false,current_date)',[url]);
await db.exec('set role anon');assert.equal(await ver(),0);
await db.exec('reset role');await db.exec('update posts set publicado=true');
await db.exec('set role anon');assert.equal(await ver(),1);
await db.exec('reset role');await db.exec("update posts set data=current_date+2");
await db.exec('set role anon');assert.equal(await ver(),0);
await db.exec('reset role');await db.exec('delete from posts');
// Capas, minis e fotos filhas: nenhuma autorização baseada só no caminho.
for(const [tabela,coluna] of [['posts','capa_mini'],['albuns','capa_url'],['albuns','capa_mini'],['trofeus','foto_url'],['trofeus','foto_mini']]) {
 await db.query(`insert into ${tabela} (${coluna},publicado,data) values ($1,true,current_date-1)`,[url]);
 await db.exec('set role anon');assert.equal(await ver(),1);await db.exec('reset role');await db.exec(`delete from ${tabela}`);
}
for(const [pai,filho,fk] of [['albuns','album_fotos','album_id'],['trofeus','trofeu_fotos','trofeu_id']]) {
 await db.query(`insert into ${pai} (id,publicado,data) values (1,false,current_date-1)`);
 await db.query(`insert into ${filho} (${fk},url) values (1,$1)`,[url]);
 await db.exec('set role anon');assert.equal(await ver(),0);await db.exec('reset role');
 await db.exec(`update ${pai} set publicado=true`);await db.exec('set role anon');assert.equal(await ver(),1);await db.exec('reset role');
 await db.exec(`delete from ${pai}`);await db.exec('set role anon');assert.equal(await ver(),0);await db.exec('reset role');await db.exec(`delete from ${filho}`);
}
await db.exec("select set_config('test.admin','aal1',false);set role authenticated");assert.equal(await ver(),0);
await db.exec("reset role;select set_config('test.admin','aal2',false);set role authenticated");assert.equal(await ver(),1);
await db.query('insert into storage.objects values ($1,$2)',['midia-rascunhos','v1/12345678-1234-1234-1234-123456789abc.jpg']);
await assert.rejects(db.query("insert into storage.objects values ('midia-rascunhos','../invalido')"));
await db.exec("reset role;select set_config('test.admin','nao-admin',false);set role authenticated");assert.equal(await ver(),0);
await assert.rejects(db.query('insert into storage.objects values ($1,$2)',['midia-rascunhos',caminho]));
await db.close();console.log('Mídia/SQL real isolado: bucket antigo preservado, rascunhos/futuro negados, publicação, pais/filhos e admin AAL2 OK.');
