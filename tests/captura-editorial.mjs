import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {TABELAS,criarPacote,abrirPacote} from '../experiments/emergencia/pacote-editorial.mjs';
const db=new PGlite();
const admin='00000000-0000-4000-8000-000000000001',outro='00000000-0000-4000-8000-000000000002';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema painel_privado;
 create table painel_privado.administradores(usuario_id uuid primary key,ativo boolean not null);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 create function public.e_administrador() returns boolean language sql security definer set search_path='' as $$select exists(select 1 from painel_privado.administradores where usuario_id=auth.uid() and ativo)$$;
 insert into painel_privado.administradores values('${admin}',true);`);
 for(const t of TABELAS)await db.exec(`create table public.${t}(id uuid primary key, publicado boolean not null, texto text);alter table public.${t} enable row level security;`);
 await db.query('insert into posts values($1,false,$2)',[admin,'Rascunho fictício 🏍️']);
 const sql=readFileSync('supabase/migrations/202611210004_captura_editorial_emergencia.sql','utf8');await db.exec(sql);await db.exec(sql);
 const claims=async(sub,aal)=>db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub,aal})]);
 const chamar=()=>db.query('select public.capturar_editorial_emergencia() as captura');
 await db.exec('set role anon');await assert.rejects(chamar(),/permission denied/);await db.exec('reset role');
 for(const [sub,aal] of [[undefined,'aal2'],[outro,'aal2'],[admin,'aal1']]){
   await claims(sub,aal);await db.exec('set role authenticated');await assert.rejects(chamar(),/Acesso restrito/);await db.exec('reset role');
 }
 await claims(admin,'aal2');await db.exec('set role authenticated');
 await assert.rejects(db.query('select * from public.posts'),/permission denied/);
 const captura=(await chamar()).rows[0].captura;
 assert.equal(captura.versaoCaptura,1);assert.equal(captura.contagens.posts,1);
 assert.equal(captura.dados.posts[0].publicado,false);
 for(const t of TABELAS.filter(t=>t!=='posts'))assert.deepEqual(captura.dados[t],[]);
 assert.deepEqual((await abrirPacote(await criarPacote(captura.dados,captura.capturadoEm))).dados,captura.dados);
 await db.exec('reset role');
 await db.query('update painel_privado.administradores set ativo=false where usuario_id=$1',[admin]);
 await db.exec('set role authenticated');await assert.rejects(chamar(),/Acesso restrito/);await db.exec('reset role');
 await db.exec('update painel_privado.administradores set ativo=true');
 await db.query('update posts set texto=$1',['x'.repeat(1572865)]);
 await db.exec('set role authenticated');await assert.rejects(chamar(),/1,5 MiB/);await db.exec('reset role');
 await db.exec("update posts set texto='pequeno'; insert into posts select md5(n::text)::uuid,false,'ficticio' from generate_series(1,10001)n;");
 await db.exec('set role authenticated');await assert.rejects(chamar(),/limite de registros/);await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int as n from posts')).rows[0].n,10002);
 console.log('Captura local: RPC restrita, admin AAL2, revogação de acesso, rascunhos, sete tabelas, limites sem truncamento silencioso, SQL idempotente e compatibilidade do pacote aprovados. Auth simulado; sem banco real.');
}finally{await db.close();}
