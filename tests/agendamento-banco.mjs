import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated;
create table posts(id int,publicado boolean,data date);
alter table posts enable row level security;
grant select on posts to anon,authenticated;
create policy leitura_publica on posts for select using(publicado);
create policy admin_le on posts for select to authenticated using(current_setting('test.admin',true)='sim');
insert into posts values
(1,true,(now() at time zone 'America/Recife')::date),
(2,true,(now() at time zone 'America/Recife')::date+1),
(3,false,(now() at time zone 'America/Recife')::date-1),
(4,true,(now() at time zone 'America/Recife')::date-1);
`);
const sql=readFileSync('supabase/migrations/202611190001_agendamento_privado.sql','utf8');
await db.exec(sql); await db.exec(sql);
const ids=async()=> (await db.query('select id from posts order by id')).rows.map(r=>r.id);
await db.exec('set role anon'); assert.deepEqual(await ids(),[1,4]);
await db.exec('reset role;set role authenticated');assert.deepEqual(await ids(),[1,4]);
await db.exec("select set_config('test.admin','sim',false)");assert.deepEqual(await ids(),[1,2,3,4]);
await db.close();console.log('RLS agendamento: anônimo e usuário comum não leem futuro/rascunho; admin preservado; migração idempotente.');
