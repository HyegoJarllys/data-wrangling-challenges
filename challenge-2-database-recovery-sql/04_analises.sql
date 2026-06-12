-- 04_analises.sql
-- Responde as 5 perguntas do enunciado usando a tabela unica
-- relatorio_vendas (criada por 03_create_relatorio.sql).
--
-- Cada bloco é independente; rode todos juntos ou um a um.
-- ====================================================================
-- PERGUNTA 1: Qual marca teve o maior volume de vendas?
-- ====================================================================
-- "Volume de vendas" = soma das unidades vendidas (campo vendas).
-- Listamos o ranking completo para contexto e destacamos o topo.
-- ====================================================================
SELECT
  marca,
  SUM(vendas) AS total_unidades_vendidas
FROM relatorio_vendas
GROUP BY marca
ORDER BY total_unidades_vendidas DESC;

-- ====================================================================
-- PERGUNTA 2: Qual veiculo gerou a maior e a menor receita?
-- ====================================================================
-- "Veiculo" = combinacao (marca, nome do modelo). Mesmo modelo poderia
-- aparecer em marcas diferentes em outro dataset, entao agrupamos por
-- (marca, veiculo) por seguranca.
-- Receita = vendas * valor_do_veiculo (ja materializada).
-- Trazemos os dois extremos com duas consultas precisas.
-- ====================================================================
WITH receita_por_veiculo AS (
  SELECT
    marca,
    veiculo,
    SUM(receita)  AS receita_total,
    SUM(vendas)   AS unidades
  FROM relatorio_vendas
  GROUP BY marca, veiculo
)
SELECT 'MAIOR receita' AS posicao, marca, veiculo, receita_total, unidades
FROM receita_por_veiculo
ORDER BY receita_total DESC
LIMIT 1;

WITH receita_por_veiculo AS (
  SELECT
    marca,
    veiculo,
    SUM(receita)  AS receita_total,
    SUM(vendas)   AS unidades
  FROM relatorio_vendas
  GROUP BY marca, veiculo
)
SELECT 'MENOR receita' AS posicao, marca, veiculo, receita_total, unidades
FROM receita_por_veiculo
ORDER BY receita_total ASC
LIMIT 1;


-- ====================================================================
-- PERGUNTA 3: Faixas de preco a cada R$ 10.000. Qual mais vendeu?
-- ====================================================================
-- A coluna faixa_preco_inicio ja entrega o bucket pronto.
-- Agrupamos por faixa e somamos as unidades. Listamos todas para
-- mostrar a distribuicao no relatorio e destacamos a vencedora.
-- ====================================================================
SELECT
  faixa_preco_inicio,
  faixa_preco_fim,
  -- Texto formatado, util para o relatorio final.
  'R$ ' || faixa_preco_inicio || ' a R$ ' || faixa_preco_fim AS faixa,
  SUM(vendas) AS total_unidades_vendidas
FROM relatorio_vendas
GROUP BY faixa_preco_inicio, faixa_preco_fim
ORDER BY total_unidades_vendidas DESC;


-- ====================================================================
-- PERGUNTA 4: Receita das 3 marcas com menores tickets medios.
-- ====================================================================
-- "Ticket medio" = receita / unidades vendidas (media ponderada por
-- volume).
-- Selecionamos as 3 marcas com menor ticket medio e mostramos a
-- receita correspondente, conforme a pergunta pede.
-- ====================================================================
WITH metricas_marca AS (
  SELECT
    marca,
    SUM(vendas)                        AS unidades,
    SUM(receita)                       AS receita_total,
    SUM(receita) * 1.0 / SUM(vendas)   AS ticket_medio
  FROM relatorio_vendas
  GROUP BY marca
)
SELECT
  marca,
  ticket_medio,
  receita_total
FROM metricas_marca
ORDER BY ticket_medio ASC
LIMIT 3;


-- ====================================================================
-- PERGUNTA 5: Existe relacao entre os veiculos mais vendidos?
-- ====================================================================
-- Pergunta aberta. A query abaixo entrega os DADOS necessarios para
-- raciocinar sobre o tema; a interpretacao vai no relatorio final.
--
-- Hipotese a testar: os mais vendidos compartilham faixa de preco
-- (carros populares de entrada de gama). A query traz, para os top 10:
--   unidades vendidas
--   preco medio (ponderado)
--   faixa de preco modal (a faixa em que o carro mais foi ofertado)
--   quantos meses ele apareceu no banco (consistencia ao longo do ano)
-- ====================================================================
WITH ranking AS (
  SELECT
    marca,
    veiculo,
    SUM(vendas)                              AS unidades,
    SUM(receita)                             AS receita_total,
    SUM(receita) * 1.0 / SUM(vendas)         AS preco_medio_ponderado,
    MIN(valor_do_veiculo)                    AS preco_min,
    MAX(valor_do_veiculo)                    AS preco_max,
    COUNT(DISTINCT data)                     AS meses_ativos
  FROM relatorio_vendas
  GROUP BY marca, veiculo
)
SELECT *
FROM ranking
ORDER BY unidades DESC
LIMIT 10;
