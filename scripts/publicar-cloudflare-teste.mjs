/** Publicação MANUAL somente após consentimento; não é chamada por CI. */
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if(process.argv[2]!=='--confirmar-teste-paralelo')throw Error('Publicação exige --confirmar-teste-paralelo e aprovação do usuário.');
const marca=JSON.parse(readFileSync('dist/_build-teste.json','utf8'));
if(marca.fonteConteudo!=='worker-assinado' || marca.fixture!==false || marca.destino!=='cloudflare-teste' || marca.site!=='https://casal-na-estrada-site-teste.douglasmarista02.workers.dev')throw Error('Build inválido/fixture. Refaça o build sem dados fictícios.');
const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.jsonc'],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
if (r.error) console.error(r.error.message);
process.exit(r.status === 0 ? 0 : (r.status || 1));
