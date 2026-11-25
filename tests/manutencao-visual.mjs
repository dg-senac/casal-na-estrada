import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import worker from '../cloudflare/site-worker.mjs';
const env={DB:{prepare:()=>({first:async()=>({manutencao:1})})},ASSETS:{fetch:()=>{throw Error('Não acessar assets bloqueados');}}};
const r=await worker.fetch(new Request('https://site.invalid/'),env);assert.equal(r.status,503);assert.equal(r.headers.get('Retry-After'),'300');assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow');
const dom=new JSDOM(await r.text());try{const d=dom.window.document;assert.match(d.querySelector('h1').textContent,/Parada técnica/);assert.equal(d.querySelector('a').href,'https://instagram.com/casal_naestrada2.4');assert.equal(d.querySelectorAll('script,iframe,img,link').length,0);const nonce=d.querySelector('style').getAttribute('nonce');assert(nonce);assert(r.headers.get('Content-Security-Policy').includes("style-src 'nonce-"+nonce+"'"));assert(!r.headers.get('Content-Security-Policy').includes('unsafe-inline'));assert.match(d.querySelector('style').textContent,/data:font\/woff2;base64/);}finally{dom.window.close();}
console.log('Manutenção: 503/no-store/retry/noindex preservados, CSS nonce, fonte embutida, sem assets ou scripts e Instagram correto.');
