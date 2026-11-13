/** Aviso separado do formulário: não apaga a edição ao pedir confirmação. */
export function criarAvisoInatividade({ documento = document, continuar, sair }) {
  let caixa = null, focoAnterior = null;
  return {
    mostrar(restante) {
      if (!caixa) {
        focoAnterior = documento.activeElement;
        caixa = documento.createElement('div');
        caixa.className = 'pn-inatividade';
        caixa.dataset.avisoInatividade = '';
        caixa.innerHTML = `<section role="alertdialog" aria-modal="true" aria-labelledby="pn-inatividade-titulo" aria-describedby="pn-inatividade-texto">
          <h2 id="pn-inatividade-titulo">Você ainda está aí?</h2>
          <p id="pn-inatividade-texto">Por segurança, o painel vai sair por inatividade em <strong data-restante></strong>. Alterações não salvas serão descartadas. Continue conectado e salve seu trabalho se precisar.</p>
          <div class="pn-acoes"><button type="button" class="pn-btn" data-continuar>Continuar conectado</button><button type="button" class="pn-btn pn-btn--claro" data-sair>Sair agora</button></div>
        </section>`;
        caixa.querySelector('[data-continuar]').addEventListener('click', continuar);
        caixa.querySelector('[data-sair]').addEventListener('click', sair);
        caixa.addEventListener('keydown', ev => {
          if (ev.key === 'Escape') { ev.preventDefault(); return; }
          if (ev.key !== 'Tab') return;
          const botoes = [...caixa.querySelectorAll('button')];
          const indice = botoes.indexOf(documento.activeElement);
          const proximo = (indice + (ev.shiftKey ? -1 : 1) + botoes.length) % botoes.length;
          ev.preventDefault(); botoes[proximo].focus();
        });
        documento.body.append(caixa);
        if (!documento.hidden) caixa.querySelector('button').focus();
      }
      const segundos = Math.max(0, Math.ceil(restante / 1000));
      caixa.querySelector('[data-restante]').textContent = `${Math.floor(segundos / 60)}min ${String(segundos % 60).padStart(2,'0')}s`;
    },
    ocultar() {
      if (!caixa) return;
      const devolverFoco = caixa.contains(documento.activeElement);
      caixa.remove(); caixa = null;
      if (devolverFoco && !documento.hidden && focoAnterior?.isConnected) focoAnterior.focus();
      focoAnterior = null;
    },
  };
}
