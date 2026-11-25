import assert from 'node:assert/strict';
import { criarServidor, acionarEmergencia } from '../experiments/emergencia/worker.mjs';
let ativo=false;const copias=new Map();const eventos=[];
const estado={ativo:async()=>ativo,ativar:async()=>{ativo=true;eventos.push('bloqueio');}};
let acessos=0;
const app=criarServidor({estado,assets:{fetch:async()=>{acessos++;return new Response('conteúdo fictício');}}});
const req=p=>new Request('https://teste.invalid'+p);
assert.equal((await app.fetch(req('/'))).status,200);
const snapshots={criarSemSobrescrever:async(id,conteudo)=>{if(copias.has(id))throw Error('duplicado');copias.set(id,conteudo);}};
const args={estado,snapshots,id:'incidente-1',lerDados:async()=>{assert(ativo);eventos.push('leitura');return {encontros:[{nome:'Fictício'}]};}};
assert.deepEqual(await acionarEmergencia(args),{manutencao:true,backup:'concluido'});
assert.deepEqual(eventos,['bloqueio','leitura']);
for(const path of ['/','/admin','/diario/exemplo/','/_astro/app.js','/rss.xml','/media/foto.jpg','/api/teste']){
 const r=await app.fetch(req(path));assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');
}
assert.equal(acessos,1);
const original=copias.get('incidente-1');
assert.equal((await acionarEmergencia(args)).backup,'falhou');assert.equal(copias.get('incidente-1'),original);assert(ativo);
assert.equal((await acionarEmergencia({...args,id:'incidente-2',lerDados:async()=>{throw Error('rede');}})).backup,'falhou');assert(ativo);
const restaurado=JSON.parse(original);assert.equal(restaurado.dados.encontros[0].nome,'Fictício');
const quebrado=criarServidor({estado:{ativo:async()=>{throw Error('offline');}},assets:{fetch:()=>{throw Error('não deve servir');}}});
assert.equal((await quebrado.fetch(req('/'))).status,503);
await assert.rejects(acionarEmergencia({...args,estado:{ativar:async()=>{throw Error('offline');}}}));
ativo=false;assert.equal((await app.fetch(req('/'))).status,200);
console.log('Protótipo local: bloqueio antes do snapshot, todas as rotas, falha fechada, backup com falha sem reabrir, não sobrescrita e leitura de recuperação aprovados.');
console.log('Não valida Cloudflare, autenticação, armazenamento durável nem backup real do Supabase.');
