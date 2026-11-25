import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {configurarCanalBuild} from '../scripts/ambiente-conteudo-build.mjs';
import {URL_CONTEUDO_BUILD} from '../src/lib/conteudo-build.js';
const original={CONTEUDO_BUILD_URL:'https://externo.invalid',PUBLIC_SUPABASE_URL:'config-admin',PUBLIC_SUPABASE_ANON_KEY:'chave-publica-admin'};
const real=configurarCanalBuild(original);
assert.equal(real.CONTEUDO_BUILD_URL,URL_CONTEUDO_BUILD);assert.equal(real.PUBLIC_SUPABASE_URL,'config-admin');assert.equal(real.PUBLIC_SUPABASE_ANON_KEY,'chave-publica-admin');
assert.equal(original.CONTEUDO_BUILD_URL,'https://externo.invalid');assert.equal(configurarCanalBuild(original,{fixture:true}).CONTEUDO_BUILD_URL,'');
const fonte=readFileSync('scripts/build-cloudflare-teste.mjs','utf8');assert.match(fonte,/const env=configurarCanalBuild/);assert.match(fonte,/fonteConteudo:fixture\?'fixture':'worker-assinado'/);
assert.match(readFileSync('scripts/publicar-cloudflare-teste.mjs','utf8'),/marca\.fonteConteudo!=='worker-assinado'/);
// O workflow Pages não ativa o novo canal nem muda de hospedagem.
assert.equal(existsSync('.github/workflows/deploy.yml'),false); // Pages foi retirado; não reativar no merge.
console.log('Ativação build: URL fixa do Worker sobrepõe override externo, fixture não usa rede, configuração pública admin preservada e deploy exige marca do canal novo; workflow Pages obsoleto removido.');
