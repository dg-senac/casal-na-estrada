import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {criarPacote,TABELAS} from '../experiments/emergencia/pacote-editorial.mjs';
import {ESQUEMA_LOCAL,recuperarLocal} from '../experiments/emergencia/recuperacao-local.mjs';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const dados={
 posts:[{id:id(1),slug:'rascunho-ficticio',data:'2026-11-09',publicado:false,corpo:'Texto <script>não executar</script> 🏍️',ficha_rota:{origem:'Recife'},tags:[],opcional:null}],
 albuns:[{id:id(2),slug:'album-ficticio',data:'2026-11-09',publicado:true}],
 trofeus:[{id:id(3),slug:'trofeu-ficticio',data:null,publicado:false,ano:2026}],
 encontros:[{id:id(4),inicio:'2026-11-09',fim:'2026-11-10',hora_inicio:'18:00',publicado:true,confirmado:false}],
 album_fotos:[{id:id(5),album_id:id(2),url:'/ficticio.jpg',legenda:'Ação'}],
 album_videos:[{id:id(6),album_id:id(2),youtube:'ficticio'}],
 trofeu_fotos:[{id:id(7),trofeu_id:id(3),url:'/trofeu-ficticio.jpg'}],
};
async function novo(){const db=new PGlite();await db.exec(ESQUEMA_LOCAL);return db;}
async function vazio(db){for(const t of TABELAS)assert.equal((await db.query(`select count(*)::int n from recuperacao.${t}`)).rows[0].n,0);}
const db=await novo();
try{
 const pacote=await criarPacote(dados);
 assert.deepEqual(await recuperarLocal(db,pacote),Object.fromEntries(TABELAS.map(t=>[t,1])));
 for(const t of TABELAS)assert.deepEqual((await db.query(`select registro from recuperacao.${t}`)).rows.map(r=>r.registro),dados[t]);
 await assert.rejects(recuperarLocal(db,pacote),/Destino não vazio/);
 for(const t of TABELAS)assert.equal((await db.query(`select count(*)::int n from recuperacao.${t}`)).rows[0].n,1);
 // Confere constraints nativas do banco, sem passar pelo validador do pacote.
 await assert.rejects(db.query('insert into recuperacao.album_fotos values($1,$2,$3)',[id(10),id(99),'{}']));
 await assert.rejects(db.query('insert into recuperacao.posts values($1,$2,$3,$4,$5)',[id(1),'outro','2026-11-09',true,'{}']));
}finally{await db.close();}
for(const alterar of [
 d=>{d.encontros[0].hora_inicio='24:00';},
 d=>{d.encontros[0].fim='2026-11-08';},
 d=>{d.encontros[0].inicio='2026-02-30';},
 d=>{d.encontros[0].publicado=null;},
 d=>{d.album_videos[0].id='uuid-invalido';},
 d=>{d.posts.push({...d.posts[0],id:id(20)});},
]){
 const isolado=await novo();
 try{const ruim=structuredClone(dados);alterar(ruim);const pacote=await criarPacote(ruim);await assert.rejects(recuperarLocal(isolado,pacote));await vazio(isolado);}
 finally{await isolado.close();}
}
const isolado=await novo();try{
 await assert.rejects(recuperarLocal(isolado,(await criarPacote(dados)).slice(0,-3)));await vazio(isolado);
 const semFilhos=structuredClone(dados);semFilhos.album_videos=[];
 await recuperarLocal(isolado,await criarPacote(semFilhos));assert.equal((await isolado.query('select count(*)::int n from recuperacao.album_videos')).rows[0].n,0);
}finally{await isolado.close();}
console.log('Postgres local isolado: sete tabelas recuperadas com igualdade do JSON, constraints UUID/data/horário/FK/UNIQUE/NOT NULL, destino ocupado recusado e rollback integral após falha aprovados. Não replica esquema/RLS de produção.');
