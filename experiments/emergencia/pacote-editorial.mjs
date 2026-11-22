/** Formato experimental, sem acesso à rede ou banco. Checksum NÃO é assinatura. */
export const TABELAS = Object.freeze(['posts','albuns','trofeus','encontros','album_fotos','album_videos','trofeu_fotos']);
export const LIMITE_BYTES = 2 * 1024 * 1024;
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
export async function criarPacote(dados, criadoEm = new Date().toISOString()) {
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
export async function abrirPacote(texto) {
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
export async function prepararRecuperacaoIsolada(texto) {
  const {dados} = await abrirPacote(texto);
  // Somente representação em memória. Não executa SQL, não faz upsert em produção.
  return TABELAS.map(tabela=>({tabela,linhas:structuredClone(dados[tabela])}));
}
