/**
 * generate_sql.js
 * ====================================================================
 * E-commerce sales dataset.
 * Auxiliar da Fase 2: gera os arquivos SQL de schema e inserts
 * a partir dos JSONs ja corrigidos pela Fase 1.
 *
 * Por que gerar SQL via script em vez de digitar a mao?
 *   Elimina erros de digitacao em 143 INSERTs.
 *   Se o JSON mudar, basta rodar de novo (pipeline reproduzivel).
 *   Demonstra rastreabilidade entre Fase 1 (limpeza) e Fase 2 (modelagem).
 *
 * Localizacao: tools/ (script auxiliar, nao faz parte da entrega).
 *
 * Entrada: ../database/fixed_database_1.json e ../database/fixed_database_2.json
 * Saida (na raiz do projeto, porque sao entregaveis):
 *   ../01_schema.sql   (CREATE TABLE de vendas e marcas)
 *   ../02_inserts.sql  (INSERT INTO populando as duas tabelas)
 *
 * Uso (a partir da raiz do projeto):
 *   node tools/generate_sql.js
 * ====================================================================
 */

const fs = require('fs');
const path = require('path');

// Este script vive em tools/. A raiz do projeto e o diretorio pai.
// Le os JSONs de database/ e grava os SQLs na raiz do projeto
// (porque os 0X_*.sql fazem parte da entrega oficial).
const dirRaiz  = path.resolve(__dirname, '..');
const dirDados = path.join(dirRaiz, 'database');

// ====================================================================
// Helpers de formatacao SQL
// ====================================================================

/**
 * Escapa um valor para uso seguro em SQL.
 *   number      , sem aspas
 *   string      , entre aspas simples, com '' duplicado para escape
 *   null/undef. , NULL
 * @param {*} valor
 * @returns {string}
 */
function escaparValorSql(valor) {
  if (valor === null || valor === undefined) return 'NULL';
  if (typeof valor === 'number') return String(valor);
  // String: escapa aspas simples duplicando as (padrao SQL).
  return `'${String(valor).replaceAll("'", "''")}'`;
}

/**
 * Monta um INSERT INTO unico (multi row) para uma tabela.
 * Multi row e mais rapido e mais legivel que um INSERT por linha.
 * @param {string} tabela
 * @param {string[]} colunas
 * @param {Array<object>} registros
 * @returns {string}
 */
function montarInsertMultiplo(tabela, colunas, registros) {
  const linhas = registros.map((reg) => {
    const valores = colunas.map((col) => escaparValorSql(reg[col]));
    return `  (${valores.join(', ')})`;
  });
  return (
    `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES\n` +
    linhas.join(',\n') +
    ';\n'
  );
}


// ====================================================================
// Geracao do schema (01_schema.sql)
// ====================================================================
const schemaSql = `-- 01_schema.sql
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
`;

fs.writeFileSync(path.join(dirRaiz, '01_schema.sql'), schemaSql, 'utf8');
console.log('Gerado: 01_schema.sql');


// ====================================================================
// Geracao dos inserts (02_inserts.sql)
// ====================================================================
const fato = JSON.parse(
  fs.readFileSync(path.join(dirDados, 'fixed_database_1.json'), 'utf8'),
);
const dim = JSON.parse(
  fs.readFileSync(path.join(dirDados, 'fixed_database_2.json'), 'utf8'),
);

const insertsSql =
  `-- 02_inserts.sql
-- E-commerce sales dataset.Fase 2.
-- Popula as tabelas com os dados ja saneados pela Fase 1.
-- Total: ${dim.length} marcas e ${fato.length} registros de venda.

` +
  montarInsertMultiplo('marcas', ['id_marca', 'marca'], dim) +
  '\n' +
  montarInsertMultiplo(
    'vendas',
    ['data', 'id_marca_', 'vendas', 'valor_do_veiculo', 'nome'],
    fato,
  );

fs.writeFileSync(path.join(dirRaiz, '02_inserts.sql'), insertsSql, 'utf8');
console.log('Gerado: 02_inserts.sql');

console.log(`\nResumo: ${dim.length} marcas e ${fato.length} vendas.`);
