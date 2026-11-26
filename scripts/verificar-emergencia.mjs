import {spawnSync} from 'node:child_process';
const testes=[
 'experiments/emergencia/gerar-worker-fotos.mjs',
 'scripts/gerar-conferencia-offline.mjs',
 'scripts/gerar-ensaio-local.mjs',
 ...['emergencia-prototipo','emergencia-autorizacao','emergencia-botao','hora-encontros','pacote-editorial','recuperacao-editorial-banco','captura-editorial','download-editorial','worker-download-completo','backup-real-d1','conferir-backup','baixar-copia-guardada','controle-operacoes','controle-operacoes-sqlite','backup-fotos','fotos-browser','conferencia-conjunta','ensaio-local','restaurar-colunas-local','restauracao-rls-local','emergencia-admin','fotos-d1-local','snapshot-fotos','fotos-guardadas-api','midia-publica-candidata','assinatura-origem','origem-protegida-banco','edge-origem-candidata','edge-origem-bundle','canal-assinado','midia-protegida','conteudo-build-candidato','leitor-build-integracao','ativacao-canal-build','publicacao-cloudflare','agendamento-publicacao','controle-visual','manutencao-visual','endereco-site'].map(t=>'tests/'+t+'.mjs'),
];
for(const arquivo of testes){
 const r=spawnSync(process.execPath,[arquivo],{stdio:'inherit',env:process.env});
 if(r.status!==0){console.error('Falhou:',arquivo);process.exit(r.status||1);}
}
console.log('Suíte de emergência concluída localmente. Não realiza deploy nem usa dados/credenciais reais.');
