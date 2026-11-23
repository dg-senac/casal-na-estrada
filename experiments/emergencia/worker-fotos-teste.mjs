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
      return resposta(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Login isolado de teste</title>
<h1>Teste de acesso administrativo</h1><p>Ambiente separado. A manutenção afeta somente este Worker. Há ações fictícias e uma ação identificada para guardar cadastros REAIS no D1. Não altera o GitHub Pages.</p>
<form id="login"><p><label>E-mail <input id="email" type="email" autocomplete="username" required maxlength="254"></label></p>
<p><label>Senha <input id="senha" type="password" autocomplete="current-password" required maxlength="1024"></label></p><button>Entrar</button></form>
<form id="mfa" hidden><p><label>Código do aplicativo autenticador <input id="codigo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label></p><button>Validar segundo fator</button></form>
<section id="acoes" hidden><p>Controle de operações ativo: manutenção e reabertura são serializadas e registradas no D1. Trava incerta exige conferência, sem liberação automática.</p><h2>Emergência — somente teste</h2>
<p>A cópia fica no mesmo D1. Não é backup independente nem backup real do site.</p>
<button id="emergencia" type="button">Ativar manutenção e copiar dados fictícios</button>
<button id="reabrir" type="button">Reabrir ambiente de teste</button>
<h2>Download manual de cadastros REAIS</h2>
<p>Inclui rascunhos do Supabase. Não inclui fotos, senhas ou tokens. Guarde em local privado. Não salva conteúdo real no D1 e não altera o GitHub Pages.</p>
<h2>Emergência do TESTE + cópia editorial REAL</h2>
<p>Ativa manutenção só neste endereço e armazena os cadastros reais, incluindo rascunhos, em tabela privada do D1. Sem arquivos de fotos. Máximo 5 cópias de até 1 MiB; sem exclusão automática. Não é backup completo nem proteção do GitHub Pages.</p>
<button id="backup-real" type="button">Manutenção do TESTE + guardar cadastros REAIS</button>
<h2>Conferir cópia já guardada</h2><p>Somente leitura: recalcula checksum sem exibir cadastros ou gerar outra cópia.</p>
<label>ID da cópia <input id="id-copia" maxlength="36" value="2988653f-e376-40cd-a687-5c52a7f370f6"></label>
<button id="conferir" type="button">Conferir cópia no D1</button>
<button id="baixar-guardada" type="button">Baixar esta cópia guardada no D1</button>
<p>Inclui rascunhos. Não cria nova cópia nem consulta os cadastros atuais. Guarde o arquivo em pasta privada. Não inclui os arquivos das fotos.</p>
<h2>Teste do canal de conteúdo para build</h2>
<p>Confere somente conteúdo publicado. Não altera conteúdo, backup ou manutenção.</p>
<button id="consultar-agendamento" type="button">Consultar agendamento automático</button>
<button id="testar-conteudo-build" type="button">Testar canal de conteúdo do build</button>
<h2>Teste isolado do canal de imagens</h2>
<p>Não cria backup, não ativa manutenção e não troca as imagens do site.</p>
<button id="testar-origem-assinada" type="button">Testar canal assinado de imagens</button>
<h2>Fotos do Supabase guardadas no D1</h2>
<p>Use o ID da cópia editorial no campo abaixo. Retoma as fotos sem criar outro backup de cadastros. Até 3 conjuntos, 100 arquivos, 1 MiB por arquivo e 8 MiB por conjunto. Não inclui public/media. A aba precisa ficar aberta; se interromper, retome com o mesmo ID.</p>
<button id="retomar-fotos-d1" type="button">Copiar ou retomar fotos do Supabase no D1</button>
<button id="baixar-fotos-d1" type="button">Baixar fotos guardadas no D1 (ZIP)</button>
<h2>Arquivos das fotos — ZIP privado no computador</h2>
<p>Inclui public/media e arquivos visíveis dos buckets midia/midia-rascunhos. Pode incluir rascunhos. Não inclui URLs externas, cadastros ou tudo que existe na conta. Limites: 60 MiB no total e 10 MiB por arquivo. Não é backup automático no D1.</p>
<button id="baixar-fotos" type="button">Baixar arquivos de mídia (ZIP)</button>
<p><label>Conferência local, sem enviar arquivo: <input id="zip-local-fotos" type="file" accept=".zip,application/zip"></label></p>
<button id="verificar-fotos" type="button">Conferir ZIP local neste navegador</button>
<button id="baixar" type="button">Baixar pacote editorial real (JSON)</button></section>
<p id="status" role="status" aria-live="polite"></p><button id="limpar" type="button">Limpar sessão deste teste</button>
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
   : 'Reabrir SOMENTE o ambiente de teste?';
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
</script></html>`,200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self' ${SUPABASE}; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`});
    }
    let aberto=false;
    try { const estado=await env.DB.prepare('SELECT manutencao FROM estado_site WHERE id = 1').first(); aberto=estado?.manutencao===0; } catch {}
    return resposta(aberto?'O site de teste está funcionando normalmente.':'O site de teste está em manutenção.',aberto?200:503,aberto?{}:{'Retry-After':'300'});
  }
};

export default {fetch(request,env){return controlarOperacao(request,env,()=>workerInterno.fetch(request,env));}};
