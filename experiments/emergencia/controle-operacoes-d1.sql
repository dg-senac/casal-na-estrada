-- Preparação SOMENTE no D1 casal-emergencia-teste.
-- Estas tabelas não ativam bloqueios: o Worker ainda precisa ser atualizado/testado.
CREATE TABLE IF NOT EXISTS controle_operacoes (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  operacao_id TEXT,
  usuario_id TEXT,
  expira_em INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO controle_operacoes (id) VALUES (1);

CREATE TABLE IF NOT EXISTS historico_operacoes (
  id TEXT PRIMARY KEY,
  operacao_id TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id TEXT NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('emergencia_real', 'emergencia_teste', 'reabrir_teste')),
  resultado TEXT NOT NULL CHECK (resultado IN ('iniciada', 'concluida', 'falhou'))
);
CREATE INDEX IF NOT EXISTS historico_operacoes_criado_em
ON historico_operacoes (criado_em);
