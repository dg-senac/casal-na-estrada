import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import ts from 'typescript';
import { tagsEditoriais } from '../src/lib/politica-html.js';
import { sanitizarPrevia } from '../src/lib/previa-segura.js';
const compiled = ts.transpile(readFileSync('src/lib/markdown.ts','utf8'),{module:ts.ModuleKind.CommonJS});
const exp = {};
new Function('exports','require',compiled)(exp,id=>id==='marked'?{marked}:id==='sanitize-html'?{default:sanitizeHtml}:{tagsEditoriais});
const json = {};
new Function('exports',ts.transpile(readFileSync('src/lib/json-seguro.ts','utf8'),{module:ts.ModuleKind.CommonJS}))(json);
const janela = new JSDOM('').window;
const purificador = DOMPurify(janela);
const ataques = [
 '<script>window.invadido=true</script>',
 '<img src=x onerror="alert(1)">',
 '<svg onload="alert(1)"><a href="javascript:alert(1)">x</a></svg>',
 '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
 '[clique](javascript:alert%281%29)',
 '<a href="jav&#x61;script:alert(1)">link</a>',
 '<a href="java\nscript:alert(1)">link</a>',
 '<img src="data:image/svg+xml;base64,PHN2Zz4=">',
 '<form action="https://example.com"><input name="senha"></form>',
 '<p style="position:fixed;inset:0" onclick="alert(1)">texto</p>',
 '<math><mtext><img src=x onerror=alert(1)></mtext></math>',
 '<a href="vbscript:msgbox(1)">teste</a>',
];
for(const entrada of ataques) {
 for (const html of [exp.markdown(entrada), sanitizarPrevia(marked.parse(entrada),purificador)]) {
   const doc = new JSDOM(html).window.document;
   assert(!doc.querySelector('script,iframe,svg,math,form,input,style,object,embed'));
   for(const el of doc.querySelectorAll('*')) for(const a of el.attributes) {
     assert(!/^on|^style$|^srcdoc$/i.test(a.name));
     if(['href','src'].includes(a.name)) assert(!/^(?:javascript|data|vbscript):/i.test(a.value.replace(/\s/g,'')));
   }
 }
}
const seguro = '# Título\n\n**Negrito** e [link](https://example.com)\n\n![foto](/media/foto.webp)';
for(const html of [exp.markdown(seguro),sanitizarPrevia(marked.parse(seguro),purificador)]) {
 assert(html.includes('<h1>'));assert(html.includes('<strong>'));assert(html.includes('https://example.com'));
}
const dados = {titulo:'</script><script>alert(1)</script>'};
const serializado = json.jsonSeguro(dados);
assert(!serializado.includes('<')); assert.deepEqual(JSON.parse(serializado),dados);
const doc = new JSDOM(`<script type="application/ld+json">${serializado}</script>`).window.document;
assert.equal(doc.querySelectorAll('script').length,1);
console.log(`Segurança: ${ataques.length} payloads em Markdown e prévia, conteúdo legítimo e JSON-LD seguro OK.`);
const urls = {};
new Function('exports',ts.transpile(readFileSync('src/lib/url.ts','utf8').replace('import.meta.env.BASE_URL',"'/casal-na-estrada/'"),{module:ts.ModuleKind.CommonJS}))(urls);
for (const u of ['javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,teste', '//example.com', '\\example.com']) assert.equal(urls.url(u),'#');
assert.equal(urls.url('/diario'),'/casal-na-estrada/diario');
assert.equal(urls.url('https://example.com/foto.webp'),'https://example.com/foto.webp');
console.log('URLs: protocolos executáveis bloqueados, links internos e HTTPS preservados.');
