/** PROTÓTIPO LOCAL. Não importado pelo Worker nem exposto por API. */
export const ESQUEMA_FOTOS_D1=`
CREATE TABLE fotos_ensaio (
 id TEXT PRIMARY KEY,
 nome TEXT NOT NULL,
 tamanho INTEGER NOT NULL CHECK(tamanho >= 0 AND tamanho <= 1048576),
 sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 bytes BLOB NOT NULL CHECK(length(bytes)=tamanho)
);`;
export const LIMITES_FOTOS_D1=Object.freeze({arquivo:1048576,total:16*1048576,quantidade:100});
export async function hashFoto(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function nomeSeguro(nome){return typeof nome==='string'&&nome.length<=1024&&/^(midia|midia-rascunhos)\//.test(nome)&&!/[\\\x00-\x1f\x7f?#]/.test(nome)&&!nome.split('/').some(s=>!s||s==='.'||s==='..');}
export async function ensaiarFotoD1(db,{id,nome,bytes}){
 if(typeof id!=='string'||!/^[a-z0-9-]{1,80}$/.test(id)||!nomeSeguro(nome)||!(bytes instanceof Uint8Array)||bytes.length>LIMITES_FOTOS_D1.arquivo)throw Error('Arquivo fora dos limites do ensaio');
 const hash=await hashFoto(bytes);
 // Gravação condicional e imutável. Não é protocolo de snapshot completo.
 const r=await db.prepare(`INSERT INTO fotos_ensaio(id,nome,tamanho,sha256,bytes)
 SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM fotos_ensaio)<100
 AND (SELECT coalesce(sum(tamanho),0) FROM fotos_ensaio)+?<=16777216`).bind(id,nome,bytes.length,hash,bytes.slice().buffer,bytes.length).run();
 if(r.meta?.changes!==1)throw Error('Capacidade do ensaio excedida');
 const salvo=await db.prepare('SELECT nome,tamanho,sha256,bytes FROM fotos_ensaio WHERE id=?').bind(id).first();
 const retorno=salvo?.bytes instanceof ArrayBuffer?new Uint8Array(salvo.bytes):new Uint8Array(salvo?.bytes||[]);
 if(salvo?.nome!==nome||salvo?.tamanho!==bytes.length||salvo?.sha256!==hash||await hashFoto(retorno)!==hash)throw Error('Releitura do binário divergente');
 return {tamanho:retorno.length,sha256:hash};
}
