# Backlog

> Ideas, improvements, and known issues captured during development.
> These are deliberately out of scope for the current phase — record them here rather than acting on them.

---

## Phase 2 (Planned)

- Budget-setting page — set monthly amounts per category
- Dashboard — income vs. spend, budget vs. actual by category
- Month navigation — view current month and previous months
- Visual indicators — over budget (red), under budget (green), on track (amber)

---

## Improvements to Phase 1

- **Rename `RowCount` column** — `Ledger.ImportBatches.RowCount` clashes with a SQL Server reserved keyword and requires bracket-quoting in every query. Could be renamed to `TransactionCount` in a future migration.
- **Year range in Transactions filter** — currently hardcoded to 2025/2026/2027. Should be dynamic based on what's actually in the database.
- **Sortable transaction table** — columns (date, amount, description) are not yet clickable to sort. Currently always newest-first.
- **Merchant rules UI** — no frontend for managing `Mapping.MerchantRules`. Rules can only be added directly to the database. A basic CRUD page would make auto-categorisation much more useful.
- **Import feedback on re-import** — when all rows are skipped (full duplicate), the success message could be clearer ("All rows already imported").
- **Transaction transfer toggle** — the `IsTransfer` flag can be set via the API (`PATCH /transactions/{id}`) but there is no UI for it on the transaction list.
- **Category assignment on uncategorised transactions** — the "Uncategorised only" filter is useful but there's no bulk-assign action. Each row must be categorised individually.

---

## Phase 3+ Ideas

- Multi-month comparison charts (spending by category over time)
- Debt payoff / savings goal tracking
- Recurring transaction detection and flagging
- "Learn from corrections" — offer to create a merchant rule when a transaction is manually categorised
- Multiple accounts / household view
- Forecasting based on recurring transactions and average variable spend
- Export to PDF / printable monthly summary

---

## Known Limitations

- **Amazon categorisation** — a single description (`AMAZON`) can be groceries, electronics, or entertainment. No way to auto-categorise accurately without line-item data. Assign to a default "Online (General)" category and accept manual overrides.
- **18-character description truncation** — Lloyds truncates transaction descriptions. Merchant rule patterns must match the start of the truncated string, not the full merchant name.
- **Hash collision on identical same-day transactions** — two transactions on the same day with the same merchant and same amount will produce the same `ImportHash` and the second will be silently skipped. Extremely rare in practice.
