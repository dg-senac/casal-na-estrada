export const LIMITE_INATIVIDADE = 30 * 60 * 1000;
export const ANTECEDENCIA_AVISO = 2 * 60 * 1000;

/** Só identifica o relógio local; não verifica nem autoriza JWTs. */
export function identificadorSessao(sessao, decodificar = globalThis.atob) {
  const uid = sessao?.user?.id;
  if (!uid) return null;
  try {
    const parte = sessao.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const dados = JSON.parse(decodificar(parte));
    if (typeof dados.session_id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(dados.session_id)) return `${uid}:${dados.session_id}`;
  } catch { /* Sessões sem identificador compartilham o relógio da conta. */ }
  return uid;
}

/** Relógio de interface, compartilhado entre abas; sem tokens ou textos salvos. */
export function criarRelogioInatividade({ armazenamento, agora = Date.now,
  limite = LIMITE_INATIVIDADE, antecedencia = ANTECEDENCIA_AVISO,
  avisar, ocultarAviso, expirar }) {
  let id = null, ultima = 0, expirada = false, emAviso = false;
  const chave = () => id ? `cne:inatividade:${id}` : null;
  const ler = () => { try { return armazenamento?.getItem(chave()) ?? null; } catch { return null; } };
  const gravar = valor => { try { armazenamento?.setItem(chave(), valor); } catch { /* memória local como fallback */ } };
  const ocultar = () => { if (emAviso) { emAviso = false; ocultarAviso(); } };
  const encerrar = () => {
    if (!id || expirada) return;
    expirada = true; gravar('expirada'); ocultar(); expirar();
  };
  const verificar = () => {
    if (!id || expirada) return false;
    const valor = ler();
    if (valor === 'expirada') { encerrar(); return false; }
    if (valor !== null) {
      const salvo = Number(valor);
      // Valor inválido ou no futuro não pode prolongar uma sessão.
      if (!Number.isFinite(salvo) || salvo <= 0 || salvo > agora() + 5000) { encerrar(); return false; }
      ultima = Math.max(ultima, salvo);
    }
    if (ultima > agora() + 5000) { encerrar(); return false; }
    const restante = limite - (agora() - ultima);
    if (restante <= 0) { encerrar(); return false; }
    if (restante <= antecedencia) { emAviso = true; avisar(restante); }
    else ocultar();
    return true;
  };
  return {
    iniciar(novoId) {
      if (!novoId) return false;
      if (novoId === id) return verificar(); // refresh do token não renova atividade
      ocultar(); id = novoId; expirada = false;
      const salvo = ler(); ultima = agora();
      if (salvo === null) gravar(String(ultima));
      else if (salvo !== 'expirada') ultima = Number(salvo);
      return verificar();
    },
    atividade(continuar = false) {
      if (!verificar() || (emAviso && !continuar)) return false;
      ultima = agora(); gravar(String(ultima)); ocultar(); return true;
    },
    verificar,
    encerrar,
    parar() { ocultar(); id = null; ultima = 0; expirada = false; },
    get expirada() { return expirada; },
    get emAviso() { return emAviso; },
    get chave() { return chave(); },
  };
}
