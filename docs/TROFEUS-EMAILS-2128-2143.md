# Troféus — e-mails das 21h28 e 21h43

O horário citado como 21h30 corresponde à mensagem de Gissieri Monteiro recebida às 21h28min22s de 18/11/2026 (Recife). A segunda é das 21h43min18s. Foram baixados e inspecionados os 15 anexos e comparados com os 23 cadastros existentes no Supabase.

## Resultado

- **Uma substituição:** Coletamento dos Estradeiros do Rei, 08/11/2026. Mesmo emblema, evento e data; mantém caminho e cadastro.
- **14 inclusões:** Afogados da Ingazeira 2023; João Alfredo Moto Rock (sem ano confirmado); primeiro Moto Culto da Tribo Camarrá; Chá Grande Motofest 2025; Bate e Volta João Alfredo 2026; Caruaru 2025; Orobó 2026; Itabaiana 2025; Chá Grande Motofest 2026; Leões da Mata Norte 2025; MotoConfraria Natal 2025; Paulista 2026; Fora do Eixo 2026; relógio Cabedelo Motofest (sem ano confirmado).

Os nomes, anos e datas foram transcritos das peças; a paisagem de fundo não comprova a realização do evento no local retratado. Não foram inventadas histórias de participação do casal. Chã Grande é a grafia do município; as peças trazem “Chá Grande”.

**Cuidados:**
- Chá Grande tem peças distintas: 1ª edição/2025 e 2ª edição/2026. Nenhuma corresponde a cadastros anteriores.
- Bate e Volta 2026 não substitui o 12º Bate e Volta 2025 nem o Camping Moto Casais.
- Moto Culto da Tribo Camarrá (18/04/2026) não substitui Moto Culto na Direção de Deus (14/05/2026).
- Em Cabedelo, “24 a 26 de abril” não identifica o ano: ano e data completa permanecem nulos.
- João Alfredo Moto Rock não traz ano legível confirmado: permanece sem data.
- Os arquivos foram copiados sem reprocessamento. Anexos originais permanecem no e-mail; a imagem antiga dos Estradeiros do Rei permanece no histórico Git.

O manifesto `scripts/trofeus-emails-2128-2143.json` contém mapeamento individual, ação e SHA-256 de todos os anexos.

## Publicação — pendente

1. Integrar as imagens e confirmar o deploy bem-sucedido.
2. Executar `scripts/cadastrar-trofeus-emails-2128-2143.sql` no banco do site. Este SQL **ainda não foi executado**; usa transação e ignora slugs existentes, sem sobrescrever edições no painel.
3. Recompilar/publicar o site para que os novos cadastros apareçam. O disparo manual via integração GitHub retornou 403 anteriormente; se continuar indisponível, aguardar a execução automática.
4. Confirmar 37 peças publicadas (23 anteriores + 14 novas), se não houver cadastros concorrentes, e as 15 imagens.

Não cadastrar referências públicas às novas imagens antes de elas estarem disponíveis no deploy.
