-- 03_create_relatorio.sql
-- ====================================================================
-- Cria a TABELA UNICA (relatorio_vendas) exigida pelo enunciado:
--   "Utilize a linguagem SQL para criar uma tabela única que contenha
--    todos os dados necessários para o seu relatório, [...] no final
--    você deverá exportar sua tabela resultante como um arquivo .CSV"
--
-- Decisoes de modelagem:
--
--   1) Usamos CREATE TABLE AS SELECT (CTAS) em vez de VIEW para que o
--      resultado seja MATERIALIZADO. Isso permite exportar o CSV
--      diretamente da plataforma sem reprocessar o JOIN.
--
--   2) Resolvemos no JOIN a peculiaridade de schema entre as duas
--      tabelas (id_marca_ vs id_marca).
--
--   3) Adicionamos colunas DERIVADAS uteis ao relatorio:
--        receita    = vendas * valor_do_veiculo
--        ano, mes   = extracoes de data, uteis para serie temporal
--        faixa_preco = bucket de R$ 10 mil em R$ 10 mil
--                      (resolve a Pergunta 3 ja na tabela)
--
--      Materializar essas colunas SIMPLIFICA todas as queries de
--      analise downstream e e didatico no relatorio final.
--
--   4) Renomeamos id_marca_ para id_marca na saida (limpeza cosmetica
--      a nivel de relatorio, sem mexer na tabela fonte).
-- ====================================================================

-- Permite re execucao do script sem erro.
DROP TABLE IF EXISTS relatorio_vendas;

CREATE TABLE relatorio_vendas AS
SELECT
  v.data,
  CAST(strftime('%Y', v.data) AS INTEGER)  AS ano,
  CAST(strftime('%m', v.data) AS INTEGER)  AS mes,
  v.id_marca_                              AS id_marca,
  m.marca,
  v.nome                                   AS veiculo,
  v.vendas,
  v.valor_do_veiculo,
  v.vendas * v.valor_do_veiculo            AS receita,
  -- Faixa de preco: agrupa o valor unitario em buckets de R$ 10.000.
  -- Em SQLite, divisao entre inteiros faz floor automatico.
  -- Ex.: 29000 / 10000 = 2  ->  bucket 20000 a 29999.
  (v.valor_do_veiculo / 10000) * 10000     AS faixa_preco_inicio,
  (v.valor_do_veiculo / 10000) * 10000 + 9999 AS faixa_preco_fim
FROM vendas v
INNER JOIN marcas m
  ON v.id_marca_ = m.id_marca;

-- Indices na tabela materializada para acelerar as analises subsequentes.
CREATE INDEX idx_rel_marca   ON relatorio_vendas(marca);
CREATE INDEX idx_rel_veiculo ON relatorio_vendas(veiculo);
CREATE INDEX idx_rel_faixa   ON relatorio_vendas(faixa_preco_inicio);

-- Sanidade: confere que tudo joinou (deve retornar 132).
SELECT COUNT(*) AS total_registros FROM relatorio_vendas;
