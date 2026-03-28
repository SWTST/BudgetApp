# Lloyds CSV Export Format

> Confirmed against a real statement export (Feb 2026).
> This document closes the "Confirm Lloyds export format" task from Phase 0.

---

## Export Method

- Log in to Lloyds Online Banking
- Navigate to the account → Export transactions
- Format: **CSV** (also available as QIF — not used)
- Date range: user-defined

---

## Column Structure

| # | Column Name | Type | Notes |
|---|---|---|---|
| 1 | `Transaction Date` | String | Format: `DD/MM/YYYY` — must be parsed, not assumed ISO |
| 2 | `Transaction Type` | String | Lloyds type code — see table below |
| 3 | `Sort Code` | String | Prefixed with a `'` apostrophe (e.g. `'30-18-06`) — Lloyds does this to prevent Excel treating it as a formula. **Strip the leading apostrophe on import.** |
| 4 | `Account Number` | String | Treat as string, not integer — leading zeros could theoretically exist |
| 5 | `Transaction Description` | String | Free text from bank. **Truncated to ~18 characters.** Mixed case (some ALL CAPS, some Title Case). See notes below. |
| 6 | `Debit Amount` | Float | Amount leaving the account. Empty string if not a debit. |
| 7 | `Credit Amount` | Float | Amount entering the account. Empty string if not a credit. |
| 8 | `Balance` | Float | Running balance **after** this transaction. |

---

## Transaction Type Codes

| Code | Meaning | Direction |
|---|---|---|
| `DEB` | Debit card payment | Debit |
| `DD` | Direct Debit | Debit |
| `FPO` | Faster Payment Out (bank transfer sent) | Debit |
| `SO` | Standing Order | Debit |
| `BGC` | Bank Giro Credit (incoming transfer, e.g. salary) | Credit |

> Other codes may appear (e.g. `CPT` contactless, `TFR` internal transfer, `ATM` cash withdrawal).
> The `TransactionType` column in `Ledger.Transactions` has no CHECK constraint for this reason.

---

## Parser Notes

### Amounts → AmountPence
Debit and Credit are separate columns; only one will be populated per row.
Convert to a single signed integer (pence) on import:

```
if Credit Amount is not empty:
    AmountPence = round(Credit Amount * 100)     # positive
else:
    AmountPence = round(Debit Amount * 100) * -1  # negative
```

### Date Parsing
Parse `Transaction Date` as `DD/MM/YYYY`. Do **not** assume the system locale will handle this — be explicit in the parser.

### Sort Code
Strip the leading `'` before storing or hashing. Store as plain `30-18-06`.

### Description Truncation
Descriptions are truncated at approximately 18 characters. This affects merchant rule matching:
- `UBER   * EATS PEND` — note extra spaces and trailing `PEND` (pending flag)
- `BOBBING CORNER SER` — truncated mid-word
- `FIRSTCENTRALSERV` — truncated (First Central Services — car insurance)

Merchant rule patterns should match on the **start** of the description using `LIKE 'PATTERN%'`, not exact matches.

### Statement Order
Rows are exported **newest first** (descending by date). The parser should handle any order — do not rely on row position.

### Deduplication Hash
`ImportHash` = SHA256 of: `AccountNumber + TransactionDate + Description + AmountPence`

Known edge case: two genuinely identical transactions on the same day (same merchant, same amount) will produce a hash collision. This is rare and accepted as a known limitation. The `Balance` column could be used to disambiguate if this ever becomes a problem.

---

## Example Rows (anonymised)

```
Transaction Date,Transaction Type,Sort Code,Account Number,Transaction Description,Debit Amount,Credit Amount,Balance
20/02/2026,BGC,'00-00-00,00000000,EMPLOYER NAME,,2452.38,2451.71
20/02/2026,SO,'00-00-00,00000000,STANDING ORDER,275.00,,2176.71
23/02/2026,DD,'00-00-00,00000000,LLOYDS BANK LOAN,228.72,,671.49
23/02/2026,DEB,'00-00-00,00000000,MCDONALDS,14.27,,1068.80
24/02/2026,DEB,'00-00-00,00000000,UBER   * EATS PEND,26.75,,479.56
```
