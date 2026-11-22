import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {ESQUEMA_FOTOS_D1,ensaiarFotoD1,hashFoto} from '../experiments/emergencia/fotos-d1-local.mjs';
const mf=new Miniflare(convertV4MiniflareOptions({rootPath:'/',name:'fotos',modules:true,script:'export default {fetch(){return new Response("ensaio");}}',d1Databases:['DB']}));
try{
 const db=await mf.getD1Database('DB','fotos');await db.exec(ESQUEMA_FOTOS_D1.replaceAll('\n',' '));
 const bytes=Uint8Array.from({length:250000},(_,i)=>i%256);
 const salvo=await ensaiarFotoD1(db,{id:'fixture-1',nome:'midia-rascunhos/v1/fixture.webp',bytes});
 assert.equal(salvo.sha256,await hashFoto(bytes));assert.equal(salvo.tamanho,250000);
 await assert.rejects(ensaiarFotoD1(db,{id:'fixture-1',nome:'midia/duplicada.jpg',bytes}));
 await assert.rejects(ensaiarFotoD1(db,{id:'fixture-2',nome:'midia/../escape.jpg',bytes}));
 await assert.rejects(ensaiarFotoD1(db,{id:'fixture-2',nome:'midia/grande.jpg',bytes:new Uint8Array(1048577)}));
 const r=await db.prepare('SELECT count(*) as n FROM fotos_ensaio').first();assert.equal(r.n,1);
 const bloco=new Uint8Array(1048576);
 for(let i=0;i<15;i++)await ensaiarFotoD1(db,{id:'limite-'+i,nome:'midia/fixture-'+i+'.jpg',bytes:bloco});
 await assert.rejects(ensaiarFotoD1(db,{id:'acima-total',nome:'midia/limite.jpg',bytes:bloco}),/Capacidade/);
 assert.equal((await db.prepare('SELECT count(*) as n FROM fotos_ensaio').first()).n,16);
 console.log('D1 emulado: BLOB de 250000 bytes persistido e relido com SHA256 igual; duplicação, traversal e excesso de tamanho recusados. Sem fotos reais ou deploy.');
}finally{await mf.dispose();}
