import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(fs.readFileSync('scripts/lembrancas-email-25nov2026.json'));
assert.equal(manifest.pecas.length, 26);
assert.equal(new Set(manifest.pecas.map(p => p.slug)).size, 26);
assert.equal(manifest.pecas.filter(p => p.operacao === 'update').length, 2);
for (const p of manifest.pecas) {
  const bytes = fs.readFileSync(`public/media/trofeus/email-lembrancas-25nov2026/${p.arquivo}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), p.sha256);
}
const page = fs.readFileSync('src/pages/trofeus.astro', 'utf8');
assert.match(page, /trofeus\.filter\(\(t\) => t !== lego\)/);
assert.match(page, /<PainelLego peca=\{lego\}/);
const painel = fs.readFileSync('src/components/PainelLego.astro', 'utf8');
assert.match(painel, /object-fit:contain/);
assert.match(painel, /filter:none/);
assert.match(painel, /var\(--serif\)/);
console.log('26 imagens íntegras; 24 novas lembranças e 2 atualizações preparadas; LEGO sem duplicação.');
