import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const texto=readFileSync('src/lib/supabase.ts','utf8').replaceAll('import.meta.env.PUBLIC_SUPABASE_URL',"''").replaceAll('import.meta.env.PUBLIC_SUPABASE_ANON_KEY',"''");
const codigo=ts.transpileModule(texto,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let leituras=0;
function montar(falhar=false){const exports={};vm.runInNewContext(codigo,{exports,process:{env:{CONTEUDO_BUILD_URL:'https://casal-na-estrada-site-teste.douglasmarista02.workers.dev/conteudo-build.json'}},require:n=>{if(n==='./conteudo-build.js')return {lerConteudoBuild:async()=>{leituras++;if(falhar)throw Error('canal fora');return {posts:[{id:'fixture'}],albuns:[],trofeus:[],encontros:[]};}};if(n==='node:fs/promises')return {readFile:()=>{throw Error('fixture não permitida');}};throw Error(n);},fetch:()=>{throw Error('NÃO pode usar REST direto como fallback');}});return exports;}
const modulo=montar();assert.equal((await modulo.consultar('posts?select=*&publicado=eq.true'))[0].id,'fixture');await modulo.consultar('albuns?select=*');assert.equal(leituras,1);await assert.rejects(modulo.consultar('administradores?select=*'));
await assert.rejects(montar(true).consultar('posts?select=*'),/canal fora/);
console.log('Leitor real supabase.ts transp compilado: canal configurado usado uma vez/cache, tabela fora do escopo negada e falha não cai no REST público. Ambiente simulado.');

const {validarConteudoPublicado}=await import('../src/lib/conteudo-build.js');
let arquivos=0;
function snapshot(invalido=false){const exports={};vm.runInNewContext(codigo,{exports,process:{env:{CONTEUDO_BUILD_URL:'canal',CONTEUDO_BUILD_SNAPSHOT:'/temporario/publicado.json'}},require:n=>n==='./conteudo-build.js'?{validarConteudoPublicado,lerConteudoBuild:()=>{throw Error('snapshot não pode reler rede');}}:{readFile:async()=>{arquivos++;return invalido?'{}':JSON.stringify({versao:1,posts:[{id:'mesmo-do-manifesto',publicado:true}],albuns:[],trofeus:[],encontros:[]});}},fetch:()=>{throw Error('sem fallback');}});return exports;}
const exato=snapshot();assert.equal((await exato.consultar('posts'))[0].id,'mesmo-do-manifesto');await exato.consultar('albuns');assert.equal(arquivos,1);await assert.rejects(snapshot(true).consultar('posts'),/incompatível/);
console.log('Snapshot do build: conteúdo validado usado no manifesto é o mesmo do Astro, leitura única, inválido falha sem rede/fallback.');
