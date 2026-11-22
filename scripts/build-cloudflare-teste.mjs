import {spawnSync} from 'node:child_process';
import {writeFileSync,rmSync} from 'node:fs';
// Não deixar marca antiga autorizar deploy se a nova compilação falhar.
rmSync('dist/_build-teste.json',{force:true});
const fixture=process.argv.includes('--fixture-local');
if(process.env.DADOS_FIXTURE&&!fixture)throw Error('Publicação Cloudflare recusada: DADOS_FIXTURE presente.');
const site='https://casal-na-estrada-site-teste.douglasmarista02.workers.dev';
if(!fixture && (!process.env.PUBLIC_SUPABASE_URL || !process.env.PUBLIC_SUPABASE_ANON_KEY))throw Error('Configure as duas variáveis PUBLIC_SUPABASE_* de build, somente chave pública.');
const gerar=spawnSync(process.execPath,['experiments/emergencia/gerar-worker-controle.mjs'],{stdio:'inherit'});
if(gerar.status!==0)process.exit(gerar.status||1);
if(!fixture && (process.env.PUBLIC_SUPABASE_URL.replace(/\/$/,'')!=='https://pjglrlullnchqazxpvyn.supabase.co' || !process.env.PUBLIC_SUPABASE_ANON_KEY.startsWith('sb_publishable_') || process.env.PUBLIC_SUPABASE_ANON_KEY!==process.env.PUBLIC_SUPABASE_ANON_KEY.trim()))throw Error('Build de teste exige URL correta e chave pública Publishable, sem espaços. Nunca usar chave secreta.');
const env={...process.env,SITE_BASE:'/',SITE_URL:site,...(fixture?{DADOS_FIXTURE:'scripts/dados-exemplo.json'}:{})};
const r=spawnSync(process.execPath,['node_modules/astro/bin/astro.mjs','build'],{stdio:'inherit',env});
if(r.status!==0)process.exit(r.status||1);
writeFileSync('dist/_build-teste.json',JSON.stringify({destino:'cloudflare-teste',fixture,site}));
console.log(fixture?'BUILD DE FIXTURE — NÃO PUBLICAR.':'Build paralelo pronto. Não houve deploy.');
