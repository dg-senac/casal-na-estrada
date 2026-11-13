/** A interface só abre após confirmação do banco. RLS/RPCs são a barreira real. */
export function criarControleAcesso({ verificar, aguardando, permitido, negado, saiu }) {
  let versao = 0;
  return {
    invalidar() { versao += 1; },
    async atualizar(sessao) {
      const rodada = ++versao;
      const conta = sessao?.user;
      if (!conta) { saiu(); return; }
      aguardando(conta);
      try {
        const { data, error } = await verificar();
        if (rodada !== versao) return; // logout/troca de conta durante a requisição
        if (error) { negado('conexao'); return; }
        if (data !== true) { negado('permissao'); return; }
        permitido(conta);
      } catch {
        if (rodada === versao) negado('conexao');
      }
    },
  };
}
