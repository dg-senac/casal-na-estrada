import assert from 'node:assert/strict';
import worker from '../experiments/emergencia/worker-download-teste.mjs';
const env={SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_ficticia',DB:{prepare:()=>({first:async()=>({manutencao:1})})}};
const req=(p,opts={})=>new Request('https://teste.invalid'+p,opts);
const r=await worker.fetch(req('/login-teste'),env);assert.equal(r.status,200);
const html=await r.text();assert.match(html,/id="baixar"/);new Function(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1]);
assert.equal((await worker.fetch(req('/api/exportar-editorial'),env)).status,405);
assert.equal((await worker.fetch(req('/api/exportar-editorial',{method:'POST',headers:{Origin:'https://teste.invalid'}}),env)).status,403);
assert.equal((await worker.fetch(req('/'),env)).status,503);
const original=globalThis.fetch;
const token='header.'+Buffer.from(JSON.stringify({aal:'aal2',sub:'ficticio'})).toString('base64url')+'.assinatura';
const dados=Object.fromEntries(['posts','albuns','trofeus','encontros','album_fotos','album_videos','trofeu_fotos'].map(t=>[t,[]]));
globalThis.fetch=async url=>Response.json(url.endsWith('/user')?{id:'ficticio'}:url.endsWith('/estado_acesso_painel')?{autorizado:true,mfa_necessario:false}:{versaoCaptura:1,capturadoEm:'2026-11-09T12:00:00.000Z',dados,contagens:Object.fromEntries(Object.keys(dados).map(t=>[t,0]))});
try{
 const resp=await worker.fetch(req('/api/exportar-editorial',{method:'POST',headers:{Origin:'https://teste.invalid',Authorization:'Bearer '+token}}),env);
 assert.equal(resp.status,200);assert.match(resp.headers.get('Content-Disposition'),/attachment/);
 assert.equal((await resp.json()).carga.versao,1);
}finally{globalThis.fetch=original;}
console.log('Bundle: script do navegador válido, download negado sem credenciais, download com mocks válido e manutenção preservada.');
