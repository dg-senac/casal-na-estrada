import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const m=JSON.parse(readFileSync('scripts/trofeus-email-23nov2026.json','utf8'));
assert.equal(m.atualizacoes.length,8);assert.equal(m.novos.length,2);assert.equal(m.pendentes[0].origem,'179762.jpg');assert.equal(m.excluidos[0].origem,'179780.jpg');
const arquivos=new Set();
for(const r of [...m.atualizacoes,...m.novos]){assert(!arquivos.has(r.foto_url));arquivos.add(r.foto_url);assert.equal(createHash('sha256').update(readFileSync('public'+r.foto_url)).digest('hex'),r.sha256);if(r.foto_anterior){assert.notEqual(r.foto_anterior,r.foto_url);assert(existsSync('public'+r.foto_anterior));}}
assert.equal(m.novos.find(r=>r.slug.includes('bezerros')).ano,null);
assert(!m.atualizacoes.some(r=>r.slug.includes('2023')||r.slug.includes('capibaribe')));
const sql=readFileSync('scripts/aplicar-trofeus-email-23nov2026.sql','utf8');assert.doesNotMatch(sql,/DELETE|TRUNCATE|DROP|SET\s+ano/i);assert.equal((sql.match(/UPDATE public.trofeus/g)||[]).length,8);assert.equal((sql.match(/INSERT INTO/g)||[]).length,2);
console.log('Troféus e-mail: 8 atualizações de foto sem sobrescrever originais, 2novos sem datas inventadas, Capibaribe e casal fora;10JPEG com SHA256 conferidos. SQL preparado, não aplicado.');
