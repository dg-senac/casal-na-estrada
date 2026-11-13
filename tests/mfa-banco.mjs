// PostgreSQL isolado: não conecta ao Supabase nem cria fatores reais.
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const admin = randomUUID(), outro = randomUUID();
await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema painel_privado;
create table painel_privado.administradores(usuario_id uuid primary key, ativo boolean);
create table auth.mfa_factors(user_id uuid, status text);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.jwt(), auth.uid() to authenticated;
`);
await db.query('insert into painel_privado.administradores values ($1,true)',[admin]);
await db.exec(readFileSync('supabase/migrations/202611090002_mfa_painel.sql','utf8'));
await db.exec(`
create table conteudo(id int, publicado boolean, titulo text);
insert into conteudo values (1,true,'público'),(2,false,'rascunho');
alter table conteudo enable row level security;
grant select on conteudo to anon; grant select,update on conteudo to authenticated;
create policy leitura on conteudo for select using (publicado);
create policy admin_le on conteudo for select to authenticated using ((select e_administrador()));
create policy admin_edita on conteudo for update to authenticated using ((select e_administrador())) with check ((select e_administrador()));
`);
async function sessao(uid,aal) {
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:uid,role:'authenticated',aal,user_metadata:{admin:true,aal:'aal2'}})]);
 await db.exec('set role authenticated');
}
const acesso = async () => (await db.query('select e_administrador() as permite, estado_acesso_painel() as estado')).rows[0];
const editar = async () => (await db.query("update conteudo set titulo='atualizado' where id=2 returning id")).rows.length;
await sessao(admin,'aal1');assert.equal((await acesso()).permite,true);assert.equal(await editar(),1);
await db.exec('reset role');await db.query("insert into auth.mfa_factors values ($1,'unverified')",[admin]);
await sessao(admin,'aal1');assert.equal((await acesso()).permite,true);
await db.exec('reset role');await db.exec("update auth.mfa_factors set status='verified'");
await sessao(admin,'aal1');
let r=await acesso();assert.equal(r.permite,false);assert.equal(r.estado.mfa_necessario,true);assert.equal(await editar(),0);
assert.equal((await db.query('select * from conteudo where publicado=false')).rows.length,0);
await sessao(admin,undefined);assert.equal((await acesso()).permite,false);
await sessao(admin,'aal2');r=await acesso();assert.equal(r.permite,true);assert.equal(r.estado.mfa_necessario,false);assert.equal(await editar(),1);
await sessao(outro,'aal2');r=await acesso();assert.equal(r.permite,false);assert.equal(r.estado.autorizado,false);assert.equal(await editar(),0);
await db.exec('reset role');await db.exec('set role anon');
await assert.rejects(db.query('select estado_acesso_painel()'),e=>e.code==='42501');
await db.close();
console.log('MFA/banco isolado: sem fator, pendente, AAL1 bloqueado, AAL2 autorizado, RLS e não administrador OK.');
