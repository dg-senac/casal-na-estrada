import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {TABELAS} from '../experiments/emergencia/pacote-editorial.mjs';
const db=new PGlite();
try{
 await db.exec(readFileSync('experiments/emergencia/esquema-colunas-observado.sql','utf8'));
 await db.exec(`
 create role anon nologin; create role authenticated nologin;
 create schema auth; create schema painel_privado;
 create table painel_privado.administradores(usuario_id uuid primary key, ativo boolean);
 create table auth.mfa_factors(user_id uuid, status text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.jwt.claim.aal',true))$$;
 create function restauracao.e_administrador() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from painel_privado.administradores a where a.usuario_id=(select auth.uid()) and a.ativo)
 and (coalesce((select auth.jwt()->>'aal')='aal2',false) or not exists(select 1 from auth.mfa_factors f where f.user_id=(select auth.uid()) and f.status='verified'))$$;
 revoke all on function restauracao.e_administrador() from public;
 grant execute on function restauracao.e_administrador() to authenticated;
 grant usage on schema restauracao to anon,authenticated;
 grant all on all tables in schema restauracao to anon,authenticated;
 insert into painel_privado.administradores values ('00000000-0000-4000-8000-000000000001',true),('00000000-0000-4000-8000-000000000002',false);
 insert into auth.mfa_factors values('00000000-0000-4000-8000-000000000001','verified');
 `);
 for(const t of TABELAS){
  await db.exec(`alter table restauracao.${t} enable row level security;
   create policy admin_le on restauracao.${t} for select to authenticated using((select restauracao.e_administrador()));
   create policy admin_escreve on restauracao.${t} for insert to authenticated with check((select restauracao.e_administrador()));
   create policy admin_edita on restauracao.${t} for update to authenticated using((select restauracao.e_administrador())) with check((select restauracao.e_administrador()));
   create policy admin_apaga on restauracao.${t} for delete to authenticated using((select restauracao.e_administrador()));`);
  let regra='publicado=true';
  if(t==='posts')regra+=" and data <= (now() at time zone 'America/Recife')::date";
  if(t==='album_fotos'||t==='album_videos')regra=`exists(select 1 from restauracao.albuns a where a.id=${t}.album_id and a.publicado)`;
  if(t==='trofeu_fotos')regra='exists(select 1 from restauracao.trofeus t where t.id=trofeu_fotos.trofeu_id and t.publicado)';
  await db.exec(`create policy leitura_publica on restauracao.${t} for select using(${regra});`);
 }
 await db.exec(`
 insert into restauracao.posts(slug,titulo,resumo,data,publicado) values ('visivel','Teste','',current_date-1,true),('futuro','Teste','',current_date+2,true),('rascunho','Teste','',current_date-1,false);
 insert into restauracao.albuns(slug,titulo,publicado) values('visivel','Teste',true),('rascunho','Teste',false);
 insert into restauracao.trofeus(slug,evento,historia,publicado) values('visivel','Teste','',true),('rascunho','Teste','',false);
 insert into restauracao.encontros(nome,inicio,cidade,uf,publicado) values('visivel',current_date,'Recife','PE',true),('rascunho',current_date,'Recife','PE',false);
 insert into restauracao.album_fotos(album_id,url) select id,'fixture' from restauracao.albuns;
 insert into restauracao.album_videos(album_id,titulo) select id,'fixture' from restauracao.albuns;
 insert into restauracao.trofeu_fotos(trofeu_id,url) select id,'fixture' from restauracao.trofeus;
 `);
 async function sessao(role,sub='',aal='aal1'){
  await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.aal',$2,false)",[sub,aal]);await db.exec('set role '+role);
 }
 for(const [role,sub,aal,total] of [
  ['anon','','aal1',1],['authenticated','00000000-0000-4000-8000-000000000099','aal2',1],
  ['authenticated','00000000-0000-4000-8000-000000000002','aal2',1],
  ['authenticated','00000000-0000-4000-8000-000000000001','aal1',1],
  ['authenticated','00000000-0000-4000-8000-000000000001','aal2',2],
 ]){
  await sessao(role,sub,aal);
  for(const t of TABELAS)assert.equal((await db.query(`select count(*)::int n from restauracao.${t}`)).rows[0].n,t==='posts'&&total===2?3:total);
  if(total===1){
   await assert.rejects(db.exec("insert into restauracao.posts(slug,titulo,resumo) values('ilegal','Teste','')"));
   assert.equal((await db.query("update restauracao.posts set titulo='ilegal' returning id")).rows.length,0);
   assert.equal((await db.query('delete from restauracao.posts returning id')).rows.length,0);
  }else{
   assert.equal((await db.query("update restauracao.posts set titulo='permitido' returning id")).rows.length,3);
  }
 }
 // Risco de grants: demonstrar SOMENTE no banco efêmero com fixtures.
 await sessao('anon');await db.exec('truncate restauracao.posts');
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from restauracao.posts')).rows[0].n,0);
 await db.exec('revoke truncate, references, trigger on all tables in schema restauracao from anon,authenticated');
 await sessao('anon');await assert.rejects(db.exec('truncate restauracao.posts'));
 console.log('RLS local: sete tabelas, visitante/comum/inativo/AAL1/admin AAL2; leituras e escritas conferidas. Risco de TRUNCATE com grants amplos reproduzido e revogação testada SOMENTE em banco efêmero. Auth simulado; não é teste remoto.');
}finally{await db.close();}
