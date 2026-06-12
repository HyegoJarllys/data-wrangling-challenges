# Challenge 2 · Corrupted Database Recovery + SQL Reporting

A two-phase data challenge: **(1)** recover a corrupted JSON database with a JavaScript ETL
script, then **(2)** model it in SQL and build a single analytics-ready reporting table that
answers five business questions.

| Phase | Goal | Stack |
|-------|------|-------|
| 1 | Recover the corrupted data | JavaScript (Node.js) |
| 2 | Build the sales report | SQL (SQLite) |

## Phase 1 - Data recovery (`fix_database.js`)

A two-layer sanitation pipeline over `database/broken_database_*.json`:

**Required fixes**
1. Character substitution in strings (`æ → a`, `ø → o`).
2. Type coercion: numeric strings (`"11"`) → numbers (`11`).

**Additional ETL hygiene (non-destructive)**
3. `TRIM` leading/trailing whitespace.
4. Collapse internal multi-spaces to one.

**Deliberate non-decision:** no global lower/upper-casing and no brand canonicalization via
lookup. Casing carries semantic information (acronyms, proper nouns); case-insensitive
matching belongs in the *query* (`LOWER()`), not in stored data - **canonical data at rest,
normalization at match time**.

Conservative numeric coercion uses `^-?\d+(\.\d+)?$` so values like `"2022-01-01"` are never
mis-parsed as numbers. The recursion is schema-agnostic (works for any JSON shape). The code
is split into single-responsibility functions: `lerArquivo` / `corrigirDados` /
`salvarArquivo`, orchestrated by `processar`.

```bash
node fix_database.js   # reads broken_database_*.json → writes fixed_database_*.json
```

## Phase 2 - SQL report

| File | Purpose |
|------|---------|
| `01_schema.sql` | `CREATE TABLE` for `marcas` (dimension) and `vendas` (fact) |
| `02_inserts.sql` | populate both (11 brands + 132 sales) |
| `03_create_relatorio.sql` | build the single `relatorio_vendas` table via **CTAS** |
| `04_analises.sql` | 5 analytical queries answering the business questions |

**Modeling decisions**
- **`CREATE TABLE AS SELECT` instead of a `VIEW`** - materialized result, exportable to CSV without re-running the join.
- **Materialized derived columns** (`receita`, `ano`, `mes`, `faixa_preco_*`) to simplify and speed up the analytics queries.
- **The join resolves a fact/dimension key quirk** (`id_marca_` vs `id_marca`); the final table exposes only `id_marca`.
- **Indexes** on the common `GROUP BY` columns (`marca`, `veiculo`, `faixa_preco_inicio`).

```bash
sqlite3 demo.db < 01_schema.sql
sqlite3 demo.db < 02_inserts.sql
sqlite3 demo.db < 03_create_relatorio.sql   # SELECT at the end returns 132
sqlite3 demo.db < 04_analises.sql
```

## Reproducible tooling

`tools/` regenerates the SQL and the report from the fixed JSON - useful when the source
data changes. Not required to run the challenge.

`database/relatorio_vendas.csv` is a reference export of the final reporting table.
