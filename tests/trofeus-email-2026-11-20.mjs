import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const manifesto=JSON.parse(readFileSync('scripts/trofeus-email-2026-11-20.json','utf8'));
assert.equal(manifesto.incluidos.length,8);assert.equal(manifesto.excluidos.length,5);
assert.equal(new Set(manifesto.incluidos.map(i=>i.slug)).size,8);
for(const r of manifesto.incluidos){
 assert.ok(!manifesto.excluidos.includes(r.origem));
 const arquivo='public'+r.foto_url;assert.ok(existsSync(arquivo));
 assert.equal(createHash('sha256').update(readFileSync(arquivo)).digest('hex'),r.sha256);
 assert.equal(Number(r.data.slice(0,4)),r.ano);
}
const db=new PGlite();await db.exec(`create table trofeus(slug text primary key,evento text,ano int,data date,cidade text,edicao text,tipo text,historia text,foto_url text,foto_alt text,categoria text,colocacao text,nivel text,publicado boolean);
insert into trofeus(slug,ano,foto_url) values('2026-caveiras-100-limites',2026,'/media/trofeus/2026-caveiras-100-limites.jpg');`);
const sql=readFileSync('scripts/cadastrar-trofeus-email-2026-11-20.sql','utf8');await db.exec(sql);await db.exec(sql);
assert.equal((await db.query('select count(*)::int as n from trofeus')).rows[0].n,9);
assert.equal((await db.query("select foto_url from trofeus where slug='2026-caveiras-100-limites'")).rows[0].foto_url,'/media/trofeus/2026-caveiras-100-limites.jpg');
for(const r of manifesto.incluidos){const row=(await db.query('select * from trofeus where slug=$1',[r.slug])).rows[0];assert.equal(row.ano,r.ano);assert.equal(row.foto_url,r.foto_url);assert.equal(row.nivel,'laco');assert.equal(row.publicado,true);}
await db.exec("update trofeus set historia='Editado pelo casal' where slug='2026-highway-mc-5'");await db.exec(sql);
assert.equal((await db.query("select historia from trofeus where slug='2026-highway-mc-5'")).rows[0].historia,'Editado pelo casal');
await db.close();console.log('Troféus 20/11: oito inclusões, cinco exclusões, hashes, datas, edição 2026 preservada e SQL idempotente OK.');
