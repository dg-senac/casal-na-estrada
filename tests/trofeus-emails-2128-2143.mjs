import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
const itens=JSON.parse(readFileSync('scripts/trofeus-emails-2128-2143.json','utf8'));
assert.equal(itens.length,15);
assert.equal(itens.filter(i=>i.acao==='adicionar').length,14);
assert.equal(itens.filter(i=>i.acao==='substituir').length,1);
assert.equal(new Set(itens.map(i=>i.slug)).size,15);
for(const i of itens) {
 const bytes=readFileSync(`public${i.foto}`);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),i.sha256);
 assert.equal(bytes[0],255);assert.equal(bytes[1],216);
}
const db=new PGlite();
await db.exec(`CREATE TABLE trofeus (slug text unique, evento text, ano integer, data date, cidade text, edicao text, tipo text, historia text, foto_url text, foto_alt text, categoria text, colocacao text, nivel text, publicado boolean);
INSERT INTO trofeus (slug,evento) VALUES ('2026-11-estradeiros-do-rei','Original preservado');`);
const sql=readFileSync('scripts/cadastrar-trofeus-emails-2128-2143.sql','utf8');
await db.exec(sql);await db.exec(sql);
const {rows}=await db.query('select * from trofeus');
assert.equal(rows.length,15);
assert.equal(rows.find(r=>r.slug==='2026-11-estradeiros-do-rei').evento,'Original preservado');
for(const i of itens.filter(i=>i.acao==='adicionar')) {
 const r=rows.find(r=>r.slug===i.slug);assert.equal(r.foto_url,i.foto);assert.equal(r.publicado,true);
 if(i.slug.startsWith('sem-ano-')) {assert.equal(r.ano,null);assert.equal(r.data,null);}
}
assert.equal(rows.find(r=>r.slug==='2025-cha-grande-motofest-1').ano,2025);
assert.equal(rows.find(r=>r.slug==='2026-cha-grande-motofest-2').ano,2026);
await db.close();
console.log('15 anexos: hashes, 14 inclusões, 1 substituição, SQL sem duplicação e anos aprovados.');
