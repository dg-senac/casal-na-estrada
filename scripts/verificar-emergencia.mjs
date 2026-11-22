import {spawnSync} from 'node:child_process';
const testes=[
 'experiments/emergencia/gerar-worker-controle.mjs',
 ...['emergencia-prototipo','emergencia-autorizacao','emergencia-botao','hora-encontros','pacote-editorial','recuperacao-editorial-banco','captura-editorial','download-editorial','worker-download-completo','backup-real-d1','conferir-backup','baixar-copia-guardada','controle-operacoes','controle-operacoes-sqlite'].map(t=>'tests/'+t+'.mjs'),
];
for(const arquivo of testes){
 const r=spawnSync(process.execPath,[arquivo],{stdio:'inherit',env:process.env});
 if(r.status!==0){console.error('Falhou:',arquivo);process.exit(r.status||1);}
}
console.log('Suíte de emergência concluída localmente. Não realiza deploy nem usa dados/credenciais reais.');
