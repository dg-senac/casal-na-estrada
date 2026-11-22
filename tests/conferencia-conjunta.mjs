import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {criarPacote,TABELAS} from '../experiments/emergencia/pacote-editorial.mjs';
import {montarZipFotos} from '../experiments/emergencia/zip-fotos.mjs';
import {conferirConjunto} from '../experiments/emergencia/conferencia-conjunta.mjs';
import {ESQUEMA_LOCAL,recuperarLocal} from '../experiments/emergencia/recuperacao-local.mjs';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const base='https://pjglrlullnchqazxpvyn.supabase.co';
const dados=Object.fromEntries(TABELAS.map(t=>[t,[]]));
dados.posts=[{id:id(1),slug:'ficticio',data:'2026-11-09',publicado:false,capa_url:'/casal-na-estrada/media/ação.jpg',capa_mini:base+'/storage/v1/object/public/midia/falta.jpg',corpo:'<img src="https://exemplo.invalid/embutida.jpg">'}];
dados.albuns=[{id:id(2),slug:'ficticio',data:'2026-11-09',publicado:true,capa_url:base+'/functions/v1/foto-publicada/v1/privada.webp',capa_mini:'https://exemplo.invalid/externa.jpg'}];
dados.album_fotos=[{id:id(3),album_id:id(2),url:base+'/storage/v1/object/public/midia/escape%2Farquivo.jpg'}];
dados.album_videos=[{id:id(4),album_id:id(2),url:'https://youtube.com/watch?v=ficticio'}];
const bytes=new Uint8Array([0,255,11,22]),hash=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
const nomes=['repositorio/media/ação.jpg','midia-rascunhos/v1/privada.webp','midia/sem-referencia.jpg'];
const manifesto={versao:1,tipo:'arquivos-midia-sem-cadastros',criadoEm:'2026-11-09T00:00:00.000Z',totalBytes:bytes.length*nomes.length,arquivos:nomes.map(nome=>({bucket:nome.split('/')[0],caminho:nome.split('/').slice(1).join('/'),nome,tamanho:bytes.length,sha256:hash}))};
const zip=montarZipFotos([...nomes.map(nome=>({nome,bytes})),{nome:'manifesto.json',bytes:new TextEncoder().encode(JSON.stringify(manifesto))}]);
const pacote=await criarPacote(dados,'2026-11-09T00:00:00.000Z');
const report=await conferirConjunto(pacote,zip);
assert.deepEqual(report.contagens,{presente:2,ausente:1,externa:1,nao_classificada:1,video_externo:1});assert.equal(report.arquivosSemReferencia,1);
assert.doesNotMatch(JSON.stringify(report),/youtube.com|exemplo.invalid/);
await assert.rejects(conferirConjunto(pacote.slice(0,-2),zip));
await assert.rejects(conferirConjunto(pacote,new Blob(['truncado'])));
// Prova conjunta isolada: cadastros inseridos em PGlite, relidos byte-logicamente
// como JSON, e mesmas referências cruzadas com ZIP validado. Não esquema real.
const db=new PGlite();try{
 await db.exec(ESQUEMA_LOCAL);await recuperarLocal(db,pacote);
 const recuperados={};for(const t of TABELAS)recuperados[t]=(await db.query(`select registro from recuperacao.${t}`)).rows.map(r=>r.registro);
 assert.deepEqual(recuperados,dados);
 const apos=await conferirConjunto(await criarPacote(recuperados,'2026-11-09T00:00:00.000Z'),zip);assert.deepEqual(apos,report);
}finally{await db.close();}
// Executa o arquivo HTML autônomo com APIs Web reais e rede proibida.
const html=readFileSync('entregas/conferir-backups-offline.html','utf8');
assert.match(html,/connect-src 'none'/);
const dom=new JSDOM(html,{runScripts:'outside-only',url:'file:///conferir-backups-offline.html'});const w=dom.window;
try{
 Object.defineProperty(w,'crypto',{value:crypto});Object.assign(w,{Blob,Uint8Array,TextEncoder,TextDecoder});
 w.fetch=()=>{throw Error('Rede proibida');};
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];w.eval(script);
 Object.defineProperty(w.document.getElementById('cadastros'),'files',{value:[new Blob([pacote])],configurable:true});
 Object.defineProperty(w.document.getElementById('fotos'),'files',{value:[zip],configurable:true});
 w.document.getElementById('conferir').click();
 await new Promise((resolve,reject)=>{const deadline=Date.now()+3000;const tick=()=>{if(!w.document.getElementById('conferir').disabled)return resolve();if(Date.now()>deadline)return reject(Error('Timeout'));setTimeout(tick,10);};tick();});
 assert.deepEqual(JSON.parse(w.document.getElementById('resultado').textContent),report);
 assert.equal(w.document.querySelectorAll('img').length,0);
}finally{w.close();}
console.log('Conferência conjunta: ZIP + cadastros, referências faltantes/externas/privadas/ambíguas, restauração PGlite representativa e HTML offline executável sem rede aprovados (somente fixtures).');
