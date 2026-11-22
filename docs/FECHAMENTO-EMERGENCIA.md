# Estado da solução de emergência e próximos portões

## Verificação final local executada

Node 22.23.4: test:emergencia, test:cloudflare:local, test:seguranca e Astro check aprovados. Astro: 23 arquivos, zero erros/avisos/hints. Auth/D1/Storage nos testes de runtime são simulados ou locais. Dist final é fixture, NÃO publicar. Esta execução não fez deploy.

Usuário já confirmou no site paralelo: site completo, login/MFA, manutenção fictícia e reabertura. Backup editorial real anterior validado/guardado; ZIP real 81 arquivos/34.256.257 bytes validado e visualizado localmente. 49 referências reconhecidas encontradas, nenhuma ausente; sem cobertura de imagens embutidas em HTML/Markdown. 50 registros do snapshot previamente fornecido inseridos/relidos em PGlite com colunas e constraints observadas. Não confundir essas provas com restauração integral do Supabase.

Ajuste TRUNCATE autorizado/aplicado e conferido. Não reaplicar migração como se estivesse pendente.

## O que ainda NÃO está entregue

1. Botão de emergência integrado ao canto direito do admin original, com ações reais claramente identificadas e confirmação de risco. O controlador atual é experimental e separado.
2. Backup AUTOMÁTICO independente das fotos no acionamento. ZIP é exportação manual para o computador; D1 guarda cadastros, não binários. Sem solução aprovada dentro das cotas gratuitas, não prometer esse item concluído nem introduzir serviço que exija pagamento/cartão.
3. Recuperação integral em destino isolado: esquema, owners/grants/RLS, Auth e MFA, Storage/políticas, Edge Functions, configuração de publicação e navegação real. Provas locais não replicam todos esses serviços.
4. Contenção das origens: Pages público e acesso direto ao Supabase ainda existem. O Worker de teste não elimina esses caminhos e não revoga sessões ou acesso a cópias já baixadas/caches do navegador.
5. Revisão final de cotas oficiais, retenção/rate limits, monitoramento sem conteúdo sensível, recuperação de trava e procedimentos de incidente. Não foi comprovado plano gratuito ilimitado.

## Procedimento seguro para eventual recuperação integral

- Manter JSON/ZIP originais imutáveis e privados. Nunca importar por cima da produção como primeiro ensaio.
- Destino deve ser vazio/isolado e sem acesso a credenciais reais de publicação. Não criar branch/projeto pago. Não enviar snapshots ao Git ou preview público.
- Catalogar esquema completo e dependências, sem copiar tokens de funções/configuração; guardar segredos em local apropriado, não neste documento/chat.
- Gatilhos publicacao_automatica/disparar_publicacao foram identificados: não recriar/acionar antes de remover dependências de saída no DESTINO ISOLADO. Não desabilitar triggers reais em produção para testar. Atualizações podem alterar atualizado_em; preservar valores na carga e conferir antes de retomar comportamento normal.
- Recriar esquema e funções necessárias no destino, importar pais antes dos filhos em transação com destino vazio e correspondência exata de colunas; verificar contagens e valores tipados. Recriar/testar políticas e grants sem usar dono como única identidade de prova.
- Restaurar arquivos em buckets privados apropriados, verificar hashes/nomes/quantidades e referências, sem transformar rascunhos em públicos. Não sobrescrever os buckets reais.
- Testar visitante, usuário comum, administrador inativo, AAL1 e AAL2, incluindo APIs/RPC/Storage. Login/MFA precisa teste real do usuário no destino; simulação não basta.
- Só conectar publicação externa após aprovação e testes negativos. Manter rollback documentado e backups originais.

## Decisões do usuário e limites de autorização

Permissão para prosseguir cobre trabalho seguro local e consultas de metadados; NÃO é autorização para desligar Pages, alterar DNS, migrar definitivamente, contratar armazenamento ou ativar manutenção real sem coordenação. Não executar ações simultâneas nos dois Workers que compartilham D1.

Próximo passo técnico pode continuar no ambiente paralelo. Não pedir ao usuário que desligue Pages agora: ainda existem itens 1–3 pendentes. Ao precisar de decisão sobre armazenamento automático gratuito ou mudança de hospedagem, apresentar alcance/limites e obter aprovação específica. Não chamar um simples link para /login-teste de botão de emergência concluído.
