import assert from 'node:assert/strict';
import { criarControleAcesso } from '../src/lib/controle-acesso.js';
const eventos = [];
let resposta = { data: true, error: null };
let verificar = async () => resposta;
const controle = criarControleAcesso({
 verificar: () => verificar(),
 aguardando: () => eventos.push('aguardando'),
 permitido: () => eventos.push('permitido'),
 negado: motivo => eventos.push(motivo),
 saiu: () => eventos.push('saiu'),
});
await controle.atualizar(null); assert.deepEqual(eventos,['saiu']);
eventos.length=0;
await controle.atualizar({user:{id:'conta-teste'}});assert.deepEqual(eventos,['aguardando','permitido']);
resposta = {data:false,error:null};eventos.length=0;
await controle.atualizar({user:{id:'conta-teste'}});assert.deepEqual(eventos,['aguardando','permissao']);
resposta = {data:true,error:{message:'erro'}};eventos.length=0;
await controle.atualizar({user:{id:'conta-teste'}});assert.deepEqual(eventos,['aguardando','conexao']);
verificar = async () => {throw new Error('offline');};eventos.length=0;
await controle.atualizar({user:{id:'conta-teste'}});assert.deepEqual(eventos,['aguardando','conexao']);
let resolver;
verificar = () => new Promise(r=>{resolver=r;});eventos.length=0;
const pendente = controle.atualizar({user:{id:'conta-teste'}});
await controle.atualizar(null);
resolver({data:true,error:null});await pendente;
assert.deepEqual(eventos,['aguardando','saiu']);
eventos.length=0;
const outro = controle.atualizar({user:{id:'conta-teste'}});
controle.invalidar();resolver({data:true,error:null});await outro;
assert.deepEqual(eventos,['aguardando']);
// Falha fechada: valores truthy não são autorização booleana do servidor.
verificar = async () => ({data:'true',error:null});eventos.length=0;
await controle.atualizar({user:{id:'conta-teste'}});assert.deepEqual(eventos,['aguardando','permissao']);
console.log('Acesso: autorização, negativa, erro de rede, logout concorrente e resposta obsoleta OK.');
// Mesmo com data=true, indicação de segundo fator nunca libera o painel.
const mfaEventos=[];
const mfaControle=criarControleAcesso({
 verificar:async()=>({data:true,mfa:true}), aguardando:()=>{}, permitido:()=>mfaEventos.push('liberou'),
 negado:()=>mfaEventos.push('negou'), saiu:()=>{}, segundoFator:()=>mfaEventos.push('desafio'),
});
await mfaControle.atualizar({user:{id:'conta-teste'}});
assert.deepEqual(mfaEventos,['desafio']);
console.log('Acesso: segundo fator encaminha ao desafio sem liberar o editor.');
