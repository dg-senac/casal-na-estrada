# Conferência das imagens recebidas de Gissieri Monteiro

Origem: mensagem de Gissieri Monteiro, sem assunto, com 11 anexos `IMG-20261118-WA0001.jpg` a `IMG-20261118-WA0011.jpg`. Conferência visual com os 14 cadastros publicados e as imagens existentes no repositório. As imagens recebidas foram usadas como fornecidas, sem geração, retoque ou alteração das inscrições.

## Substituições confirmadas

| Anexo | Arquivo público substituído | Evidência |
|---|---|---|
| WA0002 | `public/media/trofeus/toritama-motofest-2025.jpg` | Nome Toritama Motofest, ano 2025, Dark Angel MC e datas 19, 20 e 21 de setembro; desenho de moto com asas e chamas coincide com a peça anterior. |
| WA0004 | `public/media/trofeus/gravata-motofest-2025.jpg` | Gravatá Motofest, ano 2025 e quatro estrelas; caveira de capacete no guidão coincide com a peça anterior. Não corresponde à peça de 2026. |

Os caminhos já são usados pelo banco, portanto não é necessário mudar registros para substituir essas duas imagens. Os arquivos anteriores permanecem no histórico Git. A troca só chega ao site após integração e deploy.

## Outros anexos — não associados automaticamente

| Anexo | Inscrição/identificação visível | Decisão |
|---|---|---|
| WA0001 | 5º aniversário Estradeiras Arretadas, 23/08/2026 | Não substitui o 2º aniversário de 2023 nem o 4º de 2025. Sem cadastro correspondente. |
| WA0003 | Edição comemorativa, 15 anos, peça circular clara | Não há correspondência segura na sala; nome do clube precisa de confirmação. |
| WA0005 | Amigos do Asfalto Moto Clube, 2º aniversário, #eufui | Sem cadastro correspondente. |
| WA0006 | 12º Bate e Volta, João Alfredo–PE, 2025 | Não confundir com 2º Camping Moto Casais de 2026, também em João Alfredo. Sem cadastro correspondente. |
| WA0007 | Car Rock Festival, encontro de carros antigos e motocicletas, Lajedo, 2026 | Sem cadastro correspondente. |
| WA0008 | Caveiras 100 Limites, 10 anos, Bate e Fica, 2026, 28 a 01 de março | Sem cadastro correspondente; não inferir intervalo de datas completo. |
| WA0009 | Toritama MotoFest 2026, 25, 26 e 27 de setembro | Não substitui o Toritama 2025. Sem cadastro correspondente. |
| WA0010 | Estradeiros da Paixão, Primeiro Encontro de Motociclistas de Fazenda Nova | O cadastro é da 2ª edição de 2026, com peça diferente. Ano da edição não comprovado: “desde 2023” no emblema não comprova ano do encontro. |
| WA0011 | IX Capibaribe Motofest, Santa Cruz do Capibaribe, 30 e 31 de outubro de 2026 | Sem cadastro correspondente. |

Não foram criados cadastros novos, nem alterados nomes, datas ou histórias para acomodar imagens sem correspondência. Os anexos permanecem no e-mail original.

## Peças cadastradas sem nova imagem correspondente (12)

- 2º aniversário Estradeiras Arretadas — 2023.
- 4º aniversário Estradeiras Arretadas — 2025.
- Moto Culto na Direção de Deus — 2026.
- 2º Fazenda Nova MotoFest / Estradeiros da Paixão — 2026.
- 2º Camping Moto Casais — 2026.
- 5º Gravatá Motofest — 2026.
- Coletamento dos Estradeiros do Rei — 2026.
- 3º MotoFest Vertentes — 2026.
- 11º Iati Moto Fest — 2025.
- BMW M 1000 RR em LEGO.
- Árvore das praias do Rio Grande do Norte.
- Casinha Eu amo Gravatá.

“Sem nova imagem” significa ausente deste envio, não ausente da sala: as imagens anteriores foram preservadas.

## Complemento — inclusão das nove peças autorizada

Após a conferência, o usuário enviou as 11 imagens no chat e autorizou incluir as nove peças/edições ausentes, preservando as antigas. A identificação legível corrige dois nomes do levantamento inicial: **Anjos do Asfalto**, não Amigos do Asfalto, e **Mulheres no Asfalto — Olinda**, edição comemorativa de 15 anos.

- As nove imagens foram copiadas dos anexos enviados no chat para `public/media/trofeus/`, sem reprocessamento.
- `scripts/trofeus-recebidos.json` relaciona cada anexo ao novo arquivo e slug.
- `scripts/cadastrar-trofeus-recebidos.sql` contém os nove cadastros autorizados. Anos e datas não comprovados ficam nulos. Os textos descrevem apenas o que aparece nas peças, sem inventar experiências pessoais.
- Toritama 2025 e Gravatá 2025 já haviam sido substituídos e não são duplicados.
- Os 14 cadastros existentes e suas imagens são preservados; após a inclusão, a sala deve totalizar 23 peças, se nenhum outro cadastro tiver sido feito no intervalo.

### Ordem de publicação

1. Integrar o PR e aguardar o deploy bem-sucedido das nove imagens.
2. Executar o SQL de cadastro no projeto do site. Não executar antes do deploy, para evitar referências públicas a imagens inexistentes.
3. Aguardar o próximo build da agenda automática do site (ou iniciar o workflow de publicação) para incorporar os novos registros.
4. Conferir as nove páginas e a contagem na sala de troféus.

O SQL usa transação e `ON CONFLICT (slug) DO NOTHING`: uma nova execução não duplica slugs nem sobrescreve alterações no painel. **O cadastro no banco ainda não foi executado nesta preparação.**
