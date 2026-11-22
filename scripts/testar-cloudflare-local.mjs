import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const pasta=mkdtempSync(join(tmpdir(),'bundle-cloudflare-'));
function rodar(args,extras={}){
 const r=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',...extras}});
 if(r.status!==0)throw Error('Teste Cloudflare falhou: '+args.join(' '));
}
try{
 rodar(['experiments/emergencia/gerar-worker-controle.mjs']);
 rodar(['tests/site-worker.mjs']);
 rodar(['scripts/build-cloudflare-teste.mjs','--fixture-local']);
 rodar(['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.jsonc','--dry-run','--outdir',pasta]);
 rodar(['tests/cloudflare-runtime.mjs'],{CLOUDFLARE_BUNDLE:join(pasta,'site-worker.js')});
 console.log('Preparação LOCAL aprovada. dist contém fixture: NÃO publicar. Nenhum deploy realizado.');
}finally{rmSync(pasta,{recursive:true,force:true});}
