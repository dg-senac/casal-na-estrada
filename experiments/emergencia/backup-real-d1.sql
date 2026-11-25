-- Executar SOMENTE no D1 casal-emergencia-teste, após instrução.
-- Tabela sem rota pública de leitura. Inclui rascunhos: acesso à conta Cloudflare deve ser protegido.
CREATE TABLE IF NOT EXISTS backups_editoriais_reais (
  id TEXT PRIMARY KEY,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id TEXT NOT NULL,
  pacote TEXT NOT NULL CHECK (length(CAST(pacote AS BLOB)) <= 1048576),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64)
);
