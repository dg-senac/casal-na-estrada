/** SOMENTE prova local. Não é um importador do esquema de produção. */
import { abrirPacote, TABELAS } from './pacote-editorial.mjs';
export const ESQUEMA_LOCAL = `
create schema recuperacao;
create table recuperacao.posts (
 id uuid primary key, slug text not null unique check(length(slug)>0),
 data date not null, publicado boolean not null, registro jsonb not null
);
create table recuperacao.albuns (
 id uuid primary key, slug text not null unique check(length(slug)>0),
 data date not null, publicado boolean not null, registro jsonb not null
);
create table recuperacao.trofeus (
 id uuid primary key, slug text not null unique check(length(slug)>0),
 data date, publicado boolean not null, registro jsonb not null
);
create table recuperacao.encontros (
 id uuid primary key, inicio date not null, fim date,
 hora_inicio text check(hora_inicio is null or hora_inicio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 publicado boolean not null, registro jsonb not null,
 check(fim is null or fim>=inicio)
);
create table recuperacao.album_fotos (
 id uuid primary key, album_id uuid not null references recuperacao.albuns(id), registro jsonb not null
);
create table recuperacao.album_videos (
 id uuid primary key, album_id uuid not null references recuperacao.albuns(id), registro jsonb not null
);
create table recuperacao.trofeu_fotos (
 id uuid primary key, trofeu_id uuid not null references recuperacao.trofeus(id), registro jsonb not null
);`;
const campos = {
 posts:['id','slug','data','publicado'], albuns:['id','slug','data','publicado'],
 trofeus:['id','slug','data','publicado'], encontros:['id','inicio','fim','hora_inicio','publicado'],
 album_fotos:['id','album_id'], album_videos:['id','album_id'], trofeu_fotos:['id','trofeu_id'],
};
export async function recuperarLocal(db, texto) {
 const carga = await abrirPacote(texto);
 // PGlite local possui transação exclusiva. Nada de conexão Supabase nesta prova.
 return db.transaction(async tx=>{
   for(const tabela of TABELAS){
     const r=await tx.query(`select count(*)::int as total from recuperacao.${tabela}`);
     if(r.rows[0].total!==0)throw Error('Destino não vazio: recuperação recusada');
   }
   for(const tabela of TABELAS){
     const colunas=campos[tabela];
     for(const linha of carga.dados[tabela]){
       const valores=[...colunas.map(c=>linha[c]??null),JSON.stringify(linha)];
       await tx.query(`insert into recuperacao.${tabela} (${colunas.join(',')},registro) values (${valores.map((_,i)=>'$'+(i+1)).join(',')})`,valores);
     }
   }
   for(const tabela of TABELAS){
     const r=await tx.query(`select count(*)::int as total from recuperacao.${tabela}`);
     if(r.rows[0].total!==carga.contagens[tabela])throw Error('Contagem restaurada divergente');
   }
   return carga.contagens;
 });
}
