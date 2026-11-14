// Smoke test somente leitura. Nenhum objeto ou registro é criado.
import assert from 'node:assert/strict';
const base=process.env.PUBLIC_SUPABASE_URL;
if(!base) throw Error('PUBLIC_SUPABASE_URL é obrigatório.');
for (const caminho of ['invalido','v1/00000000-0000-0000-0000-000000000000.webp']) {
 const r=await fetch(`${base}/functions/v1/foto-publicada/${caminho}`,{signal:AbortSignal.timeout(20000)});
 assert.equal(r.status,404,`Endpoint deve negar caminho inexistente: ${caminho}`);
 assert.equal(r.headers.get('cache-control'),'no-store');
}
console.log('Endpoint real: função acessível sem login, caminhos inválido/inexistente negados, cache no-store OK.');
