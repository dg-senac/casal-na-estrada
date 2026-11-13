// Não persistir QR, chave TOTP ou códigos. O SDK gerencia somente a sessão.
export function criarTelaMfa({ app, client, voltar, concluido, sair, documento = document }) {
  let atual = 0;
  let fatorPendente = null;
  let raiz = null;
  const vivo = n => n === atual && raiz?.isConnected;
  const limpar = () => {
    atual += 1;
    if (raiz) { raiz.replaceChildren(); raiz.remove(); }
    raiz = null;
    // Não remover fatores no dispose: a confirmação pode estar em andamento.
    // Fatores incompletos não ativam 2FA; podem ser descartados explicitamente.
    fatorPendente = null;
  };
  const base = (titulo, texto) => {
    limpar();
    app.innerHTML = `<div class="pn-entrada"><section class="pn-entrada__caixa pn-mfa" aria-labelledby="pn-mfa-titulo">
      <p class="pn-marca">Casal na Estrada<span>Segurança do painel</span></p>
      <h1 id="pn-mfa-titulo"></h1><p data-explicacao></p>
      <p role="status" aria-live="polite" data-mfa-status></p><div data-conteudo></div>
    </section></div>`;
    raiz = app.firstElementChild;
    raiz.querySelector('h1').textContent = titulo;
    raiz.querySelector('[data-explicacao]').textContent = texto;
    return ++atual;
  };
  const status = texto => { if (raiz) raiz.querySelector('[data-mfa-status]').textContent = texto; };
  const formulario = () => {
    const form = documento.createElement('form');
    form.innerHTML = `<label class="pn-campo"><span>Código do aplicativo</span>
      <input name="codigo" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required aria-label="Código de seis dígitos do aplicativo" /></label>
      <button class="pn-btn" type="submit">Confirmar código</button>`;
    return form;
  };
  const botao = (texto, acao) => {
    const b = documento.createElement('button');
    b.type = 'button'; b.className = 'pn-btn pn-btn--claro'; b.textContent = texto;
    b.addEventListener('click', acao); return b;
  };
  const confirmar = (form, obterFator, n, cadastro = false) => {
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (form.querySelector('[type="submit"]').disabled) return;
      const campo = form.querySelector('[name="codigo"]');
      const codigo = campo.value.trim();
      if (!/^\d{6}$/.test(codigo)) { status('Digite os seis números do aplicativo.'); return; }
      if (cadastro && !form.querySelector('[name="recuperacao"]').checked) {
        status('Confirme que preparou uma forma segura de recuperar o autenticador.'); return;
      }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      const retorno = raiz.querySelector('[data-voltar]');
      if (retorno) retorno.disabled = true;
      campo.value = ''; status('Confirmando…');
      try {
        const { error } = await client.auth.mfa.challengeAndVerify({ factorId: obterFator(), code: codigo });
        if (!vivo(n)) return;
        if (error) {
          status('Não foi possível confirmar. Confira o código, a hora automática do celular e a conexão. Se tentou várias vezes, aguarde antes de repetir.');
          return;
        }
        fatorPendente = null;
        limpar();
        concluido(cadastro);
      } catch {
        if (vivo(n)) status('Sem conexão para confirmar. Tente novamente quando a internet voltar.');
      } finally {
        if (vivo(n)) { submit.disabled = false; if (retorno) retorno.disabled = false; }
      }
    });
  };
  const desafio = async () => {
    const n = base('Confirme o segundo fator', 'Abra seu aplicativo autenticador e digite o código para entrar. Sem ele, o painel permanece bloqueado.');
    const conteudo = raiz.querySelector('[data-conteudo]');
    conteudo.append(botao('Sair / trocar conta', sair));
    status('Buscando autenticadores…');
    try {
      const { data, error } = await client.auth.mfa.listFactors();
      if (!vivo(n)) return;
      if (error) { status('Não foi possível consultar os autenticadores. Saia e tente entrar novamente.'); return; }
      const fatores = (data?.totp ?? []).filter(f => f.status === 'verified');
      if (!fatores.length) { status('Nenhum autenticador de aplicativo disponível. Procure o responsável pelo site para recuperar o acesso.'); return; }
      const select = documento.createElement('select');
      select.setAttribute('aria-label', 'Escolher autenticador');
      fatores.forEach((f,i) => {
        const option = documento.createElement('option'); option.value = f.id;
        option.textContent = f.friendly_name || `Autenticador ${i+1}`; select.append(option);
      });
      const form = formulario();
      if (fatores.length > 1) form.prepend(select);
      confirmar(form, () => select.value, n);
      conteudo.prepend(form);
      status('Nunca compartilhe este código. Se perdeu o celular, use o backup do autenticador ou procure o responsável pelo site.');
      form.querySelector('input').focus();
    } catch { if (vivo(n)) status('Falha de conexão. Saia e entre novamente para tentar.'); }
  };
  const configurar = (ativo) => {
    const n = base(ativo ? '2FA ativo nesta conta' : 'Ativar verificação em duas etapas', ativo
      ? 'Novos logins exigem senha e código do autenticador. Não remova o aplicativo nem seu backup.'
      : 'Use Google Authenticator, Microsoft Authenticator ou outro aplicativo compatível com TOTP. A proteção só será ativada após confirmar o primeiro código.');
    const conteudo = raiz.querySelector('[data-conteudo]');
    const voltarSeguro = async () => {
      const id = fatorPendente;
      if (id) {
        status('Descartando configuração incompleta…');
        try {
          const { error } = await client.auth.mfa.unenroll({ factorId: id });
          if (!vivo(n)) return;
          if (error) { status('Não foi possível descartar agora. Tente novamente; a configuração não confirmada não ativa o 2FA.'); return; }
        } catch { if (vivo(n)) status('Sem conexão para descartar a configuração.'); return; }
      }
      limpar(); voltar();
    };
    const retorno = botao('Voltar ao painel', voltarSeguro);
    retorno.dataset.voltar = '';
    conteudo.append(retorno);
    if (ativo) return;
    const gerar = botao('Gerar QR code', async () => {
      gerar.disabled = true; retorno.disabled = true;
      status('Preparando o autenticador…');
      try {
        const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Casal na Estrada ${Date.now()}`, issuer: 'Casal na Estrada' });
        if (!vivo(n)) return;
        if (error || !data?.totp) { status('Não foi possível preparar o 2FA. Verifique a conexão e tente novamente.'); gerar.disabled = false; return; }
        fatorPendente = data.id;
        const area = documento.createElement('div');
        const img = documento.createElement('img');
        const qr = data.totp.qr_code;
        // Exibir SVG como imagem isolada, nunca como HTML injetado.
        if (qr.startsWith('data:image/svg+xml;utf-8,')) {
          const svg = qr.slice('data:image/svg+xml;utf-8,'.length);
          img.src = svg.trim().startsWith('<') ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : qr;
        } else if (qr.startsWith('data:image/')) img.src = qr;
        img.alt = 'QR code privado para cadastrar seu aplicativo autenticador';
        img.width = 220; img.height = 220;
        const details = documento.createElement('details');
        const summary = documento.createElement('summary'); summary.textContent = 'Não consigo escanear: ver chave manual';
        const chave = documento.createElement('code'); chave.textContent = data.totp.secret;
        details.append(summary, chave);
        const form = formulario();
        const label = documento.createElement('label'); label.className = 'pn-mfa__backup';
        label.innerHTML = '<input type="checkbox" name="recuperacao" required /> Tenho uma forma segura de recuperar o autenticador (backup do aplicativo ou chave guardada em gerenciador de senhas).';
        form.querySelector('button').before(label);
        confirmar(form, () => data.id, n, true);
        area.append(img, details, form);
        gerar.replaceWith(area);
        status('Escaneie o QR no seu celular. QR e chave são secretos: não envie por mensagem nem guarde em fotos compartilhadas.');
      } catch { if (vivo(n)) { status('Falha de conexão. Tente novamente.'); gerar.disabled = false; } }
      finally { if (vivo(n)) retorno.disabled = false; }
    });
    conteudo.prepend(gerar);
  };
  return { desafio, configurar, limpar };
}
