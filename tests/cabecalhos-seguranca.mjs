import assert from 'node:assert/strict';
import {protegerResposta} from '../cloudflare/cabecalhos-seguranca.mjs';
const html='<html><script>console.log("fixture")</script><script src="/app.js"></script></html>';
const req=new Request('https://site.invalid/');
const r=await protegerResposta(new Response(html,{headers:{'Content-Type':'text/html'}}),req,{SUPABASE_URL:'https://projeto.supabase.co'},true);
const csp=r.headers.get('Content-Security-Policy');
const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('console.log("fixture")'))).toString('base64');
assert.ok(csp.includes(`'sha256-${hash}'`));
assert.match(csp,/frame-ancestors 'none'/);
assert.ok(!csp.split(';').find(s=>s.trim().startsWith('script-src')).includes('unsafe-inline'));
assert.match(csp,/connect-src 'self' https:\/\/projeto.supabase.co wss:\/\/projeto.supabase.co/);
assert.equal(await r.text(),html);
for(const status of [200,302,404,503]) {
 const x=await protegerResposta(new Response('fixture',{status}),req);
 assert.equal(x.status,status);
 assert.equal(x.headers.get('X-Frame-Options'),'DENY');
 assert.equal(x.headers.get('Strict-Transport-Security'),'max-age=31536000');
 assert.match(x.headers.get('Permissions-Policy'),/camera=\(\)/);
}
const existing="default-src 'none'; style-src 'nonce-fixture'";
const x=await protegerResposta(new Response('fixture',{headers:{'Content-Type':'text/html','Content-Security-Policy':existing}}),req,{},true);
assert.equal(x.headers.get('Content-Security-Policy'),existing);
console.log('Cabeçalhos, hashes CSP e preservação de políticas existentes: OK');

// Confere a saída real do build de fixture, não apenas o fonte Astro.
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
if (fs.existsSync('dist/index.html')) {
 const document = new JSDOM(fs.readFileSync('dist/index.html','utf8')).window.document;
 for (const figure of document.querySelectorAll('figure')) {
  const caption = figure.querySelector(':scope > figcaption');
  if (caption) assert.ok(caption === figure.firstElementChild || caption === figure.lastElementChild, 'figcaption deve estar no início ou fim');
 }
 for (const img of document.querySelectorAll('img')) {
  assert.ok(img.hasAttribute('src') || img.hasAttribute('srcset'), 'Imagem precisa de fonte');
  if (img.hasAttribute('sizes')) assert.ok(img.hasAttribute('srcset'), 'sizes requer srcset');
 }
 console.log('HTML gerado: figcaption, sizes/srcset e fontes de imagens OK');
}
