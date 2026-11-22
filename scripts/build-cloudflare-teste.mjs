import {spawnSync} from 'node:child_process';
import {writeFileSync,rmSync,readFileSync} from 'node:fs';
// Não deixar marca antiga autorizar deploy se a nova compilação falhar.
rmSync('dist/_build-teste.json',{force:true});
const fixture=process.argv.includes('--fixture-local');
if(process.env.DADOS_FIXTURE&&!fixture)throw Error('Publicação Cloudflare recusada: DADOS_FIXTURE presente.');
const site='https://casal-na-estrada-site-teste.douglasmarista02.workers.dev';
const publica=JSON.parse(readFileSync('cloudflare/supabase-publico.json','utf8'));
const endereco=process.env.PUBLIC_SUPABASE_URL ?? publica.url;
const chave=process.env.PUBLIC_SUPABASE_ANON_KEY ?? publica.anonKey;
const anonLegada=()=>{try{const c=JSON.parse(Buffer.from(chave.split('.')[1],'base64url'));return c.role==='anon' && c.ref==='pjglrlullnchqazxpvyn';}catch{return false;}};
const gerar=spawnSync(process.execPath,['experiments/emergencia/gerar-worker-controle.mjs'],{stdio:'inherit'});
if(gerar.status!==0)process.exit(gerar.status||1);
if(!fixture && (endereco.replace(/\/$/,'')!==publica.url || chave!==chave.trim() || !(chave.startsWith('sb_publishable_') || anonLegada())))throw Error('Build exige URL do projeto e chave pública Publishable ou anon. Nunca usar chave secreta.');
const env={...process.env,PUBLIC_SUPABASE_URL:endereco,PUBLIC_SUPABASE_ANON_KEY:chave,SITE_BASE:'/',SITE_URL:site,...(fixture?{DADOS_FIXTURE:'scripts/dados-exemplo.json'}:{})};
const r=spawnSync(process.execPath,['node_modules/astro/bin/astro.mjs','build'],{stdio:'inherit',env});
if(r.status!==0)process.exit(r.status||1);
writeFileSync('dist/_build-teste.json',JSON.stringify({destino:'cloudflare-teste',fixture,site}));
console.log(fixture?'BUILD DE FIXTURE — NÃO PUBLICAR.':'Build paralelo pronto. Não houve deploy.');
