const ACOES=Object.freeze({'/api/emergencia-real':'emergencia_real','/api/emergencia-teste':'emergencia_teste','/api/reabrir-teste':'reabrir_teste'});
function respostaControle(texto,status){return new Response(texto,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});}
async function controlarOperacao(request,env,executar,fetchImpl=fetch){
 const url=new URL(request.url),acao=ACOES[url.pathname];
 if(!acao)return executar();
 if(request.method!=='POST')return respostaControle('Método não permitido.',405);
 if(request.headers.get('Origin')!==url.origin)return respostaControle('Origem não permitida.',403);
 if(env.SUPABASE_URL?.replace(/\/$/,'')!=='https://pjglrlullnchqazxpvyn.supabase.co' || !env.SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))return respostaControle('Configuração indisponível.',503);
 const idCliente=request.headers.get('X-Teste-Id');
 if(!idCliente || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(idCliente))return respostaControle('Identificador inválido.',400);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),10000);let acesso;
 try{acesso=await autorizar(request,{supabaseUrl:'https://pjglrlullnchqazxpvyn.supabase.co',chavePublica:env.SUPABASE_ANON_KEY},(u,o)=>fetchImpl(u,{...o,signal:ac.signal}));}finally{clearTimeout(timer);}
 if(!acesso?.autorizado)return respostaControle('Acesso negado ou validação indisponível.',403);
 const db=env.DB,operacao=crypto.randomUUID();
 try{
  const r=await db.prepare(`UPDATE controle_operacoes SET operacao_id = ?, usuario_id = ?, expira_em = unixepoch() + 120
    WHERE id = 1 AND operacao_id IS NULL`).bind(operacao,acesso.usuarioId).run();
  if(r.meta?.changes!==1)return respostaControle('Outra operação está em andamento ou a trava precisa de conferência. Nenhuma nova ação foi iniciada.',409);
 }catch{return respostaControle('Controle de operações indisponível. Nenhuma ação iniciada; confira a trava no D1.',503);}
 try{
  const r=await db.prepare(`INSERT INTO historico_operacoes (id, operacao_id, usuario_id, acao, resultado)
   SELECT ?, ?, ?, ?, 'iniciada' WHERE (SELECT count(*) FROM historico_operacoes) < 998`).bind(crypto.randomUUID(),operacao,acesso.usuarioId,acao).run();
  if(r.meta?.changes!==1)throw Error('Histórico sem capacidade');
 }catch{
  // Não libera automaticamente se o resultado da gravação for incerto.
  return respostaControle('Histórico indisponível ou cheio. Nenhuma ação iniciada. Trava preservada para conferência no D1.',503);
 }
 let resultado;
 try{resultado=await executar();if(!(resultado instanceof Response))throw Error('Resposta inválida');}
 catch{resultado=respostaControle('A operação terminou sem confirmação. Confira o estado do teste e o histórico antes de repetir.',503);}
 try{
  // D1 batch é transacional: conclusão e liberação devem ocorrer juntas.
  const lote=await db.batch([
   db.prepare(`INSERT INTO historico_operacoes (id, operacao_id, usuario_id, acao, resultado)
    VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(),operacao,acesso.usuarioId,acao,resultado.ok?'concluida':'falhou'),
   db.prepare('UPDATE controle_operacoes SET operacao_id = NULL, usuario_id = NULL, expira_em = 0 WHERE id = 1 AND operacao_id = ?').bind(operacao),
  ]);
  if(lote.length!==2 || lote.some(r=>!r.success) || lote[1].meta?.changes!==1)throw Error('Conclusão não confirmada');
 }catch{return respostaControle('Resultado da operação ou do histórico sem confirmação. A ação pode ter ocorrido. Confira estado, cópias e trava no D1; não libere a trava sem verificar.',503);}
 return resultado;
}

function respostaConferencia(texto,status=200){return new Response(texto,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});}
async function conferirBackup(request,config,db,fetchImpl=fetch){
 const url=new URL(request.url);
 if(!['/api/conferir-backup','/api/baixar-backup'].includes(url.pathname))return respostaConferencia('Não encontrado.',404);
 if(request.method!=='POST')return respostaConferencia('Método não permitido.',405);
 if(request.headers.get('Origin')!==url.origin)return respostaConferencia('Origem não permitida.',403);
 if(config?.habilitado!==true || config.supabaseUrl!=='https://pjglrlullnchqazxpvyn.supabase.co' || !config.chavePublica?.startsWith('sb_publishable_'))return respostaConferencia('Recurso indisponível.',503);
 const id=request.headers.get('X-Teste-Id');
 if(!id || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id))return respostaConferencia('ID inválido.',400);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),10000);
 let acesso;
 try{acesso=await autorizar(request,config,(u,o)=>fetchImpl(u,{...o,signal:ac.signal}));}finally{clearTimeout(timer);}
 if(!acesso?.autorizado)return respostaConferencia('Acesso negado ou validação indisponível.',403);
 try{
  const linha=await db.prepare('SELECT pacote, sha256 FROM backups_editoriais_reais WHERE id = ?').bind(id).first();
  if(!linha)return respostaConferencia('Cópia não encontrada.',404);
  if(typeof linha.pacote!=='string' || new TextEncoder().encode(linha.pacote).length>1048576)throw Error('Tamanho inválido');
  const carga=await abrirPacote(linha.pacote); // Recalcula SHA-256 e valida relações/contagens.
  if(JSON.parse(linha.pacote).sha256!==linha.sha256)throw Error('Hash de armazenamento divergente');
  if(url.pathname==='/api/baixar-backup')return new Response(linha.pacote,{headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Content-Disposition':'attachment; filename="snapshot-editorial-d1-'+id+'.json"',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',
    'Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
  }});
  const total=Object.values(carga.contagens).reduce((a,b)=>a+b,0);
  return respostaConferencia('Cópia conferida no D1. Checksum recalculado válido; sete tabelas e relações consistentes. Total: '+total+' registros. ID: '+id+'. Isso não comprova autenticidade contra invasor nem restauração de produção. Não inclui fotos.');
 }catch{return respostaConferencia('Não foi possível validar a cópia armazenada. Não a considere íntegra até investigar. Nenhum dado foi alterado.',503);}
}

function retorno(texto,status=200){return new Response(texto,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});}
async function emergenciaReal(request,config,db,fetchImpl=fetch){
 const url=new URL(request.url);
 if(url.pathname!=='/api/emergencia-real')return retorno('Não encontrado.',404);
 if(request.method!=='POST')return retorno('Método não permitido.',405);
 if(request.headers.get('Origin')!==url.origin)return retorno('Origem não permitida.',403);
 if(config?.habilitado!==true)return retorno('Recurso ainda não ativado.',503);
 if(config.supabaseUrl!=='https://pjglrlullnchqazxpvyn.supabase.co' || !config.chavePublica?.startsWith('sb_publishable_'))return retorno('Configuração indisponível.',503);
 const id=request.headers.get('X-Teste-Id');
 if(!id || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id))return retorno('Identificador inválido.',400);
 const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),10000);
 let acesso;
 try{acesso=await autorizar(request,config,(u,o)=>fetchImpl(u,{...o,signal:ac.signal}));}finally{clearTimeout(timer);}
 if(!acesso?.autorizado)return retorno('Acesso negado ou validação indisponível.',403);
 try{
   const r=await db.prepare('UPDATE estado_site SET manutencao = 1, atualizado_em = CURRENT_TIMESTAMP WHERE id = 1').run();
   if(r.meta?.changes!==1)throw Error('Estado ausente');
 }catch{return retorno('Não foi possível confirmar a manutenção. Confira o estado no D1. Backup não iniciado.',503);}
 // A partir daqui nenhuma falha reabre o ambiente.
 try{
   const anterior=await db.prepare('SELECT id, sha256 FROM backups_editoriais_reais WHERE id = ?').bind(id).first();
   if(anterior)return retorno('Manutenção do TESTE ativa. Cópia editorial real já armazenada para esta tentativa. ID: '+id);
   const capacidade=await db.prepare('SELECT count(*) AS total FROM backups_editoriais_reais').first();
   if(!capacidade || Number(capacidade.total)>=5)throw Error('Limite de cópias');
   const endpoint=new URL('/api/exportar-editorial',url.origin);
   const captura=await downloadEditorial(new Request(endpoint,{method:'POST',headers:{Origin:url.origin,Authorization:request.headers.get('Authorization')}}),config,fetchImpl);
   if(!captura.ok)throw Error('Captura indisponível');
   const texto=await captura.text();
   if(new TextEncoder().encode(texto).length>1048576)throw Error('Limite de tamanho');
   await abrirPacote(texto);
   const hash=JSON.parse(texto).sha256;
   // Uma instrução condicional mantém o teto mesmo entre requisições concorrentes.
   // Não sobrescreve nem remove cópias anteriores.
   await db.prepare(`INSERT OR IGNORE INTO backups_editoriais_reais (id, usuario_id, pacote, sha256)
     SELECT ?, ?, ?, ? WHERE (SELECT count(*) FROM backups_editoriais_reais) < 5`).bind(id,acesso.usuarioId,texto,hash).run();
   const salvo=await db.prepare('SELECT id, sha256 FROM backups_editoriais_reais WHERE id = ?').bind(id).first();
   if(!salvo)throw Error('Gravação não confirmada');
   return retorno('Manutenção do TESTE ativa. Pacote dos cadastros REAIS armazenado no D1. Não inclui fotos. ID: '+id);
 }catch{return retorno('Manutenção do TESTE ativa, mas o backup editorial real NÃO foi confirmado. O teste continua bloqueado. Verifique captura, tabela, limite de 5 cópias ou espaço. ID: '+id,503);}
}

/** Formato experimental, sem acesso à rede ou banco. Checksum NÃO é assinatura. */
const TABELAS = Object.freeze(['posts','albuns','trofeus','encontros','album_fotos','album_videos','trofeu_fotos']);
const LIMITE_BYTES = 2 * 1024 * 1024;
const encoder = new TextEncoder();
const falhar = mensagem => { throw new Error(mensagem); };
const objeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function exatas(obj, chaves) {
  if (!objeto(obj) || Object.keys(obj).sort().join('|') !== [...chaves].sort().join('|')) falhar('Estrutura inesperada');
}
function seguro(valor, nivel = 0) {
  if (nivel > 40) falhar('Profundidade excessiva');
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean') return;
  if (typeof valor === 'number' && Number.isFinite(valor) && (!Number.isInteger(valor) || Number.isSafeInteger(valor))) return;
  if (Array.isArray(valor)) { for (const item of valor) seguro(item, nivel + 1); return; }
  if (!objeto(valor) || ![Object.prototype,null].includes(Object.getPrototypeOf(valor))) falhar('Valor não JSON');
  for (const [k,v] of Object.entries(valor)) {
    if (['__proto__','constructor','prototype'].includes(k)) falhar('Chave insegura');
    seguro(v,nivel+1);
  }
}
function serializar(v) { seguro(v); return JSON.stringify(v); }
const tamanho = s => encoder.encode(s).length;
async function hash(texto) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(texto)))].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function validarDados(dados) {
  exatas(dados,TABELAS);
  for (const tabela of TABELAS) {
    const linhas = dados[tabela];
    if (!Array.isArray(linhas) || linhas.length > 10000) falhar('Quantidade inválida em '+tabela);
    const ids = new Set();
    for (const linha of linhas) {
      if (!objeto(linha) || !((typeof linha.id === 'string' && linha.id.length > 0 && linha.id.length <= 128) || (Number.isSafeInteger(linha.id) && linha.id > 0))) falhar('ID inválido em '+tabela);
      const id = String(linha.id);
      if (ids.has(id)) falhar('ID duplicado em '+tabela);
      ids.add(id);
    }
  }
  for (const [filha,pai,fk] of [['album_fotos','albuns','album_id'],['album_videos','albuns','album_id'],['trofeu_fotos','trofeus','trofeu_id']]) {
    const pais = new Set(dados[pai].map(l=>String(l.id)));
    for (const linha of dados[filha]) if (linha[fk] === undefined || linha[fk] === null || !pais.has(String(linha[fk]))) falhar('Referência ausente em '+filha);
  }
}
async function criarPacote(dados, criadoEm = new Date().toISOString()) {
  // Clona para impedir que alterações posteriores modifiquem o snapshot.
  const texto = serializar(dados);
  if (tamanho(texto) > LIMITE_BYTES) falhar('Pacote acima do limite');
  const copia = JSON.parse(texto);
  validarDados(copia);
  const carga = { versao:1, tipo:'snapshot-editorial-incidente', criadoEm,
    escopo:'sete-tabelas-editoriais-sem-arquivos-sem-auth',
    contagens:Object.fromEntries(TABELAS.map(t=>[t,copia[t].length])), dados:copia };
  if (typeof criadoEm !== 'string' || !Number.isFinite(Date.parse(criadoEm)) || new Date(criadoEm).toISOString() !== criadoEm) falhar('Data inválida');
  const pacote = { carga, sha256:await hash(serializar(carga)) };
  const resultado = serializar(pacote);
  if (tamanho(resultado) > LIMITE_BYTES) falhar('Pacote acima do limite');
  return resultado;
}
async function abrirPacote(texto) {
  if (typeof texto !== 'string' || tamanho(texto) > LIMITE_BYTES) falhar('Arquivo inválido ou acima do limite');
  const pacote = JSON.parse(texto);
  seguro(pacote);
  exatas(pacote,['carga','sha256']);
  exatas(pacote.carga,['versao','tipo','criadoEm','escopo','contagens','dados']);
  const c = pacote.carga;
  if (c.versao !== 1 || c.tipo !== 'snapshot-editorial-incidente' || c.escopo !== 'sete-tabelas-editoriais-sem-arquivos-sem-auth') falhar('Versão ou escopo incompatível');
  if (typeof pacote.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(pacote.sha256) || await hash(serializar(c)) !== pacote.sha256) falhar('Checksum divergente');
  if (typeof c.criadoEm !== 'string' || !Number.isFinite(Date.parse(c.criadoEm)) || new Date(c.criadoEm).toISOString() !== c.criadoEm) falhar('Data inválida');
  validarDados(c.dados);
  exatas(c.contagens,TABELAS);
  for (const t of TABELAS) if (c.contagens[t] !== c.dados[t].length) falhar('Contagem divergente em '+t);
  return c;
}
async function prepararRecuperacaoIsolada(texto) {
  const {dados} = await abrirPacote(texto);
  // Somente representação em memória. Não executa SQL, não faz upsert em produção.
  return TABELAS.map(tabela=>({tabela,linhas:structuredClone(dados[tabela])}));
}

/** Preparação modular, NÃO instalada no Worker. */
const ORIGEM = 'https://pjglrlullnchqazxpvyn.supabase.co';
const MAX_CAPTURA = 1572864;
function respostaDownload(texto,status) {
 return new Response(texto,{status,headers:{'Content-Type':'text/plain; charset=utf-8',
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"}});
}
async function lerLimitado(r) {
 if(!r.body)throw Error('Resposta vazia');
 const reader=r.body.getReader(),partes=[];let total=0;
 try{
   while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_CAPTURA)throw Error('Limite excedido');partes.push(value);}
 }catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let pos=0;for(const p of partes){bytes.set(p,pos);pos+=p.byteLength;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes));
}
function exatasDownload(v,chaves){return v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).sort().join('|')===[...chaves].sort().join('|');}
async function downloadEditorial(request, config, fetchImpl=fetch) {
 const url=new URL(request.url);
 if(url.pathname!=='/api/exportar-editorial')return respostaDownload('Não encontrado.',404);
 if(request.method!=='POST')return respostaDownload('Método não permitido.',405);
 if(request.headers.get('Origin')!==url.origin)return respostaDownload('Origem não permitida.',403);
 // Não ativar automaticamente. Esta fase usa somente mocks em testes locais.
 if(config?.habilitado!==true)return respostaDownload('Exportação ainda não ativada.',503);
 if(config.supabaseUrl!==ORIGEM || typeof config.chavePublica!=='string' || !config.chavePublica.startsWith('sb_publishable_') || config.chavePublica!==config.chavePublica.trim())return respostaDownload('Configuração indisponível.',503);
 const controlador=new AbortController();const timer=setTimeout(()=>controlador.abort(),10000);
 // Timeout compatível com Workers: AbortController, sem AbortSignal.timeout().
 const requisitar=(u,opcoes)=>fetchImpl(u,{...opcoes,signal:controlador.signal});
 try{
   const acesso=await autorizar(request,config,requisitar);
   if(!acesso.autorizado)return respostaDownload('Acesso negado ou validação indisponível.',403);
   const r=await requisitar(ORIGEM+'/rest/v1/rpc/capturar_editorial_emergencia',{
     method:'POST',headers:{apikey:config.chavePublica,Authorization:request.headers.get('Authorization'),'Content-Type':'application/json'},
     body:'{}',redirect:'manual',cache:'no-store',
   });
   if(!r.ok || !(r.headers.get('Content-Type')||'').toLowerCase().includes('application/json'))throw Error('Captura indisponível');
   const captura=await lerLimitado(r);
   if(!exatasDownload(captura,['versaoCaptura','capturadoEm','contagens','dados']) || captura.versaoCaptura!==1 || !exatasDownload(captura.contagens,TABELAS) || !exatasDownload(captura.dados,TABELAS))throw Error('Envelope inválido');
   for(const t of TABELAS)if(!Array.isArray(captura.dados[t]) || captura.contagens[t]!==captura.dados[t].length)throw Error('Contagem divergente');
   const pacote=await criarPacote(captura.dados,captura.capturadoEm);
   return new Response(pacote,{headers:{
     'Content-Type':'application/json; charset=utf-8',
     'Content-Disposition':'attachment; filename="snapshot-editorial-incidente.json"',
     'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',
     'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
   }});
 }catch{return respostaDownload('Não foi possível gerar um pacote completo. Nenhum download foi confirmado.',503);}
 finally{clearTimeout(timer);}
}

/** Prova isolada: somente configuração de servidor; nunca recebe URL do cliente. */
async function autorizar(request, config, fetchImpl = fetch) {
  const negado = { autorizado: false };
  if (!config?.supabaseUrl || !config?.chavePublica) return negado;
  const token = request.headers.get('authorization');
  if (!token || !/^Bearer [A-Za-z0-9._~-]+$/.test(token) || token.length > 8192) return negado;
  try {
    const url = new URL(config.supabaseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return negado;
    const headers = { apikey: config.chavePublica, Authorization: token };
    // Validação remota da sessão; não confia em payload JWT decodificado no cliente.
    const usuario = await fetchImpl(`${url.origin}/auth/v1/user`, {
      headers, redirect: 'manual',
    });
    if (!usuario.ok) return negado;
    const dados = await usuario.json();
    if (typeof dados.id !== 'string' || !dados.id) return negado;
    // RPC existente consulta lista privada e política de MFA no banco.
    const acesso = await fetchImpl(`${url.origin}/rest/v1/rpc/estado_acesso_painel`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: '{}', redirect: 'manual',
    });
    if (!acesso.ok) return negado;
    const estado = await acesso.json();
    if (estado?.autorizado !== true || estado?.mfa_necessario !== false) return negado;
    // Exige AAL2 também no servidor, mesmo que a política atual aceite conta sem fator.
    const partes = token.slice(7).split('.');
    if (partes.length !== 3) return negado;
    const claims = JSON.parse(atob(partes[1].replace(/-/g,'+').replace(/_/g,'/')));
    if (claims.aal !== 'aal2' || claims.sub !== dados.id) return negado;
    return { autorizado: true, usuarioId: dados.id };
  } catch { return negado; }
}

const SUPABASE = 'https://pjglrlullnchqazxpvyn.supabase.co';
function resposta(texto, status = 200, extras = {}) {
  return new Response(texto, {status, headers: {
    'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff', ...extras,
  }});
}
// Opera exclusivamente nas tabelas fictícias do D1 vinculado ao Worker.
export async function emergenciaTeste(db, id) {
  const ativacao = await db.prepare(
    'UPDATE estado_site SET manutencao = 1, atualizado_em = CURRENT_TIMESTAMP WHERE id = 1'
  ).run();
  if (ativacao.meta?.changes !== 1) throw new Error('Estado de teste ausente');
  try {
    await db.prepare(`INSERT OR IGNORE INTO backups_teste (id, conteudo)
      SELECT ?, json_group_array(json_object('id', id, 'nome', nome)) FROM dados_teste`).bind(id).run();
    const copia = await db.prepare('SELECT id FROM backups_teste WHERE id = ?').bind(id).first();
    if (!copia) throw new Error('Cópia não confirmada');
    return { manutencao: true, backup: 'concluido', id };
  } catch {
    return { manutencao: true, backup: 'falhou', id };
  }
}
const workerInterno = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if(['/api/conferir-backup','/api/baixar-backup'].includes(url.pathname))return conferirBackup(request,{habilitado:true,supabaseUrl:env.SUPABASE_URL,chavePublica:env.SUPABASE_ANON_KEY},env.DB);
    if(url.pathname === '/api/emergencia-real') {
      return emergenciaReal(request,{habilitado:true,supabaseUrl:env.SUPABASE_URL,chavePublica:env.SUPABASE_ANON_KEY},env.DB);
    }
    if (url.pathname === '/api/exportar-editorial') {
      return downloadEditorial(request, {habilitado:true, supabaseUrl:env.SUPABASE_URL, chavePublica:env.SUPABASE_ANON_KEY});
    }
    // Apenas chave publicável aqui: nunca disponibilizar service_role/secret.
    const chave = env.SUPABASE_ANON_KEY;
    if (env.SUPABASE_URL?.replace(/\/$/,'') !== SUPABASE ||
        typeof chave !== 'string' || !chave.startsWith('sb_publishable_') || chave !== chave.trim()) {
      return resposta('Este teste exige a chave pública Publishable sb_publishable_... e a URL configurada.',503);
    }
    if (['/api/emergencia-teste', '/api/reabrir-teste'].includes(url.pathname)) {
      if (request.method !== 'POST') return resposta('Método não permitido.',405);
      if (request.headers.get('Origin') !== url.origin) return resposta('Origem não permitida.',403);
      const acesso = await autorizar(request,{supabaseUrl:SUPABASE,chavePublica:chave});
      if (!acesso.autorizado) return resposta('Acesso negado ou validação indisponível.',403);
      // Nenhuma URL, tabela ou consulta é aceita do navegador.
      const id = request.headers.get('X-Teste-Id');
      if (!id || !/^[a-f0-9-]{36}$/.test(id)) return resposta('Identificador de teste inválido.',400);
      try {
        if (url.pathname === '/api/reabrir-teste') {
          const r = await env.DB.prepare('UPDATE estado_site SET manutencao = 0, atualizado_em = CURRENT_TIMESTAMP WHERE id = 1').run();
          if (r.meta?.changes !== 1) throw new Error('Estado ausente');
          return resposta('Ambiente de teste reaberto. As cópias fictícias foram preservadas.');
        }
        const resultado = await emergenciaTeste(env.DB, id);
        return resposta(resultado.backup === 'concluido'
          ? 'Manutenção de teste ativada. Cópia fictícia confirmada. ID: ' + resultado.id
          : 'Manutenção de teste ativada, mas a cópia fictícia FALHOU. O ambiente continua bloqueado. ID: ' + resultado.id,
          resultado.backup === 'concluido' ? 200 : 503);
      } catch {
        return resposta('Não foi possível confirmar a alteração. Confira o estado do teste no D1 antes de tentar novamente.',503);
      }
    }
    if (url.pathname === '/api/verificar') {
      if (request.method !== 'POST') return resposta('Método não permitido.',405);
      if (request.headers.get('Origin') !== url.origin) return resposta('Origem não permitida.',403);
      const acesso = await autorizar(request,{supabaseUrl:SUPABASE,chavePublica:chave});
      return resposta(acesso.autorizado
        ? 'Sucesso: sessão validada, conta administradora autorizada e segundo fator confirmado. Nenhuma alteração foi feita.'
        : 'Acesso negado ou validação indisponível. É necessária uma conta administradora com segundo fator.',acesso.autorizado?200:403);
    }
    if (url.pathname === '/login-teste') {
      const nonce = crypto.randomUUID().replaceAll('-','');
      const config = JSON.stringify({url:SUPABASE,key:chave}).replaceAll('<','\\u003c');
      return resposta(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Controle de emergência — Casal na Estrada</title>
<style nonce="${nonce}">
@font-face{font-family:Bodoni;src:url(data:font/woff2;base64,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) format('woff2');font-weight:400;font-display:swap}
:root{color-scheme:light;--papel:#f7f4ed;--tinta:#292c28;--verde:#344b3e;--borda:#dcded4}*{box-sizing:border-box}body{margin:0;background:var(--papel);color:var(--tinta);font:16px/1.65 system-ui,sans-serif}header,main,footer{max-width:1020px;margin:auto;padding:24px}header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--borda);gap:16px}.marca{font:26px Bodoni,Georgia,serif}.selo,.eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#526153}.selo{border:1px solid var(--borda);border-radius:30px;padding:6px 12px}h1,h2,h3{font-family:Bodoni,Georgia,serif;font-weight:400;line-height:1.15}h1{font-size:clamp(36px,6vw,56px);margin:12px 0 16px}h2{font-size:30px;margin:0 0 12px}h3{font-size:24px;margin:0 0 10px}p{margin:8px 0 18px}.intro{max-width:700px;margin:16px 0 28px;color:#596057}.cartao,details{background:#fff;border:1px solid var(--borda);border-radius:16px;padding:26px;margin:18px 0}.recuperacao{border-top:4px solid var(--verde)}.linha{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.colunas{display:grid;grid-template-columns:1fr 1fr;gap:18px}.colunas .cartao{margin:0}label{display:block;font-size:14px;font-weight:600;margin:12px 0}input{display:block;width:100%;padding:12px 14px;margin-top:6px;border:1px solid #adb6aa;border-radius:8px;background:#fff;color:var(--tinta);font:inherit}button{border:1px solid var(--verde);border-radius:8px;background:var(--verde);color:#fff;padding:12px 18px;font:600 14px/1.5 system-ui,sans-serif;cursor:pointer;margin:5px 6px 5px 0}button:hover{filter:brightness(1.1)}button:disabled{opacity:.5;cursor:wait}button.secundario{background:#fff;color:var(--verde);border-color:#b4beb1}button.perigo{background:#833e33;border-color:#833e33}button:focus-visible,input:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid #b78942;outline-offset:4px}summary{cursor:pointer;font-weight:600;color:var(--verde)}details>div{padding-top:22px}.nota{font-size:13px;color:#62695f}.passo{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6c7568;margin-bottom:12px}#status{white-space:pre-wrap;overflow-wrap:anywhere;padding:20px;border-radius:12px;border:1px solid var(--borda);background:#edf1e8}#status:empty{display:none}[hidden]{display:none!important}a{color:var(--verde)}footer{font-size:12px;color:#687060;border-top:1px solid var(--borda);margin-top:24px}@media(max-width:640px){header,main,footer{padding:20px}.cartao,details{padding:20px}.colunas{grid-template-columns:1fr}button{width:100%;margin:5px 0}.selo{font-size:9px}.marca{font-size:21px}}
</style></head><body>
<header><span class="marca">Casal na Estrada</span><span class="selo">Acesso restrito · segundo fator</span></header>
<main><div class="eyebrow">Segurança & continuidade</div><h1>Controle de emergência</h1><p class="intro">Um ponto seguro para recuperar o acesso ao site, conferir suas cópias e acompanhar a publicação. Este controle permanece disponível durante a manutenção.</p>
<form id="login" class="cartao"><div class="passo">01 / Identificação</div><h2>Acesso administrativo</h2><p class="nota">Use a mesma conta administradora do painel. O segundo fator será solicitado na próxima etapa.</p><label>E-mail<input id="email" type="email" autocomplete="username" required maxlength="254"></label><label>Senha<input id="senha" type="password" autocomplete="current-password" required maxlength="1024"></label><button>Entrar com segurança</button></form>
<form id="mfa" class="cartao" hidden><div class="passo">02 / Verificação</div><h2>Confirme sua identidade</h2><label>Código do aplicativo autenticador<input id="codigo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button>Validar segundo fator</button></form>
<section id="acoes" hidden>
<div class="cartao recuperacao"><div class="passo">Recuperação do site</div><h2>Voltar à estrada</h2><p>Depois de conferir o motivo da manutenção e o resultado da cópia, use a reabertura para liberar o site aos visitantes.</p><button id="reabrir" type="button">Reabrir site</button><p class="nota">A ação exige confirmação. Este botão altera a manutenção; não restaura cadastros nem arquivos. Para ativar a emergência no dia a dia, use o botão no admin.</p></div>
<div class="colunas"><div class="cartao"><h3>Publicação automática</h3><p class="nota">Consulte o último resultado registrado e as tentativas do dia, sem solicitar um novo build.</p><button id="consultar-agendamento" class="secundario" type="button">Consultar agendamento automático</button></div><div class="cartao"><h3>Cópia editorial guardada</h3><p class="nota">Informe o identificador recebido na emergência. Conferir e baixar não criam outra cópia.</p><label>ID da cópia<input id="id-copia" maxlength="36" placeholder="Identificador da cópia"></label><button id="conferir" class="secundario" type="button">Conferir cópia no D1</button><button id="baixar-guardada" class="secundario" type="button">Baixar cadastros guardados</button></div></div>
<details><summary>Fotos e downloads privados</summary><div><h3>Fotos guardadas no D1</h3><p class="nota">Use o ID da cópia acima. Limites: 3 conjuntos, 100 arquivos, 1 MiB por arquivo e 8 MiB por conjunto. Não inclui public/media. Mantenha a aba aberta durante a cópia.</p><button id="retomar-fotos-d1" class="secundario" type="button">Copiar ou retomar fotos no D1</button><button id="baixar-fotos-d1" class="secundario" type="button">Baixar fotos guardadas (ZIP)</button><h3>Download para o computador</h3><p class="nota">Pode incluir rascunhos: guarde em local privado. ZIP inclui public/media e arquivos acessíveis de midia/midia-rascunhos; até 60 MiB no total e 10 MiB por arquivo. Não é uma cópia automática no D1.</p><button id="baixar-fotos" class="secundario" type="button">Baixar arquivos de mídia (ZIP)</button><label>Conferência local, sem enviar arquivo<input id="zip-local-fotos" type="file" accept=".zip,application/zip"></label><button id="verificar-fotos" class="secundario" type="button">Conferir ZIP neste navegador</button><button id="baixar" class="secundario" type="button">Baixar cadastros atuais (JSON)</button><p class="nota">O JSON inclui cadastros e rascunhos, não arquivos de fotos, senhas ou tokens. Downloads não comprovam uma restauração completa.</p></div></details>
<details><summary>Diagnóstico dos canais protegidos</summary><div><p class="nota">Somente conferência: estes testes não ativam manutenção nem criam backups.</p><button id="testar-conteudo-build" class="secundario" type="button">Testar canal de conteúdo do build</button><button id="testar-origem-assinada" class="secundario" type="button">Testar canal assinado de imagens</button></div></details>
<details><summary>Ações avançadas de manutenção</summary><div><h3>Ativar manutenção por este controle</h3><p class="nota">Bloqueia o site e tenta guardar os cadastros reais, incluindo rascunhos, no D1. Limite: 5 cópias de até 1 MiB, sem exclusão automática. As fotos precisam da etapa específica acima. Não substitui uma cópia independente.</p><button id="backup-real" class="perigo" type="button">Ativar manutenção e guardar cadastros</button><h3>Diagnóstico com dados fictícios</h3><p class="nota">Atenção: os dados são fictícios, mas a manutenção bloqueia este site de verdade. Não use para testar somente a aparência.</p><button id="emergencia" class="secundario" type="button">Ativar manutenção com cópia fictícia</button></div></details>
</section>
<p id="status" role="status" aria-live="polite"></p><button id="limpar" class="secundario" type="button">Limpar sessão deste controle</button><p class="nota">Limpar remove a sessão da memória desta página; não revoga outras sessões abertas.</p>
</main><footer>Casal na Estrada · Controle protegido. Manutenção não apaga downloads anteriores nem cópias externas.</footer>
<script nonce="${nonce}">
const config=${config};
let token=null, fator=null, ocupadoAcao=false, idPendente=null;
const login=document.getElementById('login'), mfa=document.getElementById('mfa'), status=document.getElementById('status');
function limpar(){token=null;fator=null;idPendente=null;document.getElementById('acoes').hidden=true;login.reset();mfa.reset();login.hidden=false;mfa.hidden=true;}
async function auth(path,body){
 const r=await fetch(config.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error'});
 if(!r.ok)throw Error('Login ou código recusado, limite de tentativas atingido ou serviço indisponível.');
 return r.json();
}
async function ocupado(form,acao){const b=form.querySelector('button');b.disabled=true;try{await acao();}catch(e){status.textContent=e.message; }finally{b.disabled=false;}}
login.addEventListener('submit',e=>{e.preventDefault();ocupado(login,async()=>{
 const email=document.getElementById('email').value.trim(), password=document.getElementById('senha').value;
 token=null;fator=null;status.textContent='Validando login…';
 try {
 const dados=await auth('token?grant_type=password',{email,password});
 token=dados.access_token;
 if(typeof token!=='string')throw Error('Sessão não recebida.');
 const fatores=(dados.user?.factors||[]).filter(f=>f.status==='verified'&&f.factor_type==='totp');
 if(!fatores.length){token=null;throw Error('Este teste exige segundo fator TOTP já confirmado no admin original.');}
 fator=fatores[0].id;login.hidden=true;mfa.hidden=false;status.textContent='Informe o código do autenticador nesta página. Não envie o código pelo chat.';
 } finally {document.getElementById('senha').value='';}
});});
mfa.addEventListener('submit',e=>{e.preventDefault();ocupado(mfa,async()=>{
 if(!token||!fator)throw Error('Entre novamente.');
 status.textContent='Validando segundo fator…';
 try {
 const desafio=await auth('factors/'+encodeURIComponent(fator)+'/challenge',{});
 const verificado=await auth('factors/'+encodeURIComponent(fator)+'/verify',{challenge_id:desafio.id,code:document.getElementById('codigo').value});
 token=verificado.access_token;
 if(typeof token!=='string')throw Error('Sessão MFA não recebida.');
 const r=await fetch('/api/verificar',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
 status.textContent=await r.text();
 if(!r.ok){limpar();return;}
 mfa.reset();mfa.hidden=true;document.getElementById('acoes').hidden=false;
 } catch(e) {limpar();throw e;} finally {document.getElementById('codigo').value='';}
});});
async function executarAcao(tipo){
 if(ocupadoAcao||!token)return;
 const pergunta=tipo==='emergencia'
   ? 'Ativar manutenção SOMENTE NO TESTE e copiar os dados fictícios do D1?'
   : 'Reabrir o site para os visitantes? Confirme que é seguro encerrar a manutenção.';
 if(!confirm(pergunta))return;
 ocupadoAcao=true;
 document.getElementById('backup-real').disabled=true;
 document.getElementById('baixar').disabled=true;
 document.getElementById('emergencia').disabled=true;
 document.getElementById('reabrir').disabled=true;
 document.getElementById('limpar').disabled=true;
 if(!idPendente||idPendente.tipo!==tipo)idPendente={tipo,id:crypto.randomUUID()};
 status.textContent=tipo==='emergencia'?'Ativando manutenção e aguardando confirmação da cópia fictícia…':'Reabrindo teste…';
 try{
 const r=await fetch('/api/'+tipo+'-teste',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Teste-Id':idPendente.id},credentials:'omit',cache:'no-store',redirect:'error'});
 status.textContent=await r.text();
 if(r.ok)idPendente=null;
 if(r.status===403)limpar();
 }catch{status.textContent='Sem confirmação da operação. Não presuma que falhou: confira o endereço público do teste e o D1. Uma nova tentativa nesta página reutiliza o identificador.';}
 finally{ocupadoAcao=false;document.getElementById('backup-real').disabled=false;document.getElementById('baixar').disabled=false;document.getElementById('emergencia').disabled=false;document.getElementById('reabrir').disabled=false;document.getElementById('limpar').disabled=false;}
}
document.getElementById('emergencia').addEventListener('click',()=>executarAcao('emergencia'));
document.getElementById('reabrir').addEventListener('click',()=>executarAcao('reabrir'));
document.getElementById('baixar').addEventListener('click',async()=>{
 if(ocupadoAcao||!token)return;
 if(!confirm('Baixar os cadastros REAIS, incluindo rascunhos, para este computador? Não inclui os arquivos das fotos.'))return;
 ocupadoAcao=true;
 const botoes=['backup-real','baixar','emergencia','reabrir','limpar'];
 botoes.forEach(id=>document.getElementById(id).disabled=true);
 status.textContent='Gerando pacote editorial real. Aguarde…';
 try{
   const r=await fetch('/api/exportar-editorial',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
   if(!r.ok){status.textContent=await r.text();if(r.status===403)limpar();return;}
   const blob=await r.blob();
   const href=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=href;a.download='snapshot-editorial-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
   status.textContent='Pacote recebido e download solicitado ao navegador. Confira se o arquivo foi salvo. Não é backup das fotos nem restauração de produção validada.';
 }catch{status.textContent='Falha no download. Nenhum arquivo completo foi confirmado.';}
 finally{ocupadoAcao=false;botoes.forEach(id=>document.getElementById(id).disabled=false);}
});
let tentativaReal=null;
document.getElementById('backup-real').addEventListener('click',async()=>{
 if(ocupadoAcao||!token)return;
 if(!confirm('Ativar manutenção SOMENTE NO TESTE e guardar cadastros REAIS (incluindo rascunhos) no D1 da sua Cloudflare? Sem fotos; não bloqueia o GitHub Pages.'))return;
 ocupadoAcao=true;const botoes=['backup-real','baixar','emergencia','reabrir','limpar'];botoes.forEach(id=>document.getElementById(id).disabled=true);
 tentativaReal=tentativaReal||crypto.randomUUID();status.textContent='Ativando manutenção do teste e aguardando confirmação do backup real…';
 try{
  const r=await fetch('/api/emergencia-real',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Teste-Id':tentativaReal},credentials:'omit',cache:'no-store',redirect:'error'});
  status.textContent=await r.text();
  if(r.ok)tentativaReal=null;
  if(r.status===403)limpar();
 }catch{status.textContent='Sem confirmação. O teste pode estar em manutenção. Não presuma que a cópia falhou: confira o D1. Repetir nesta aba reutiliza o identificador.';}
 finally{ocupadoAcao=false;botoes.forEach(id=>document.getElementById(id).disabled=false);}
});
document.getElementById('conferir').addEventListener('click',async()=>{
 if(ocupadoAcao||!token)return;
 const id=document.getElementById('id-copia').value.trim();
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)){status.textContent='Confira o ID da cópia.';return;}
 ocupadoAcao=true;const botoes=['conferir','backup-real','baixar','emergencia','reabrir','limpar'];botoes.forEach(id=>document.getElementById(id).disabled=true);
 status.textContent='Conferindo a cópia armazenada…';
 try{
 const r=await fetch('/api/conferir-backup',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Teste-Id':id},credentials:'omit',cache:'no-store',redirect:'error'});
 status.textContent=await r.text();if(r.status===403)limpar();
 }catch{status.textContent='Falha na conferência. Nenhuma conclusão sobre integridade foi obtida.';}
 finally{ocupadoAcao=false;botoes.forEach(id=>document.getElementById(id).disabled=false);}
});
document.getElementById('baixar-guardada').addEventListener('click',async()=>{
 if(ocupadoAcao||!token)return;
 const id=document.getElementById('id-copia').value.trim();
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)){status.textContent='Confira o ID da cópia.';return;}
 if(!confirm('Baixar a cópia editorial já guardada no D1, incluindo rascunhos, para este computador? Não inclui arquivos das fotos.'))return;
 ocupadoAcao=true;const botoes=['baixar-guardada','conferir','backup-real','baixar','emergencia','reabrir','limpar'];botoes.forEach(id=>document.getElementById(id).disabled=true);
 status.textContent='Validando e baixando a cópia guardada no D1…';
 try{
 const r=await fetch('/api/baixar-backup',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Teste-Id':id},credentials:'omit',cache:'no-store',redirect:'error'});
 if(!r.ok){status.textContent=await r.text();if(r.status===403)limpar();return;}
 const blob=await r.blob(),href=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=href;a.download='snapshot-editorial-d1-'+id+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
 status.textContent='Cópia guardada validada e recebida. Download solicitado ao navegador: confira se o arquivo foi salvo em pasta privada. Nenhuma nova cópia foi criada no D1.';
 }catch{status.textContent='Falha no download da cópia guardada. Nenhum arquivo completo foi confirmado.';}
 finally{ocupadoAcao=false;botoes.forEach(id=>document.getElementById(id).disabled=false);}
});
/** Sem sessão persistida. A aba conduz etapas curtas; fechamento exige retomada. */
async function copiarFotosAutomaticas({id,token,progresso=()=>{},fetchImpl=fetch}){
 const chamar=async(acao,nome)=>{
  const r=await fetchImpl('/api/fotos-guardadas/'+acao,{method:'POST',headers:{Authorization:'Bearer '+token,'X-Teste-Id':id,...(nome?{'X-Foto-Nome':encodeURIComponent(nome)}:{})},credentials:'omit',cache:'no-store',redirect:'error'});
  if(!r.ok)throw Error(await r.text());return r.json();
 };
 progresso('Inventariando fotos do Supabase. Mantenha esta aba aberta.');
 const inventario=await chamar('iniciar');
 if(!Array.isArray(inventario.arquivos)||inventario.arquivos.length>100)throw Error('Inventário de fotos incompatível.');
 for(const [i,a] of inventario.arquivos.entries()){
  progresso('Copiando e conferindo foto '+(i+1)+' de '+inventario.arquivos.length+'. Mantenha a aba aberta.');await chamar('copiar',a.nome);
 }
 const resultado=await chamar('concluir');
 return 'Fotos do Supabase guardadas e conferidas no D1: '+resultado.arquivos+' arquivos, '+resultado.totalBytes+' bytes. Não inclui imagens fixas do repositório; preserve o ZIP completo. ID: '+id;
}

/** ZIP sem compressão. Montado no navegador; nenhuma imagem vira texto no D1. */
const zipEncoder=new TextEncoder();
const zipCRC=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=zipCRC[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function montarZipFotos(arquivos){
 if(!Array.isArray(arquivos)||arquivos.length>1000)throw Error('Quantidade de arquivos excedida.');
 const partes=[],diretorio=[],nomes=new Set();let posicao=0,total=0;
 for(const {nome,bytes} of arquivos){
  if(typeof nome!=='string'||!nome||nome.startsWith('/')||nome.includes('\\\\')||nome.split('/').some(p=>!p||p==='.'||p==='..')||/[\\x00-\\x1f\\x7f]/.test(nome)||nomes.has(nome))throw Error('Nome de arquivo inválido ou duplicado.');
  if(!(bytes instanceof Uint8Array))throw Error('Arquivo inválido.');
  total+=bytes.length;if(total>64*1024*1024)throw Error('ZIP excede o limite de 64 MiB.');
  nomes.add(nome);const utf8=zipEncoder.encode(nome);if(utf8.length>1024)throw Error('Nome excessivo.');
  const crc=crc32(bytes),local=new Uint8Array(30+utf8.length),v=new DataView(local.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);
  v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,utf8.length,true);local.set(utf8,30);
  const central=new Uint8Array(46+utf8.length),c=new DataView(central.buffer);
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);
  c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,utf8.length,true);c.setUint32(42,posicao,true);central.set(utf8,46);
  partes.push(local,bytes);diretorio.push(central);posicao+=local.length+bytes.length;
 }
 const tamanhoCentral=diretorio.reduce((n,b)=>n+b.length,0),fim=new Uint8Array(22),f=new DataView(fim.buffer);
 f.setUint32(0,0x06054b50,true);f.setUint16(8,arquivos.length,true);f.setUint16(10,arquivos.length,true);f.setUint32(12,tamanhoCentral,true);f.setUint32(16,posicao,true);
 return new Blob([...partes,...diretorio,fim],{type:'application/zip'});
}

/** Confere nosso formato ZIP sem extrair arquivos no disco e sem enviar à rede. */
async function inspecionarZipFotos(arquivo,comBytes=false){
 if(!arquivo||arquivo.size>66*1024*1024)throw Error('ZIP acima do limite.');
 const bytes=new Uint8Array(await arquivo.arrayBuffer()),view=new DataView(bytes.buffer);
 const u16=p=>view.getUint16(p,true),u32=p=>view.getUint32(p,true);
 if(bytes.length<22)throw Error('ZIP truncado.');
 const fim=bytes.length-22;
 if(u32(fim)!==0x06054b50||u16(fim+4)!==0||u16(fim+6)!==0||u16(fim+20)!==0)throw Error('Formato ZIP não suportado.');
 const quantidade=u16(fim+10),inicioCentral=u32(fim+16),tamanhoCentral=u32(fim+12);
 if(quantidade>1000||quantidade!==u16(fim+8)||inicioCentral+tamanhoCentral!==fim)throw Error('Diretório ZIP inválido.');
 const itens=new Map();let local=0,central=inicioCentral;
 const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false});
 for(let i=0;i<quantidade;i++){
  if(central+46>fim||u32(central)!==0x02014b50||u16(central+8)!==0x800||u16(central+10)!==0||u16(central+30)!==0||u16(central+32)!==0||u16(central+34)!==0||u32(central+42)!==local)throw Error('Entrada ZIP inválida.');
  const n=u16(central+28),tamanho=u32(central+24),crc=u32(central+16);
  if(central+46+n>fim||u32(central+20)!==tamanho||local+30>inicioCentral||u32(local)!==0x04034b50||u16(local+6)!==0x800||u16(local+8)!==0||u16(local+28)!==0||u16(local+26)!==n||u32(local+14)!==crc||u32(local+18)!==tamanho||u32(local+22)!==tamanho)throw Error('Cabeçalho ZIP divergente.');
  const nome=decoder.decode(bytes.subarray(central+46,central+46+n));
  if(!nome||nome.startsWith('/')||nome.includes('\\\\')||/[\\x00-\\x1f\\x7f]/.test(nome)||nome.split('/').some(p=>!p||p==='.'||p==='..')||itens.has(nome))throw Error('Nome ZIP inválido.');
  if(decoder.decode(bytes.subarray(local+30,local+30+n))!==nome)throw Error('Nome divergente.');
  const comeco=local+30+n,termino=comeco+tamanho;
  if(termino>inicioCentral)throw Error('Arquivo truncado.');
  const conteudo=bytes.subarray(comeco,termino);if(crc32(conteudo)!==crc)throw Error('CRC divergente.');
  itens.set(nome,conteudo);local=termino;central+=46+n;
 }
 if(central!==fim||local!==inicioCentral||!itens.has('manifesto.json'))throw Error('Manifesto ou diretório ausente.');
 const manifesto=JSON.parse(decoder.decode(itens.get('manifesto.json')));
 if(manifesto.versao!==1||manifesto.tipo!=='arquivos-midia-sem-cadastros'||!Array.isArray(manifesto.arquivos)||manifesto.arquivos.length!==itens.size-1)throw Error('Manifesto incompatível.');
 const nomes=new Set();let total=0;
 for(const a of manifesto.arquivos){
  if(!['repositorio','midia','midia-rascunhos'].includes(a.bucket)||typeof a.caminho!=='string'||a.nome!==a.bucket+'/'+a.caminho||nomes.has(a.nome)||!Number.isSafeInteger(a.tamanho)||a.tamanho<0||a.tamanho>10*1024*1024||!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('Referência inválida no manifesto.');
  const conteudo=itens.get(a.nome);if(!conteudo||conteudo.length!==a.tamanho)throw Error('Arquivo ausente ou tamanho divergente.');
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',conteudo))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==a.sha256)throw Error('SHA-256 divergente.');
  total+=conteudo.length;nomes.add(a.nome);
 }
 if(total!==manifesto.totalBytes||total>60*1024*1024)throw Error('Total divergente.');
 return {arquivos:manifesto.arquivos.length,totalBytes:total,manifesto,...(comBytes?{itens}:{})};
}

async function verificarZipFotos(arquivo){
 const {arquivos,totalBytes}=await inspecionarZipFotos(arquivo);return {arquivos,totalBytes};
}

// Inserido pelo gerador na página autenticada; não usa localStorage ou URLs externas.
document.getElementById('baixar-fotos').addEventListener('click',async()=>{
 if(ocupadoAcao||!token)return;
 if(!confirm('Baixar os arquivos de public/media e dos buckets midia/midia-rascunhos? Pode incluir fotos privadas e não publicadas. ZIP montado neste navegador, sem nova assinatura ou armazenamento de imagens no D1.'))return;
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 const partes=[],manifesto=[];let total=0;
 try{
  status.textContent='Inventariando arquivos. Nenhuma cópia de fotos foi confirmada ainda…';
  const r=await fetch('/api/midia-inventario',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
  if(!r.ok){if(r.status===403)limpar();throw Error(await r.text());}
  const inventario=await r.json();
  if(inventario.versao!==1||!Array.isArray(inventario.arquivos)||inventario.arquivos.length>999)throw Error('Inventário incompatível.');
  for(const [i,a] of inventario.arquivos.entries()){
   status.textContent='Baixando arquivo '+(i+1)+' de '+inventario.arquivos.length+'… Mantenha esta aba aberta.';
   const f=await fetch('/api/midia-arquivo',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Midia-Bucket':a.bucket,'X-Midia-Caminho':encodeURIComponent(a.caminho)},credentials:'omit',cache:'no-store',redirect:'error'});
   if(!f.ok){if(f.status===403)limpar();throw Error('Não foi possível obter todos os arquivos. Nenhum ZIP completo foi confirmado.');}
   const bytes=new Uint8Array(await f.arrayBuffer());total+=bytes.length;
   if(total>60*1024*1024||bytes.length!==a.tamanho)throw Error('Tamanho alterado ou limite excedido. Refaça o inventário; nenhum ZIP completo foi confirmado.');
   const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
   if(sha256!==f.headers.get('X-Conteudo-Sha256')||(a.sha256&&sha256!==a.sha256))throw Error('Integridade divergente. Nenhum ZIP completo foi confirmado.');
   const nome=a.bucket+'/'+a.caminho;partes.push({nome,bytes});manifesto.push({bucket:a.bucket,caminho:a.caminho,nome,tamanho:bytes.length,sha256});
  }
  const doc={versao:1,tipo:'arquivos-midia-sem-cadastros',criadoEm:inventario.criadoEm,totalBytes:total,arquivos:manifesto,limitacoes:inventario.observacao};
  partes.push({nome:'manifesto.json',bytes:new TextEncoder().encode(JSON.stringify(doc,null,2))});
  status.textContent='Preparando ZIP. Aguarde…';
  const blob=montarZipFotos(partes),href=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=href;link.download='arquivos-midia-'+new Date().toISOString().replace(/[:.]/g,'-')+'.zip';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  status.textContent='Arquivos recebidos e verificados: '+manifesto.length+' ('+total+' bytes). Download do ZIP solicitado; confirme que foi salvo em pasta privada. Não inclui cadastros nem comprova restauração. Fotos não são copiadas automaticamente para o D1.';
 }catch(e){status.textContent=e.message||'Falha no backup dos arquivos. Nenhum ZIP completo confirmado.';}
 finally{partes.length=0;ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
});
document.getElementById('verificar-fotos').addEventListener('click',async()=>{
 if(ocupadoAcao)return;
 const arquivo=document.getElementById('zip-local-fotos').files[0];if(!arquivo){status.textContent='Selecione o ZIP de mídia baixado.';return;}
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 status.textContent='Verificando ZIP somente neste navegador. Nada será enviado…';
 try{const r=await verificarZipFotos(arquivo);status.textContent='ZIP local validado: '+r.arquivos+' arquivos, '+r.totalBytes+' bytes. CRC, manifesto e SHA-256 conferem. Nada enviado. Isso não prova autenticidade contra invasor nem restauração do site.';}
 catch(e){status.textContent='ZIP não validado: '+e.message;}
 finally{ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
});

async function executarFotosGuardadas(baixar){
 if(ocupadoAcao||!token)return;
 const id=document.getElementById('id-copia').value.trim();
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)){status.textContent='Informe o ID da cópia editorial.';return;}
 if(!baixar&&!confirm('Copiar/retomar fotos reais e privadas do Supabase no D1 existente? A manutenção não será alterada; use o ID correto e mantenha esta aba aberta. Não inclui public/media.'))return;
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 try{
  if(!baixar){status.textContent=await copiarFotosAutomaticas({id,token,progresso:t=>status.textContent=t});return;}
  const headers={Authorization:'Bearer '+token,'X-Teste-Id':id};
  const obter=async(acao,extras={})=>{const r=await fetch('/api/fotos-guardadas/'+acao,{method:'POST',headers:{...headers,...extras},credentials:'omit',cache:'no-store',redirect:'error'});if(!r.ok)throw Error(await r.text());return r;};
  status.textContent='Lendo manifesto das fotos GUARDADAS no D1…';
  const inventario=await (await obter('inventario')).json();if(inventario.estado!=='concluido'||!Array.isArray(inventario.arquivos)||inventario.arquivos.length>100)throw Error('Cópia não concluída.');
  const partes=[],arquivos=[];let total=0;
  for(const [i,a] of inventario.arquivos.entries()){
   status.textContent='Baixando e verificando do D1: '+(i+1)+' de '+inventario.arquivos.length;
   const r=await obter('arquivo',{'X-Foto-Nome':encodeURIComponent(a.nome)}),bytes=new Uint8Array(await r.arrayBuffer());total+=bytes.length;
   const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
   if(total>8*1048576||bytes.length!==a.tamanho||sha256!==a.sha256||sha256!==r.headers.get('X-Conteudo-Sha256'))throw Error('Integridade do download divergente.');
   const pos=a.nome.indexOf('/');partes.push({nome:a.nome,bytes});arquivos.push({nome:a.nome,bucket:a.nome.slice(0,pos),caminho:a.nome.slice(pos+1),tamanho:bytes.length,sha256});
  }
  const manifesto={versao:1,tipo:'arquivos-midia-sem-cadastros',criadoEm:new Date().toISOString(),snapshotEditorialId:id,totalBytes:total,arquivos,limitacoes:'Somente fotos do Supabase copiadas no D1; não inclui public/media. Data indica download, não captura atômica.'};
  partes.push({nome:'manifesto.json',bytes:new TextEncoder().encode(JSON.stringify(manifesto,null,2))});
  const href=URL.createObjectURL(montarZipFotos(partes)),link=document.createElement('a');link.href=href;link.download='fotos-guardadas-d1-'+id+'.zip';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  status.textContent='Download solicitado: '+arquivos.length+' fotos guardadas no D1, '+total+' bytes. Confirme salvamento privado e use o verificador ZIP local. Não inclui public/media.';
 }catch(e){status.textContent='Fotos não confirmadas: '+e.message+' Preserve o ID; não repita a emergência. Nenhuma reabertura foi feita.';}
 finally{ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
}
document.getElementById('retomar-fotos-d1').onclick=()=>executarFotosGuardadas(false);
document.getElementById('baixar-fotos-d1').onclick=()=>executarFotosGuardadas(true);

document.getElementById('testar-origem-assinada').onclick=async()=>{
 if(ocupadoAcao||!token)return;
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 status.textContent='Conferindo canal assinado de uma capa publicada. Não cria backup nem ativa manutenção…';
 try{
  const r=await fetch('/api/testar-origem-assinada',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
  status.textContent=await r.text();if(r.status===403)limpar();
 }catch{status.textContent='Não foi possível confirmar o canal assinado. Nenhuma conclusão obtida; não alterou a manutenção.';}
 finally{ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
};

document.getElementById('testar-conteudo-build').onclick=async()=>{
 if(ocupadoAcao||!token)return;
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 status.textContent='Conferindo canal assinado de conteúdo publicado. Não cria backup nem ativa manutenção…';
 try{
  const r=await fetch('/api/testar-conteudo-build',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
  status.textContent=await r.text();if(r.status===403)limpar();
 }catch{status.textContent='Não foi possível confirmar o canal de conteúdo. Nenhuma conclusão obtida; não alterou a manutenção.';}
 finally{ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
};

document.getElementById('consultar-agendamento').onclick=async()=>{
 if(ocupadoAcao||!token)return;
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 status.textContent='Consultando último resultado registrado. Não dispara build…';
 try{
  const r=await fetch('/api/status-agendamento',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
  if(r.status===403){limpar();return;}
  const d=await r.json();if(!r.ok||!d.ok)throw Error('indisponível');
  const mensagens={desativado:'Rotina desativada.', 'sem-configuracao':'Configuração do hook indisponível.',manutencao:'Publicação pausada por manutenção.','sem-referencia':'Manifesto da versão publicada ausente.','referencia-invalida':'Manifesto da versão publicada inválido.',atualizado:'Revisão publicada atualizada; nenhum build necessário.','limite-ou-espera':'Intervalo de espera ou limite diário atingido.','solicitacao-recente':'Havia solicitação recente; nenhum novo pedido enviado.','tentativa-enviada':'Pedido enviado ao hook; publicação ainda depende de build Ready.','tentativa-sem-confirmacao':'Hook não confirmou o pedido.',indisponivel:'Verificação indisponível; não confirma atualização.'};
  status.textContent='Agendamento '+(d.habilitado?'habilitado no runtime':'desabilitado no runtime')+'. '+(d.ultimaVerificacao?'Última verificação: '+new Date(d.ultimaVerificacao).toLocaleString('pt-BR',{timeZone:'America/Recife'})+' (Recife). '+(mensagens[d.resultado]||'Resultado não reconhecido.'):'Ainda não há verificação registrada nesta versão. Aguarde o próximo minuto 17; a consulta não executa a rotina.')+' Tentativas automáticas em '+d.diaRecife+': '+d.tentativasHoje+'/'+d.limiteDiario+'. Nenhum build, backup ou mudança de manutenção foi disparado por esta consulta.';
 }catch{status.textContent='Não foi possível consultar o agendamento. Nenhum build solicitado pela consulta.';}
 finally{ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
};

document.getElementById('limpar').addEventListener('click',()=>{limpar();status.textContent='Credenciais em memória removidas deste teste. Isso não revoga sessões no Supabase.';});
</script></html>`,200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; font-src data:; connect-src 'self' ${SUPABASE}; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`});
    }
    let aberto=false;
    try { const estado=await env.DB.prepare('SELECT manutencao FROM estado_site WHERE id = 1').first(); aberto=estado?.manutencao===0; } catch {}
    return resposta(aberto?'O site de teste está funcionando normalmente.':'O site de teste está em manutenção.',aberto?200:503,aberto?{}:{'Retry-After':'300'});
  }
};

export default {fetch(request,env){return controlarOperacao(request,env,()=>workerInterno.fetch(request,env));}};
