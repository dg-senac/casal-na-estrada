import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {testarOrigemAssinada} from '../cloudflare/testar-origem-assinada.mjs';
import {caminhoAssinadoDaUrl,buscarOrigemAssinada} from '../cloudflare/origem-assinada.mjs';
const BASE='https://pjglrlullnchqazxpvyn.supabase.co',segredo='fixture-hmac-nao-usar-em-producao-000000000000';
let manutencao=0,handler,leituras=0,admin=true,fecharDurante=false;const nonces=new Set();
const chaveEdge='fixture-chave-interna-edge-000000000000';
const edgeEnv={MIDIA_WORKER_HMAC:segredo,SUPABASE_URL:BASE,SUPABASE_SERVICE_ROLE_KEY:chaveEdge};
const redeEdge=async(url,o)=>{
 assert.equal(o.headers.Authorization,'Bearer '+chaveEdge);
 if(url.endsWith('origem_worker_consumir_nonce')){const {valor}=JSON.parse(o.body);if(nonces.has(valor))return Response.json(false);nonces.add(valor);return Response.json(true);}
 if(url.endsWith('origem_worker_foto_publicada'))return Response.json(true);
 leituras++;if(fecharDurante)manutencao=1;return new Response(new Uint8Array([255,216,255,0]),{headers:{'Content-Type':'image/jpeg'}});
};
vm.runInNewContext(readFileSync('supabase/functions/midia-worker/index.js','utf8'),{Deno:{serve:fn=>handler=fn,env:{get:n=>edgeEnv[n]}},crypto,TextEncoder,TextDecoder,Response,Request,URL,Uint8Array,AbortController,setTimeout,clearTimeout,fetch:redeEdge});
const token='h.'+Buffer.from(JSON.stringify({sub:'fixture',aal:'aal2'})).toString('base64url')+'.s';
const env={MIDIA_WORKER_HMAC:segredo,SUPABASE_URL:BASE,SUPABASE_ANON_KEY:'sb_publishable_fixture',DB:{prepare:sql=>{assert.match(sql,/^SELECT manutencao/);return {first:async()=>({manutencao})};}}};
const rede=async(url,o)=>{
 assert.equal(new URL(url).origin,BASE);assert.equal(o.redirect,'manual');
 if(url.endsWith('/auth/v1/user'))return Response.json({id:'fixture'});
 if(url.endsWith('/estado_acesso_painel'))return Response.json({autorizado:admin,mfa_necessario:false});
 if(url.includes('/rest/v1/posts?')){assert.match(url,/data=lte\.\d{4}-\d{2}-\d{2}/);assert.equal(o.headers.apikey,'sb_publishable_fixture');return Response.json([{capa_url:BASE+'/storage/v1/object/public/midia/foto.jpg'}]);}
 assert(url.includes('/functions/v1/midia-worker/'));assert.equal(o.headers?.Authorization,undefined);assert.equal(o.headers?.apikey,undefined);return handler(new Request(url,o));
};
const request=()=>new Request('https://site.invalid/api/testar-origem-assinada',{method:'POST',headers:{Origin:'https://site.invalid',Authorization:'Bearer '+token}});
let r=await testarOrigemAssinada(request(),env,rede);assert.equal(r.status,200);assert.match(await r.text(),/4 bytes, image\/jpeg.*HTTP 403/);assert.equal(leituras,1);assert.equal(manutencao,0);
assert.equal((await testarOrigemAssinada(request(),{...env,MIDIA_WORKER_HMAC:'errado-mas-longo-para-passar-o-limite-00000'},rede)).status,503);
admin=false;assert.equal((await testarOrigemAssinada(request(),env,rede)).status,403);admin=true;
manutencao=1;const antes=leituras;assert.equal((await testarOrigemAssinada(request(),env,rede)).status,409);assert.equal(leituras,antes);manutencao=0;
fecharDurante=true;assert.equal((await testarOrigemAssinada(request(),env,rede)).status,503);fecharDurante=false;manutencao=0;
const errada=request();errada.headers.set('Origin','https://externo.invalid');assert.equal((await testarOrigemAssinada(errada,env,rede)).status,403);
assert.equal((await testarOrigemAssinada(new Request('https://site.invalid/api/testar-origem-assinada'),env,rede)).status,405);
for(const url of ['https://externo.invalid/foto.jpg',BASE+'/storage/v1/object/public/midia/foto.jpg?token=1',BASE+'/storage/v1/object/public/midia/a%2fb.jpg'])assert.equal(caminhoAssinadoDaUrl(url),null);
assert.equal(caminhoAssinadoDaUrl(BASE+'/storage/v1/object/public/midia/foto.jpg'),'/midia-worker/midia/foto.jpg');
await assert.rejects(buscarOrigemAssinada('/midia-worker/outro/foto.jpg',env,rede));
console.log('Canal assinado LOCAL integrado ao bundle Edge: assinatura aceita e pedido sem assinatura negado, segredo errado/auth/Origin/manutenção negados; sem chave interna no Worker, sem backup ou escrita de estado. HTTP/SQL da Edge simulados.');
