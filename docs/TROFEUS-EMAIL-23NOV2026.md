# Fotos do e-mail “Troféus”

Mensagem mais recente localizada:1a20b0486a5d2cae, assunto exatoTroféus,23nov2026,12JPEG. Anexos baixados via Gmail; nenhuma mensagem enviada/modificada. Só seleção de imagens, sem restilizaçãoIA/filtro/corte. Novas composições já vieram assim do usuário. Originais locais em gmail/ ignorado pelo Git;10imagens selecionadas copiadas byte a byte para diretório próprio em public/media/trofeus/email-trofeus-23nov2026. Arquivos antigos NÃO sobrescritos/apagados.

## Resultado da conferência visual +31registros atuais

|Arquivo|Destino|Ação|
|---|---|---|
|179512.jpg|2ºNova Cruz Moto Rock2026|trocar foto|
|179746.jpg|Estradeiras Arretadas4ºaniversário2025|trocar foto, preservar2023/2026|
|179749.jpg|11ºIati Moto Fest2025|trocar foto|
|179753.jpg|Camping Moto Casais2026|trocar foto|
|179756.jpg|2ºFazenda Nova/Estradeiros da Paixão2026|trocar foto|
|179768.jpg|3ºMotoFest Vertentes2026|trocar foto|
|179772.jpg|5ºGravatá MotoFest2026|trocar foto|
|179775.jpg|Moto Culto14/05/2026|trocar foto|
|179759.jpg|XIII Pesqueira MotoFest2026|novo, sem data exata inventada|
|179763.jpg|Bezerros Moto Fest|novo, ano/data desconhecidosNULL|
|179762.jpg|Capibaribe2025|PENDENTE: numeral estilizado VIII/VIIII ambíguo. Não substituir IX/2026; confirmar edição antes de criar/associar|
|179780.jpg|Casal em destaque|excluída por orientação anterior de não usar fotos de pessoas|

Imagens com motociclistas decorativos de fundo continuam centradas no troféu; foto retrato do casal não publicada. Se usuário quiser abrir exceção, pedir decisão específica.

Comunicação inicial dizia3peças novas antes da ampliação do Capibaribe; resultado final seguro são2novas e1pendente. Não afirmar que todas12foram publicadas.

## Publicação em2etapas sem URLs quebradas

1. Publicar10assets e esperarReady. Não ligar foto_url antes de arquivo existir na hospedagem. Nenhuma alteração remota editorial nesta rodada.
2. Aplicar scripts/aplicar-trofeus-email-23nov2026.sql transacional apósReady:8updates somente foto_url/alt com guarda de URLanterior,2inserts ON CONFLICT DO NOTHING. Verificar8matches antes e8updates depois (triggeratualizado_em é existente). Não alterar história/ano/data dos antigos nem crianças trofeu_fotos automaticamente. Novos registros só fatos visíveis, sem datas exatas inventadas.
3. Publicar conteúdo pelo admin/hook ou aguardar verificador de revisão; primeiroReady só disponibiliza arquivos, não prova fotos já ligadas no banco. Sem chavehook no chat, sem REST público/service_role no build.

Testes:tests/trofeus-email-23nov2026.mjs aprovado Nodebuiltin (10hashes/arquivos originais preservados/limites doSQL/sem2023alterado). PILabriu anexos para conferência. Build completo não executado nesta rodada;distnão gerado/publicado pelo agente. Não mudar UI/segurança/Pages.

## Estado do Git nesta retomada

Checkout local estava no commitbaseb449613com trabalhos anteriores como untracked/modificados. gitfetch confirmou origin/arena/bb30d53b-casal-na-estrada em49ac6a3. gitreset--mixed nessa MESMA branch alinhou histórico preservando todos arquivos; nenhuma troca de branch ou reset--hard. Commit desta rodada só inclui novos assets/manifesto/SQL/teste/docs/ignores, não reenvia trabalho anterior.


## Aplicação remota concluída após confirmação Ready

Usuário confirmou Pronto. Releitura encontrou8URLsantigas exatamente como esperado e nenhum dos2novos slugs. execute_query com CTE única atômica aplicou8updates de foto_url/foto_alt e2inserts. Retorno remoto:fotos_atualizadas=8,trofeus_adicionados=2. Releitura confirmou10novas referências, foto_mini e foto_foco NULL em todas (sem miniatura antiga sobrepondo nova foto). Anos/datas/histórias dos8antigos e filhos não alterados. Nenhuma mudança de segurança/RLS/Storage/Pages.

Este commit de registro é enviado à mesma branch conectada ao Cloudflare Builds para recompilar com o novo conteúdo. Até o próximoReady, HTML público pode mostrar versão anterior; admin já vê os novos valores. Capibaribe permanece pendente e foto do casal não foi usada. Não declarar aparência hospedada conferida antes do usuário abrir a coleção depois doReady.
