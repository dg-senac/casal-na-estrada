import assert from 'node:assert/strict';
import { cspPainel } from '../src/lib/csp-painel.js';
const politica=cspPainel('https://projeto.supabase.co/');
assert.ok(politica.includes("script-src 'self';"));
assert.ok(!politica.includes("'unsafe-eval'"));
assert.ok(politica.includes("connect-src 'self' https://projeto.supabase.co wss://projeto.supabase.co;"));
for(const entrada of ['', 'javascript:alert(1)', 'https://a:b@evil.example', "https://example.com'; script-src *"]) {
 assert.ok(cspPainel(entrada).includes("connect-src 'self';"));
}
console.log('CSP painel: scripts inline/eval negados, conexão restrita à origem configurada.');
