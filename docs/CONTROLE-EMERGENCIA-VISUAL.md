# Controle protegido — apresentação renovada

Mudança autorizada exclusivamente para /login-teste. Rota, APIs, autenticação/MFA, permissões e funcionamento de backup/manutenção preservados.

- Fundo claro, verde discreto, cards responsivos e títulos Bodoni Moda400. Fonte WOFF2 do pacote já instalado embutida na resposta para funcionar mesmo com assets bloqueados na manutenção, sem GoogleFonts/rede externa.
- Login e etapa MFA claros; ações continuam hidden até autenticação/validação pelo fluxo existente.
- Reabrir site em destaque; backup e ação fictícia em seção avançada recolhida com aviso de bloqueio real.
- Downloads e diagnóstico em seções recolhidas; agendamento apenas consulta resultado, sem fingir indicador de site aberto/fechado não consultado.
- ID de cópia inicialmente vazio em vez de UUID histórico preenchido. IDs de elementos e handlers preservados.
- Fonte da apresentação: experiments/emergencia/controle-visual.html, incorporada pelo gerador gerar-worker-fotos.mjs. Não editar só bundle gerado.
- CSS inline autorizado SOMENTE por nonce; script mantém nonce, sem unsafe-inline/unsafe-eval, font-src data somente, frame-ancestors none preservado. Fonte embutida não depende do ASSETS nem requer abrir rota durante manutenção.
- Confirmação de reabertura agora descreve site, não ambiente de teste. Mensagens históricas de outros handlers ainda podem usar termo teste; nenhum endpoint foi renomeado nesta mudança visual.

Testes Node22.23.4: controle-visual (HTML real em JSDOM, todos IDs únicos/handlers inicializam sem rede, hidden, CSP nonce/fonte embutida), test:cloudflare:local e test:emergencia completo aprovados. Teste visual incluído na suíte. JSDOM não prova aparência real; nenhuma screenshot de navegador foi obtida. Nenhuma ação de emergência/backup remoto disparada. Dist local fixture não publicar.

Após Ready, abrir /login-teste e atualizar a página para ver layout. Não precisa clicar em emergência só para conferir aparência. Prova final de bloqueio/reabertura após corte das origens permanece pendente, não se confunde com redesenho.
