-- SOMENTE D1 casal-emergencia-teste. Adiciona tabelas; não altera conteúdo existente.

CREATE TABLE IF NOT EXISTS snapshots_fotos (
 id TEXT PRIMARY KEY REFERENCES backups_editoriais_reais(id),
 usuario_id TEXT NOT NULL,
 manifesto TEXT NOT NULL CHECK(length(CAST(manifesto AS BLOB))<=65536),
 estado TEXT NOT NULL DEFAULT 'incompleto' CHECK(estado IN ('incompleto','concluido')),
 criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS objetos_snapshot_fotos (
 snapshot_id TEXT NOT NULL REFERENCES snapshots_fotos(id),
 nome TEXT NOT NULL,
 tamanho INTEGER NOT NULL CHECK(tamanho>=0 AND tamanho<=1048576),
 sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 bytes BLOB NOT NULL CHECK(length(bytes)=tamanho),
 verificado INTEGER NOT NULL DEFAULT 0 CHECK(verificado IN (0,1)),
 PRIMARY KEY(snapshot_id,nome)
);