// Entrada limitada a instância PGlite criada aqui. Não aceita conexão remota.
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {abrirPacote,TABELAS} from './pacote-editorial.mjs';
const esquema=readFileSync(new URL('./esquema-colunas-observado.sql',import.meta.url),'utf8');
const migracao=readFileSync(new URL('../../supabase/migrations/202611200001_destinos_mapa.sql',import.meta.url),'utf8');
const funcao=migracao.slice(migracao.indexOf('create or replace function'),migracao.indexOf('revoke all')).replaceAll('painel_privado.','restauracao.');
export async function ensaiarColunasReais(texto){
 const carga=await abrirPacote(texto),db=new PGlite();
 try{
  await db.exec(esquema+funcao+`alter table restauracao.posts add check(restauracao.destinos_mapa_validos(destinos_mapa));alter table restauracao.trofeus add check(restauracao.destinos_mapa_validos(destinos_mapa));`);
  const colunas={};
  for(const tabela of TABELAS){const r=await db.query('select column_name from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position',['restauracao',tabela]);colunas[tabela]=r.rows.map(c=>c.column_name);}
  await db.transaction(async tx=>{
   for(const tabela of TABELAS)for(const linha of carga.dados[tabela]){
    // Snapshot to_jsonb de linha completa: não preencher campos silenciosamente.
    if(Object.keys(linha).sort().join('|')!==[...colunas[tabela]].sort().join('|'))throw Error('Colunas divergentes em '+tabela);
    await tx.query(`insert into restauracao.${tabela} select * from jsonb_populate_record(null::restauracao.${tabela},$1::jsonb)`,[JSON.stringify(linha)]);
   }
   // Comparação dentro do Postgres evita normalizações textuais de datas/timestamps.
   for(const tabela of TABELAS){
    const r=await tx.query(`select count(*)::int n from restauracao.${tabela}`);if(r.rows[0].n!==carga.contagens[tabela])throw Error('Contagem divergente');
    for(const linha of carga.dados[tabela]){
     const r=await tx.query(`select to_jsonb(t)=to_jsonb(jsonb_populate_record(null::restauracao.${tabela},$1::jsonb)) as igual from restauracao.${tabela} t where id=$2::uuid`,[JSON.stringify(linha),linha.id]);
     if(r.rows.length!==1||!r.rows[0].igual)throw Error('Conteúdo divergente em '+tabela);
    }
   }
  });
  return {resultado:'insercao-e-releitura-local-aprovadas',contagens:carga.contagens,limite:'Colunas/defaults e constraints de dados observados; não inclui RLS, Auth, triggers, Storage ou site.'};
 }finally{await db.close();}
}
