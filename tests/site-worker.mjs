import assert from 'node:assert/strict';
import worker from '../cloudflare/site-worker.mjs';
let manutencao=0,falha=false,acessos=0;
const env={DB:{prepare(sql){assert.equal(sql,'SELECT manutencao FROM estado_site WHERE id = 1');return {first:async()=>{if(falha)throw Error('offline');return {manutencao};}};}},ASSETS:{fetch:async()=>{acessos++;return new Response('<h1>Página fictícia</h1>',{headers:{'Content-Type':'text/html','Cache-Control':'public, max-age=86400'}});}}};
for(const path of ['/','/sobre/','/admin/','/_astro/app.js','/rss.xml','/media/foto.jpg','/encontros/','/buscar/']){
 const r=await worker.fetch(new Request('https://teste.invalid'+path),env);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('X-Robots-Tag'),path.startsWith('/admin')?'noindex, nofollow':null);
}
manutencao=1;const antes=acessos;
for(const path of ['/','/admin/','/_astro/app.js','/rss.xml','/media/foto.jpg','/404.html','/sobre/index.html','/casal-na-estrada/']){
 const r=await worker.fetch(new Request('https://teste.invalid'+path),env);assert.equal(r.status,503);assert.equal(r.headers.get('Cache-Control'),'no-store');
}
assert.equal(acessos,antes);
manutencao=0;falha=true;assert.equal((await worker.fetch(new Request('https://teste.invalid/'),env)).status,503);assert.equal(acessos,antes);falha=false;
assert.equal((await worker.fetch(new Request('https://teste.invalid/',{method:'POST'}),env)).status,405);
assert.equal((await worker.fetch(new Request('https://teste.invalid/api/inexistente'),env)).status,404);
const painelEnv={...env,SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_ficticia'};
manutencao=1;assert.equal((await worker.fetch(new Request('https://teste.invalid/login-teste'),painelEnv)).status,200);
assert.equal((await worker.fetch(new Request('https://teste.invalid/api/reabrir-teste'),painelEnv)).status,405);
console.log('Site paralelo: asset normal, bloqueio anterior a páginas/JS/imagens/feed/admin, falha fechada, painel de recuperação preservado e noindex/no-store aprovados. Não bloqueia origem Pages ou Supabase.');

const publicoEnv={...env,PUBLIC_SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_ficticia'};
assert.equal((await worker.fetch(new Request('https://teste.invalid/login-teste'),publicoEnv)).status,200);
console.log('Runtime: nomes PUBLIC_* já cadastrados também abrem painel, sem reduzir autorização.');
