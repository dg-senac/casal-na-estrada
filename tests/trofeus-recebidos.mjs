import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const manifesto = JSON.parse(readFileSync('scripts/trofeus-recebidos.json', 'utf8'));
assert.equal(manifesto.length, 9);
assert.equal(new Set(manifesto.map(m => m.slug)).size, 9);
for (const m of manifesto) {
  assert(existsSync(`public${m.foto}`));
  const bytes = readFileSync(`public${m.foto}`);
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
}
const db = new PGlite();
await db.exec(`CREATE TABLE public.trofeus (
 slug text unique not null, evento text not null, ano integer, data date,
 cidade text, edicao text, categoria text, tipo text, foto_alt text,
 historia text, foto_url text, colocacao text, nivel text, publicado boolean
);
INSERT INTO trofeus (slug,evento) VALUES ('original-preservado','Não alterar');`);
const sql = readFileSync('scripts/cadastrar-trofeus-recebidos.sql','utf8');
await db.exec(sql);
await db.exec(sql);
const {rows} = await db.query('select * from trofeus');
assert.equal(rows.length, 10);
assert.equal(rows.find(r=>r.slug==='original-preservado').evento, 'Não alterar');
for(const m of manifesto) {
 const r=rows.find(r=>r.slug===m.slug);
 assert.equal(r.foto_url,m.foto);
 assert.equal(r.publicado,true);
 if(m.slug.startsWith('sem-ano-')) {assert.equal(r.ano,null);assert.equal(r.data,null);}
}
await db.close();
console.log('Nove imagens e cadastros: caminhos, SQL, datas desconhecidas, reexecução e preservação aprovados.');
