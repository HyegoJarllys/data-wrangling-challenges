-- 01_schema.sql
-- E-commerce sales dataset.Fase 2.
-- Cria as duas tabelas fonte espelhando os JSONs corrigidos da Fase 1.
-- Plataforma alvo: SQLite (compativel com SQLite Online).

-- DROP defensivo para permitir re execucao do script sem erro.
DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS marcas;

-- Tabela DIMENSAO. Marcas de veiculos.
-- id_marca e a chave primaria; cada marca aparece exatamente uma vez.
CREATE TABLE marcas (
  id_marca  INTEGER PRIMARY KEY,
  marca     TEXT NOT NULL
);

-- Tabela FATO. Vendas mensais agregadas por (data, marca, modelo).
-- Observacao: a chave id_marca_ vem do JSON com underscore final
-- (peculiaridade do schema original; nao e corrupcao). Mantemos o nome
-- exato para fidelidade ao dado fonte.
CREATE TABLE vendas (
  data              TEXT NOT NULL,           -- ISO 'YYYY-MM-DD'
  id_marca_         INTEGER NOT NULL,        -- FK logico para marcas.id_marca
  vendas            INTEGER NOT NULL,        -- unidades vendidas no mes
  valor_do_veiculo  INTEGER NOT NULL,        -- preco unitario em R$
  nome              TEXT NOT NULL,           -- modelo do veiculo
  FOREIGN KEY (id_marca_) REFERENCES marcas(id_marca)
);

-- Indices para acelerar os joins e os GROUP BY mais comuns das analises.
CREATE INDEX idx_vendas_id_marca ON vendas(id_marca_);
CREATE INDEX idx_vendas_data     ON vendas(data);
