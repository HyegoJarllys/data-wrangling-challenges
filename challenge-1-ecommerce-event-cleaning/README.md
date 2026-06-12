# Challenge 1 · E-commerce Event Cleaning

Sanitize a **GA4 / Google Tag Manager `dataLayer` purchase event** *before* it is sent to
reporting. The raw event carries intentional inconsistencies - duplicate items,
heterogeneous price formats, incomplete items, and a missing total `value`. A chain of four
**pure functions** cleans it step by step.

## Input

`data/compra.js` - a standard GA4 `purchase` event (kept intact, never mutated). The
`items[]` array contains 13 products with deliberate problems:

| Problem | Example |
|---------|---------|
| Duplicate `item_id` | `PRD_VEST_123` (×2), `PRD_ELETRO_123` (×2), `PRD_ALIM_456` (×2) |
| Price as number | `199.90` |
| Price as string w/ comma + thousands dot | `"2.015,90"` |
| Price as string w/ comma only | `"1725,50"` |
| Price with currency symbol | `"R$ 341,90"`, `"€ 215,90"` |
| Price `null` | (one item) |
| Missing `quantity` | (one item) |
| Empty `item_id` | (one item) |

## Pipeline

Each script consumes the previous step's output (chained via `require`):

| Step | File | Function | Result |
|------|------|----------|--------|
| 1 | `01-deduplicate.js` | `removerDuplicados(items)` | 13 → 10 items (3 duplicates removed, first occurrence kept) |
| 2 | `02-normalize-prices.js` | `normalizarPrecos(items)` | all prices → `number` (the `null` stays as a signal for step 3) |
| 3 | `03-filter-invalid.js` | `filtrarInvalidos(items)` | 10 → 7 valid items (empty id, null price, missing qty dropped) |
| 4 | `04-compute-total.js` | `calcularValorTotal(items, tax, shipping)` | **`value = 7632.99`** = Σ(price × quantity) + tax + shipping |

## Run

```bash
node 01-deduplicate.js
node 02-normalize-prices.js
node 03-filter-invalid.js
node 04-compute-total.js
```

Each file is standalone-executable (imports the previous steps and runs the full pipeline).
Node.js ≥ 18 required (for `String.prototype.replaceAll`).

## Key decisions

- **Immutability** - every function returns a new array via spread / `map` / `filter`; the original event is never mutated (verified at runtime at the end of each script).
- **Pure functions** - no globals, no I/O, no side effects.
- **Monetary rounding** - `Math.round(n * 100) / 100` to avoid float drift on the total.
- **CommonJS** - for maximum portability across Node versions.

Detailed per-step write-ups live in [`reports/`](reports).
