# Investigação de backup binário limitado no D1

## Estado confirmado pelo usuário antes desta etapa

Botão Emergência — teste apareceu no admin e modal correto. Usuário acionou manutenção e backup real ID b14640fe-20fe-4ede-b4f9-ed751d42ee9d. Conferência hospedada: checksum válido, sete tabelas, relações consistentes, 50 registros. Reabertura confirmada e limpeza de sessão relatada. Não repetir emergência apenas para provar o que já foi validado.

## Fontes oficiais consultadas

https://developers.cloudflare.com/d1/platform/limits/ : Free 500 MB por banco, 5 GB por conta; máximo string/BLOB/linha 2.000.000 bytes, 50 queries por invocation Free. https://developers.cloudflare.com/d1/platform/pricing/ : Free 5M linhas lidas/dia e 100k escritas/dia; excesso no Free causa erros/rejeição, não upgrade automático documentado. Outros recursos/planos também têm limites: não inferir gratuidade da conta inteira ou capacidade disponível só pela tabela oficial. Nenhuma configuração de billing foi lida/alterada.

## Experimento executado

Módulo fotos-d1-local.mjs NÃO importado pelo Worker, sem rota pública, sem deploy. Teste fotos-d1-local.mjs usa D1 emulado com fixtures binárias. BLOB 250000 bytes persistido/relido com SHA256 igual; nomes/ID/tamanho validados; duplicação não sobrescreve. Limite conservador experimental: 1 MiB por objeto, 100 objetos, 16 MiB de dados totais. INSERT condicional limita quantidade/soma na mesma instrução. Prova incluiu 15 objetos de 1 MiB e recusou próximo objeto acima da soma, preservando 16 linhas. Não são fotos reais nem prova de latência/CPU na Cloudflare hospedada.

Reavalia recomendação anterior de não usar D1 como depósito de mídia SOMENTE como possibilidade experimental pequena e limitada; não abandona recomendação de usar armazenamento de objetos em escala. Inventário antigo de 22 objetos/3.709.108 bytes sugere volume pequeno mas NÃO comprova tamanho máximo por objeto atual ou viabilidade operacional. Imagens do Git e imagens privadas têm estratégias diferentes; código versionado sozinho não equivale a cópia externa independente.

## Ainda não é backup automático

Faltam protocolo de snapshot completo (em andamento/concluído/falhou), manifesto imutável, vínculo com backup editorial, número de versões/retentiva sem apagar último íntegro, download autenticado e revalidação das cópias armazenadas, retomada segura, rate limit/cotas e autorização estrita de leitura/gravação. Transferência precisa separar leituras Storage/auth/hash/escritas em lotes que respeitem CPU/subrequests do Workers Free; não executar tudo num request sem comprovar limites. Conclusão só após bytes persistidos e hashes relidos, não após apenas manifesto. Falha de foto não pode reabrir manutenção nem anunciar backup completo.

Nada criado no D1 real ou alterado no banco/Worker nesta investigação. Não pedir ao usuário executar SQL desse protótipo. Implementar/testar fluxo integrado antes de propor ativação hospedada; obter confirmação específica de armazenamento de binários privados no D1 e conferir plano/cotas reais antes de usar dados reais. ZIP guardado segue sendo a cópia binária validada.
