import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {assinarOrigem} from '../experiments/emergencia/assinatura-origem.mjs';
let handler,leituras=0;const usados=new Set(),segredo='fixture-segredo-apenas-no-teste-000000000000';
const env={MIDIA_WORKER_HMAC:segredo,SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-chave-interna-nao-real-0000000000'};
const contexto={Deno:{env:{get:n=>env[n]},serve:fn=>handler=fn},crypto,TextEncoder,TextDecoder,Response,Request,URL,Uint8Array,AbortController,setTimeout,clearTimeout,fetch:async(url,o)=>{
 assert.equal(o.headers.Authorization,'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY);
 if(url.endsWith('/origem_worker_consumir_nonce')){const {valor}=JSON.parse(o.body);if(usados.has(valor))return Response.json(false);usados.add(valor);return Response.json(true);}
 if(url.endsWith('/origem_worker_foto_publicada'))return Response.json(true);
 leituras++;return new Response(new Uint8Array([255,216,255]),{headers:{'Content-Type':'image/jpeg'}});
}};
vm.runInNewContext(readFileSync('supabase/functions/midia-worker/index.js','utf8'),contexto);
for(const prefixo of ['/functions/v1','']){
 const caminho='/midia-worker/midia/fixture.jpg',headers=await assinarOrigem({segredo,caminho});
 const r=await handler(new Request('https://pjglrlullnchqazxpvyn.supabase.co'+prefixo+caminho,{headers}));assert.equal(r.status,200);assert.equal((await r.arrayBuffer()).byteLength,3);
}
assert.equal(leituras,2);
let req=new Request('https://pjglrlullnchqazxpvyn.supabase.co/functions/v1/midia-worker/midia/fixture.jpg');assert.equal((await handler(req)).status,403);
delete env.MIDIA_WORKER_HMAC;assert.equal((await handler(req)).status,503);assert.equal(leituras,2);
console.log('Bundle Edge isolado: handlers com/sem prefixo de gateway, HMAC compatível, bytes fictícios, unsigned negado e configuração ausente fecha acesso. Deno/HTTP simulados, sem chamada remota.');
