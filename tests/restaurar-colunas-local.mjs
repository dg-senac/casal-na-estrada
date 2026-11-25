import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {criarPacote,TABELAS} from '../experiments/emergencia/pacote-editorial.mjs';
import {ensaiarColunasReais} from '../experiments/emergencia/restaurar-colunas-local.mjs';
const db=new PGlite();let dados={};
try{
 await db.exec(readFileSync('experiments/emergencia/esquema-colunas-observado.sql','utf8'));
 await db.exec(`insert into restauracao.posts(slug,titulo,resumo) values('fixture','Fixture','Texto');insert into restauracao.albuns(slug,titulo) values('fixture','Fixture');insert into restauracao.trofeus(slug,evento,historia) values('fixture','Fixture','');insert into restauracao.encontros(nome,inicio,cidade,uf) values('Fixture','2026-11-09','Recife','PE');insert into restauracao.album_fotos(album_id,url) select id,'/media/ficticia.jpg' from restauracao.albuns;insert into restauracao.album_videos(album_id,titulo) select id,'Fixture' from restauracao.albuns;insert into restauracao.trofeu_fotos(trofeu_id,url) select id,'/media/ficticia.jpg' from restauracao.trofeus;`);
 for(const t of TABELAS)dados[t]=(await db.query(`select to_jsonb(t) registro from restauracao.${t} t`)).rows.map(r=>r.registro);
}finally{await db.close();}
assert.deepEqual((await ensaiarColunasReais(await criarPacote(dados))).contagens,Object.fromEntries(TABELAS.map(t=>[t,1])));
for(const alterar of [
 d=>{delete d.posts[0].titulo;},
 d=>{d.posts[0].campo_novo='nao ignorar';},
 d=>{d.posts[0].resumo='x'.repeat(261);},
 d=>{d.posts[0].destinos_mapa=[{nome:'Recife',uf:'XX'}];},
 d=>{d.encontros[0].hora_inicio='24:00';},
 d=>{d.encontros[0].fonte_url='javascript:alert(1)';},
 d=>{d.trofeus[0].ano=1800;},
]){
 const copia=structuredClone(dados);alterar(copia);await assert.rejects(ensaiarColunasReais(await criarPacote(copia)));
}
console.log('Colunas observadas: sete tabelas inseridas/relidas; campos faltantes/desconhecidos, resumo, destinos, hora, fonte e ano inválidos recusados. Fixtures, sem rede.');
