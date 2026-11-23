# Protocolo servidor-servidor — candidato local

Implementado em experiments/emergencia/assinatura-origem.mjs e testado em tests/assinatura-origem.mjs. Sem import pelo Worker, Edge Function ou código de navegador. Não contém segredo real; nenhum segredo gerado/configurado na conta. Nenhuma implantação remota ou alteração RLS/Storage.

## Garantias do protocolo testadas

HMAC SHA256 por Web Crypto com verificação nativa; mensagem canônica com versão/projeto fixo/método/caminho exato/tempo/nonce. Somente GET/HEAD em rotas de mídia permitidas. Segredo exige ao menos 32 bytes (comprimento não garante entropia; produção precisará geração aleatória segura e configuração exclusiva por ambiente). Não serializar segredo nos headers: enviar somente timestamp/nonce/MAC. Não usar chave pública anon como segredo compartilhado.

Janela máxima de 30 segundos e tolerância de 5 segundos no futuro. Nonce UUID aleatório obrigatório; consumidor atômico exclusivo deve ser compartilhado entre instâncias da ORIGEM e falhar fechado se banco indisponível. Expiração nunca antes do fim de validade da assinatura. Não usar Set em memória como proteção real contra replay. Teste usa Set só como fixture explícita. Nonce consumido somente depois de MAC válido, para não permitir esgotar armazenamento com headers aleatórios sem assinatura.

Assinatura válida não prova publicação: guarda estaPublicada separada deve retornar true antes de lerObjeto. Teste prova rascunho não lido mesmo com assinatura válida e pedido sem assinatura não consulta conteúdo. Critério real deve abranger pai/publicado/agendamento por tabela sem confiar no navegador. Adaptadores fornecidos ainda são somente mocks: NÃO estão implementados RPC/armazenamento/consulta de publicação na origem.

Testes aprovados: método/caminho alterados, segredo errado, assinatura expirada/futura, ausência/falha de consumidor, replay sequencial/concorrente, métodos/query/path proibidos, segredo curto, rascunho negado e publicado permitido. Sem fotos reais, rede ou dados de conta.

## Ainda falta antes de usar no site

- Adaptador de nonce atômico na origem com índice/retentiva/rate limit e medição do impacto das escritas/leitura nas cotas gratuitas. Não criar tabela real automaticamente.
- Canal da origem com permissão estritamente delimitada, capaz de ler SÓ imagens publicadas depois da revogação dos caminhos públicos antigos. Manter critérios de publicação no servidor; não adicionar service_role ao Worker/browser como atalho.
- Autorização servidor para build estático após eventual restrição REST. Não fechar REST anon enquanto build usa essa leitura.
- Mapeamento completo de URLs (incluindo Markdown/HTML, miniaturas, capas, zoom) e testes de ponta a ponta no paralelo. O protocolo criptográfico isolado não comprova esse comportamento.
- Plano específico de mudanças remotas e rollback que não reabra conteúdo privado. Precisa autorização do usuário antes de alterar origem e disponibilidades existentes.

Fotos já baixadas/caches anteriores, URLs externas, cópias do Pages e outros clientes fora do Worker não somem com uma assinatura nova. Só ativar proxy não fecha a origem. Não afirmar proteção integral concluída.
