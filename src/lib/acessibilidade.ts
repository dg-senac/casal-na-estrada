const CHAVE = 'casal-acessibilidade-v1';
export interface Preferencias { texto: number; contraste: boolean; movimento: boolean }
export function normalizarPreferencias(valor: unknown): Preferencias {
  const v = (valor && typeof valor === 'object' ? valor : {}) as Partial<Preferencias>;
  return {texto: [100,115,130,150].includes(v.texto as number) ? v.texto! : 100, contraste: v.contraste === true, movimento: v.movimento === true};
}
export function iniciarAcessibilidade() {
  const root = document.documentElement;
  const dialog = document.querySelector<HTMLDialogElement>('#opcoes-acessibilidade');
  const abrir = document.querySelector<HTMLButtonElement>('[data-acesso-abrir]');
  if (!dialog || !abrir) return;
  const texto = dialog.querySelector<HTMLSelectElement>('#acesso-texto')!;
  const contraste = dialog.querySelector<HTMLInputElement>('#acesso-contraste')!;
  const movimento = dialog.querySelector<HTMLInputElement>('#acesso-movimento')!;
  const status = dialog.querySelector<HTMLElement>('[data-acesso-status]')!;
  let prefs = normalizarPreferencias(null);
  try { prefs = normalizarPreferencias(JSON.parse(localStorage.getItem(CHAVE) || 'null')); } catch { /* Navegação sem armazenamento continua funcional. */ }
  const aplicar = () => {
    root.style.fontSize = prefs.texto === 100 ? '' : `${prefs.texto}%`;
    root.toggleAttribute('data-alto-contraste', prefs.contraste);
    root.toggleAttribute('data-reduzir-movimento', prefs.movimento);
    texto.value = String(prefs.texto); contraste.checked = prefs.contraste; movimento.checked = prefs.movimento;
    window.dispatchEvent(new Event('acessibilidade:alterada'));
  };
  const salvar = () => {
    prefs = normalizarPreferencias({texto:Number(texto.value),contraste:contraste.checked,movimento:movimento.checked});
    aplicar();
    try { localStorage.setItem(CHAVE,JSON.stringify(prefs)); status.textContent = 'Preferências salvas neste navegador.'; }
    catch { status.textContent = 'Ajustes aplicados nesta página. O navegador não permitiu salvar.'; }
  };
  aplicar();
  abrir.hidden = false;
  abrir.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('[data-acesso-fechar]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => abrir.focus());
  for (const controle of [texto,contraste,movimento]) controle.addEventListener('change',salvar);
  dialog.querySelector('[data-acesso-restaurar]')!.addEventListener('click', () => {
    prefs = normalizarPreferencias(null); aplicar();
    try { localStorage.removeItem(CHAVE); } catch { /* Sem armazenamento. */ }
    status.textContent = 'Preferências restauradas. A preferência de movimento do dispositivo continua valendo.';
  });
  window.addEventListener('storage', event => {
    if (event.key !== CHAVE && event.key !== null) return;
    try { prefs = normalizarPreferencias(JSON.parse(event.newValue || 'null')); aplicar(); } catch { /* Dado inválido ignorado. */ }
  });
}
