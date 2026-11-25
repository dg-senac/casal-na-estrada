// Executa as instruções SQL reais do wrapper em SQLite isolado, não no D1 remoto.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {controlarOperacao} from '../experiments/emergencia/controle-operacoes.mjs';
const pasta=mkdtempSync(join(tmpdir(),'controle-sqlite-')),arquivo=join(pasta,'teste.sqlite');
const python=`import sqlite3,json,sys
c=sqlite3.connect(sys.argv[1]);c.row_factory=sqlite3.Row
p=json.load(sys.stdin)
try:
 if p.get('script'):
  c.executescript(p['script']);saida=[]
 else:
  saida=[]
  with c:
   for s in p['statements']:
    cur=c.execute(s['sql'],s.get('args',[]))
    linhas=[dict(r) for r in cur.fetchall()] if cur.description else []
    saida.append({'success':True,'meta':{'changes':max(0,cur.rowcount)},'rows':linhas})
 print(json.dumps(saida))
finally:c.close()`;
function sql(statements){const r=spawnSync('python3',['-c',python,arquivo],{input:JSON.stringify(statements),encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return JSON.parse(r.stdout);}
function statement(query,args=[]){return {sql:query,args,bind(...v){return statement(query,v);},async run(){return sql({statements:[this]})[0];},async first(){return sql({statements:[this]})[0].rows[0]||null;}};}
const db={prepare:q=>statement(q),batch:async s=>sql({statements:s})};
const env={DB:db,SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_ficticia'};
const token='h.'+Buffer.from(JSON.stringify({sub:'admin-ficticio',aal:'aal2'})).toString('base64url')+'.s';
const req=(path='/api/emergencia-real')=>new Request('https://teste.invalid'+path,{method:'POST',headers:{Origin:'https://teste.invalid',Authorization:'Bearer '+token,'X-Teste-Id':crypto.randomUUID()}});
const fetcher=async u=>Response.json(u.endsWith('/user')?{id:'admin-ficticio'}:{autorizado:true,mfa_necessario:false});
try{
 sql({script:readFileSync('experiments/emergencia/controle-operacoes-d1.sql','utf8')});
 let sinal,soltar;const iniciou=new Promise(r=>sinal=r),aguardar=new Promise(r=>soltar=r);
 const primeira=controlarOperacao(req(),env,async()=>{sinal();await aguardar;return new Response('ok');},fetcher);
 await iniciou;
 let indevida=false;
 assert.equal((await controlarOperacao(req('/api/reabrir-teste'),env,()=>{indevida=true;return new Response('não');},fetcher)).status,409);
 assert.equal(indevida,false);
 const trava=await db.prepare('select * from controle_operacoes').first();assert(trava.operacao_id);
 // Prazo passado não autoriza roubo da trava.
 await db.prepare('update controle_operacoes set expira_em=0').run();
 assert.equal((await controlarOperacao(req('/api/emergencia-teste'),env,()=>{throw Error('não executar');},fetcher)).status,409);
 soltar();assert.equal((await primeira).status,200);
 assert.equal((await db.prepare('select * from controle_operacoes').first()).operacao_id,null);
 const historico=sql({statements:[{sql:'select * from historico_operacoes order by rowid'}]})[0].rows;
 assert.deepEqual(historico.map(r=>r.resultado),['iniciada','concluida']);assert.equal(historico[0].operacao_id,historico[1].operacao_id);
 // SQL transacional real: falhar conclusão preserva trava e não grava fim parcial.
 sql({script:"CREATE TRIGGER simular_falha_final BEFORE INSERT ON historico_operacoes WHEN NEW.resultado <> 'iniciada' BEGIN SELECT RAISE(ABORT,'falha fictícia'); END;"});
 assert.equal((await controlarOperacao(req('/api/reabrir-teste'),env,async()=>new Response('ok'),fetcher)).status,503);
 assert((await db.prepare('select * from controle_operacoes').first()).operacao_id);
 assert.equal(sql({statements:[{sql:"select count(*) as n from historico_operacoes where resultado='concluida'"}]})[0].rows[0].n,1);
 // Recuperação apenas da fixture de teste, NUNCA aplicada a ambiente hospedado.
 sql({script:'DROP TRIGGER simular_falha_final;UPDATE controle_operacoes SET operacao_id=NULL,usuario_id=NULL,expira_em=0;'});
 assert.equal((await controlarOperacao(req(),env,async()=>new Response('backup falhou',{status:503}),fetcher)).status,503);
 assert.equal((await db.prepare('select * from controle_operacoes').first()).operacao_id,null);
 assert.equal(sql({statements:[{sql:'select resultado from historico_operacoes order by rowid desc limit 1'}]})[0].rows[0].resultado,'falhou');
 // Teto do histórico: não executa mutação se não puder registrar início.
 sql({script:"WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<998) INSERT INTO historico_operacoes(id,operacao_id,usuario_id,acao,resultado) SELECT 'limite-'||x,'ficticio','ficticio','reabrir_teste','concluida' FROM n;"});
 indevida=false;assert.equal((await controlarOperacao(req(),env,()=>{indevida=true;return new Response('não');},fetcher)).status,503);assert.equal(indevida,false);
 console.log('SQLite real isolado: SQL de trava, concorrência controlada entre requisições, prazo sem roubo, histórico, rollback transacional da conclusão, falha e limite aprovados. Não é teste hospedado de D1.');
}finally{rmSync(pasta,{recursive:true,force:true});}
