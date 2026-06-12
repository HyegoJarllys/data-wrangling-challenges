# Data Wrangling Challenges

Two focused **data-engineering challenges** that take messy, real-world-shaped input and
turn it into clean, analytics-ready output - emphasizing **correctness, immutability and
explicit engineering decisions** over cleverness.

Each challenge ships runnable code, the input/output data, and a short technical report
explaining *why* each decision was made.

| # | Challenge | Stack | What it demonstrates |
|---|-----------|-------|----------------------|
| 1 | [E-commerce event cleaning](challenge-1-ecommerce-event-cleaning) | JavaScript (Node.js) | Pure functions, immutability, a chained transformation pipeline that sanitizes a GA4/`dataLayer` purchase event |
| 2 | [Corrupted database recovery + SQL reporting](challenge-2-database-recovery-sql) | JavaScript + SQL (SQLite) | ETL sanitation, data modeling, `CREATE TABLE AS SELECT`, analytical queries over a single reporting table |

---

## Why these are worth a look

These are small problems, but they are solved the way production data work *should* be:

- **Immutability by default** - transformations return new structures; source data is never mutated.
- **Pure, composable functions** - each step has a single responsibility and chains into the next.
- **Canonical data at rest, normalization at query time** - casing/semantic info is preserved in storage; case-insensitive matching is done in the query (`LOWER()`), not baked into the data.
- **Conservative type coercion** - numeric strings become numbers only when unambiguous (regex-guarded so dates like `"2022-01-01"` are never mis-parsed).
- **Decisions are documented, not implied** - every non-obvious choice has a rationale in the per-challenge report.

---

## Running

**Challenge 1** (Node.js ≥ 18):

```bash
cd challenge-1-ecommerce-event-cleaning
node 01-deduplicate.js        # remove duplicate items by item_id
node 02-normalize-prices.js   # normalize heterogeneous price formats to number
node 03-filter-invalid.js     # drop invalid items (empty id, null/≤0 price, missing qty)
node 04-compute-total.js      # compute the transaction total value
```

**Challenge 2** (any `sqlite3`):

```bash
cd challenge-2-database-recovery-sql
node fix_database.js                       # Phase 1: sanitize the corrupted JSON
sqlite3 demo.db < 01_schema.sql
sqlite3 demo.db < 02_inserts.sql
sqlite3 demo.db < 03_create_relatorio.sql  # builds the single reporting table (132 rows)
sqlite3 demo.db < 04_analises.sql          # answers the 5 business questions
```

---

## Note

The datasets here are anonymized/synthetic e-commerce data used purely to demonstrate
technique. The per-challenge `reports/` folders contain the detailed write-ups.

*Author: **Hyego Maia** - Junior AI / Data Engineer · [GitHub](https://github.com/HyegoJarllys) · [LinkedIn](https://www.linkedin.com/in/hyego-maia-640ba0343)*
