# Inventário inicial de backup — somente leitura

## Estado da prova

Usuário confirmou no Worker separado: login de administrador/MFA, negativa sem credenciais, ativação de manutenção com cópia fictícia, identificação da cópia no D1, reabertura. Falha de INSERT simulada com trigger confirmou manutenção preservada; trigger removido, nova cópia e reabertura confirmadas. Sessão local limpa. Esses resultados são relatos de teste manual do usuário, não verificação independente por navegador nesta sessão.

Site real continua no GitHub Pages. Nenhum dado editorial foi alterado nesta etapa. Zero Trust não foi ativado porque pediu meio de pagamento; sem contratação por esta implementação.

## Medição pontual do Supabase

Consultas agregadas SELECT, sem exportar textos, dados de Auth ou segredos. Não constituem backup. Projeto casalnaestrada, pjglrlullnchqazxpvyn.

| Tabela | Registros | Bytes aproximados do JSON das linhas |
|---|---:|---:|
| posts | 2 | 3770 |
| albuns | 1 | 1120 |
| trofeus | 31 | 29107 |
| encontros | 3 | 1580 |
| album_fotos | 11 | 3491 |
| album_videos | 0 | 0 |
| trofeu_fotos | 2 | 573 |
| Total | 50 | 39641 |

Métrica soma octet_length(to_jsonb(linha)::text); não inclui envelope, checksums, esquema, índice nem arquivos binários. Inclui todas as linhas visíveis à consulta administrativa, não somente publicadas. Não pressupõe que o token do Worker já possa exportar o mesmo conjunto; verificar RLS na implementação.

Storage: bucket midia público, 2 objetos, 347498 bytes declarados; midia-rascunhos privado, 20 objetos, 3361610 bytes declarados. Total 22 objetos, 3709108 bytes declarados. Nenhum objeto sem metadado de tamanho nesta consulta. São metadados, sem baixar ou validar integridade dos objetos.

Repositório: public/media contém 59 arquivos, 30547149 bytes. Já versionados no Git, mas isso não é cópia externa independente. Esta contagem não cobre necessariamente todas as imagens/assets do repositório ou URLs externas.

## Escopo proposto, ainda não implementado

1. Snapshot consistente das sete tabelas editoriais, com IDs/relacionamentos e rascunhos preservados; versão, contagem por tabela e hash. Usar autorização administrativa/MFA existente, sem service_role no cliente. Não rotular como backup completo do Supabase.
2. Manifesto de mídia com bucket/caminho/tamanho/hash quando disponível. Só manifesto não recupera objetos apagados. Copiar os binários privados/públicos para destino privado independente antes de anunciar proteção dos arquivos. Verificar referências externas e arquivos versionados.
3. Exportação autenticada/download do pacote para cópia fora do banco de origem, teste de integridade e restauração isolada sem substituir dados reais. Sem rota pública de download.
4. Retenção limitada e limite de tamanho antes de armazenar. Confirmar cotas e limites atuais do D1/Workers e limites por linha antes de escolher formato. Fotos NÃO vão em JSON/base64 no D1. D1 pode guardar metadados ou pequenos dados editoriais, sujeito a validação; não usar como depósito binário.
5. Backup editorial e backup de arquivos devem ter status separados. Snapshot de incidente não garante cópia íntegra anterior; não sobrescrever cópia anterior. Não exportar Auth/senhas/tokens.

## Próxima etapa isolada

Preparar formato do pacote editorial e teste automatizado de ida/volta com fixtures, contagens, referências e rejeição de pacote truncado/adulterado. Somente após validar formato, implementar leitura autenticada/consistente dos dados reais e destino privado. Não criar RPC/migração/deploy nem copiar dados reais para Cloudflare sem explicar e aprovar essa mudança.

## Bloqueio real continua pendente

O protótipo só bloqueia a página de teste. Implantação real exige revisão de concorrência, auditoria, limites de requisição, cache, rotas administrativas, origem alternativa GitHub Pages e acesso REST/Storage direto ao Supabase. Bucket público e objetos previamente baixados não são contidos pelo Worker. Sem migração/desativação do Pages nesta etapa.
