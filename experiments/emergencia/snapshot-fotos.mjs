/** Núcleo do backup limitado de fotos. Chamado somente após autorização HTTP no Worker paralelo. */
import {hashFoto} from './fotos-d1-local.mjs';
export const SQL_SNAPSHOT_FOTOS=`
CREATE TABLE snapshots_fotos (
 id TEXT PRIMARY KEY REFERENCES backups_editoriais_reais(id),
 usuario_id TEXT NOT NULL,
 manifesto TEXT NOT NULL CHECK(length(CAST(manifesto AS BLOB))<=65536),
 estado TEXT NOT NULL DEFAULT 'incompleto' CHECK(estado IN ('incompleto','concluido')),
 criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE objetos_snapshot_fotos (
 snapshot_id TEXT NOT NULL REFERENCES snapshots_fotos(id),
 nome TEXT NOT NULL,
 tamanho INTEGER NOT NULL CHECK(tamanho>=0 AND tamanho<=1048576),
 sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 bytes BLOB NOT NULL CHECK(length(bytes)=tamanho),
 verificado INTEGER NOT NULL DEFAULT 0 CHECK(verificado IN (0,1)),
 PRIMARY KEY(snapshot_id,nome)
);`;
function validarManifesto(arquivos){
 if(!Array.isArray(arquivos)||arquivos.length>100)throw Error('Manifesto excede 100 arquivos');
 const nomes=new Set();let total=0;
 for(const a of arquivos){
  if(!a||Object.keys(a).sort().join('|')!=='nome|tamanho'||typeof a.nome!=='string'||a.nome.length>1024||!/^(midia|midia-rascunhos)\//.test(a.nome)||/[\\\x00-\x1f\x7f?#]/.test(a.nome)||a.nome.split('/').some(s=>!s||s==='.'||s==='..')||nomes.has(a.nome)||!Number.isSafeInteger(a.tamanho)||a.tamanho<0||a.tamanho>1048576)throw Error('Manifesto inválido ou arquivo acima de 1 MiB');
  nomes.add(a.nome);total+=a.tamanho;
 }
 if(total>8*1048576)throw Error('Snapshot excede 8 MiB');
 const texto=JSON.stringify([...arquivos].sort((a,b)=>a.nome.localeCompare(b.nome)));
 if(new TextEncoder().encode(texto).length>65536)throw Error('Manifesto excessivo');
 return texto;
}
async function obterSnapshot(db,id,usuario){
 if(!/^[a-f0-9-]{36}$/.test(id)||typeof usuario!=='string'||!usuario)throw Error('Identificação inválida');
 const s=await db.prepare('SELECT * FROM snapshots_fotos WHERE id=? AND usuario_id=?').bind(id,usuario).first();if(!s)throw Error('Snapshot indisponível');return s;
}
export async function iniciarSnapshotFotos(db,{id,usuario,arquivos}){
 const manifesto=validarManifesto(arquivos);
 if(!/^[a-f0-9-]{36}$/.test(id)||typeof usuario!=='string'||!usuario)throw Error('Identificação inválida');
 // Capacidade global: até 3 snapshots, 8 MiB cada; sem remoção automática.
 const r=await db.prepare(`INSERT INTO snapshots_fotos(id,usuario_id,manifesto)
 SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM backups_editoriais_reais WHERE id=? AND usuario_id=?)
 AND (SELECT count(*) FROM snapshots_fotos)<3`).bind(id,usuario,manifesto,id,usuario).run();
 if(r.meta?.changes!==1)throw Error('Sem cópia editorial correspondente ou capacidade para fotos');
}
export async function guardarObjetoSnapshot(db,{id,usuario,nome,bytes}){
 const s=await obterSnapshot(db,id,usuario);if(s.estado!=='incompleto')throw Error('Snapshot selado');
 const arquivo=JSON.parse(s.manifesto).find(a=>a.nome===nome);
 if(!arquivo||!(bytes instanceof Uint8Array)||bytes.length!==arquivo.tamanho)throw Error('Arquivo não corresponde ao inventário');
 const hash=await hashFoto(bytes);
 const r=await db.prepare(`INSERT INTO objetos_snapshot_fotos(snapshot_id,nome,tamanho,sha256,bytes)
 SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM snapshots_fotos WHERE id=? AND usuario_id=? AND estado='incompleto')
 ON CONFLICT(snapshot_id,nome) DO NOTHING`).bind(id,nome,bytes.length,hash,bytes.slice().buffer,id,usuario).run();
 const salvo=await lerObjetoSnapshot(db,{id,usuario,nome});
 if(salvo.sha256!==hash)throw Error('Objeto anterior diferente; não sobrescrito');
 await db.prepare(`UPDATE objetos_snapshot_fotos SET verificado=1 WHERE snapshot_id=? AND nome=? AND sha256=? AND EXISTS(SELECT 1 FROM snapshots_fotos WHERE id=? AND estado='incompleto')`).bind(id,nome,hash,id).run();
 return {sha256:hash,novo:r.meta?.changes===1};
}
export async function lerObjetoSnapshot(db,{id,usuario,nome}){
 const s=await obterSnapshot(db,id,usuario);
 if(!JSON.parse(s.manifesto).some(a=>a.nome===nome))throw Error('Objeto fora do manifesto');
 const r=await db.prepare('SELECT tamanho,sha256,bytes FROM objetos_snapshot_fotos WHERE snapshot_id=? AND nome=?').bind(id,nome).first();
 if(!r)throw Error('Objeto ausente');
 const bytes=r.bytes instanceof ArrayBuffer?new Uint8Array(r.bytes):new Uint8Array(r.bytes);
 if(bytes.length!==r.tamanho||await hashFoto(bytes)!==r.sha256)throw Error('Integridade divergente');
 return {bytes,sha256:r.sha256};
}
export async function verificarObjetoSnapshot(db,{id,usuario,nome}){
 const r=await lerObjetoSnapshot(db,{id,usuario,nome});
 await db.prepare(`UPDATE objetos_snapshot_fotos SET verificado=1 WHERE snapshot_id=? AND nome=? AND sha256=?
 AND EXISTS(SELECT 1 FROM snapshots_fotos WHERE id=? AND usuario_id=? AND estado='incompleto')`).bind(id,nome,r.sha256,id,usuario).run();
 return r;
}
export async function concluirSnapshotFotos(db,{id,usuario}){
 const s=await obterSnapshot(db,id,usuario),arquivos=JSON.parse(s.manifesto);
 // Bytes são relidos/verificados por arquivo em requests separados. Nenhum
 // loop de centenas de consultas dentro da requisição de conclusão.
 const total=await db.prepare(`SELECT count(*) n,coalesce(sum(tamanho),0) tamanho,
 coalesce(sum(verificado),0) verificados FROM objetos_snapshot_fotos WHERE snapshot_id=?`).bind(id).first();
 if(total.n!==arquivos.length||total.verificados!==arquivos.length||total.tamanho!==arquivos.reduce((n,a)=>n+a.tamanho,0))throw Error('Cópia ou verificação incompleta');
 const divergentes=await db.prepare(`SELECT count(*) n FROM json_each(?) j LEFT JOIN objetos_snapshot_fotos o
 ON o.snapshot_id=? AND o.nome=json_extract(j.value,'$.nome')
 WHERE o.nome IS NULL OR o.tamanho!=json_extract(j.value,'$.tamanho') OR o.verificado!=1`).bind(s.manifesto,id).first();
 if(divergentes.n!==0)throw Error('Manifesto divergente');
 await db.prepare("UPDATE snapshots_fotos SET estado='concluido' WHERE id=? AND usuario_id=? AND estado='incompleto'").bind(id,usuario).run();
 const final=await obterSnapshot(db,id,usuario);if(final.estado!=='concluido')throw Error('Conclusão não confirmada');
 return {arquivos:arquivos.length,totalBytes:total.tamanho};
}
