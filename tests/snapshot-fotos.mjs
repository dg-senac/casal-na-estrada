import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {SQL_SNAPSHOT_FOTOS,iniciarSnapshotFotos,guardarObjetoSnapshot,lerObjetoSnapshot,concluirSnapshotFotos} from '../experiments/emergencia/snapshot-fotos.mjs';
const mf=new Miniflare(convertV4MiniflareOptions({rootPath:'/',name:'fotos',modules:true,script:'export default {fetch(){return new Response("local");}}',d1Databases:['DB']}));
try{
 const db=await mf.getD1Database('DB','fotos');
 await db.exec('CREATE TABLE backups_editoriais_reais(id TEXT PRIMARY KEY,usuario_id TEXT);');
 await db.exec(SQL_SNAPSHOT_FOTOS.replaceAll('\n',' '));
 const id='00000000-0000-4000-8000-000000000001',usuario='admin-fixture',nome='midia-rascunhos/v1/fixture.webp',bytes=new Uint8Array([0,255,128,1]);
 await db.prepare('INSERT INTO backups_editoriais_reais VALUES(?,?)').bind(id,usuario).run();
 await assert.rejects(iniciarSnapshotFotos(db,{id,usuario:'outra-conta',arquivos:[]}));
 await iniciarSnapshotFotos(db,{id,usuario,arquivos:[{nome,tamanho:4}]});
 await assert.rejects(concluirSnapshotFotos(db,{id,usuario}));
 assert.equal((await db.prepare('SELECT estado FROM snapshots_fotos WHERE id=?').bind(id).first()).estado,'incompleto');
 await assert.rejects(guardarObjetoSnapshot(db,{id,usuario,nome,bytes:new Uint8Array(3)}));
 assert.equal((await guardarObjetoSnapshot(db,{id,usuario,nome,bytes})).novo,true);
 assert.equal((await guardarObjetoSnapshot(db,{id,usuario,nome,bytes})).novo,false);
 await assert.rejects(guardarObjetoSnapshot(db,{id,usuario,nome,bytes:new Uint8Array([1,2,3,4])}));
 await assert.rejects(lerObjetoSnapshot(db,{id,usuario:'outra-conta',nome}));
 assert.deepEqual((await lerObjetoSnapshot(db,{id,usuario,nome})).bytes,bytes);
 assert.deepEqual(await concluirSnapshotFotos(db,{id,usuario}),{arquivos:1,totalBytes:4});
 await assert.rejects(guardarObjetoSnapshot(db,{id,usuario,nome,bytes}));
 // Corrupção simulada exclusivamente no banco local: download e reconferência falham.
 await db.prepare('UPDATE objetos_snapshot_fotos SET bytes=? WHERE snapshot_id=?').bind(new Uint8Array(4).buffer,id).run();
 await assert.rejects(lerObjetoSnapshot(db,{id,usuario,nome}),/Integridade/);
 // Conclusão usa marcadores internos; corrupção fora da API é detectada no download.

 for(let i=2;i<=3;i++){const novo=id.slice(0,-1)+i;await db.prepare('INSERT INTO backups_editoriais_reais VALUES(?,?)').bind(novo,usuario).run();await iniciarSnapshotFotos(db,{id:novo,usuario,arquivos:[]});}
 const quarto=id.slice(0,-1)+'4';await db.prepare('INSERT INTO backups_editoriais_reais VALUES(?,?)').bind(quarto,usuario).run();
 await assert.rejects(iniciarSnapshotFotos(db,{id:quarto,usuario,arquivos:[]}));
 console.log('Snapshot fotos D1 LOCAL: vínculo editorial/conta, incompleto, bytes verificados, retomada idempotente, não sobrescrita, selo, corrupção e limite de versões aprovados. Sem rede real/deploy.');
}finally{await mf.dispose();}
