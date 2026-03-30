# Copperline API

> Base URL (development): `http://localhost:8000`
> Interactive docs: `http://localhost:8000/docs` (Swagger UI)
> Last updated: 2026-03-30 — Phase 1 complete

---

## Health

### `GET /health`
Confirms the API process is running.

**Response**
```json
{ "status": "ok" }
```

### `GET /health/db`
Confirms the database is reachable.

**Response**
```json
{ "status": "ok" }
```
or
```json
{ "status": "error", "detail": "..." }
```

---

## Accounts

### `GET /accounts`
Returns all active accounts.

**Response**
```json
[
  {
    "accountId": 1,
    "accountName": "Lloyds Current",
    "bankName": "Lloyds",
    "accountType": "Current",
    "isActive": true
  }
]
```

### `POST /accounts`
Creates a new account.

**Body**
```json
{
  "accountName": "Lloyds Current",
  "bankName": "Lloyds",
  "accountType": "Current"
}
```
`accountType` must be one of: `Current`, `Savings`, `Credit`, `Cash`.

**Response** — `201 Created`
```json
{
  "accountId": 1,
  "accountName": "Lloyds Current",
  "bankName": "Lloyds",
  "accountType": "Current"
}
```

---

## Categories

### `GET /categories`
Returns all categories (active and inactive) as a flat list. Frontend builds the hierarchy using `parentCategoryId`.

**Response**
```json
[
  { "categoryId": 1, "parentCategoryId": null, "name": "Food & Drink", "displayOrder": 30, "isActive": true },
  { "categoryId": 5, "parentCategoryId": 1,    "name": "Groceries",    "displayOrder": 10, "isActive": true }
]
```

### `POST /categories`
Creates a new category.

**Body**
```json
{
  "name": "Groceries",
  "parentCategoryId": 1,
  "displayOrder": 10
}
```
`parentCategoryId` is `null` for top-level categories.

**Response** — `201 Created` — same shape as a category object.

### `PUT /categories/{id}`
Updates one or more fields on a category. Only fields included in the body are changed.

**Body** (all fields optional)
```json
{
  "name": "Supermarkets",
  "displayOrder": 15,
  "parentCategoryId": 1,
  "isActive": true
}
```

**Response** — updated category object.

### `DELETE /categories/{id}`
Soft-deletes a category (sets `IsActive = 0`). Historical transactions referencing it are unaffected.

**Response** — `204 No Content`

---

## Transactions

### `GET /transactions`
Returns transactions for an account, with optional filters. Always ordered newest first.

**Query parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `account_id` | int | Yes | Filter by account |
| `year` | int | No | Filter by year |
| `month` | int | No | Filter by month (1–12) |
| `search` | string | No | Partial match on description |
| `uncategorised_only` | bool | No | Return only uncategorised rows |

**Response**
```json
[
  {
    "transactionId": 42,
    "transactionDate": "2026-02-20",
    "description": "TESCO STORES",
    "amountPence": -3450,
    "transactionType": "DEB",
    "categoryId": 5,
    "categoryName": "Groceries",
    "parentCategoryName": "Food & Drink",
    "isTransfer": false,
    "batchId": 1
  }
]
```

### `PATCH /transactions/{id}`
Updates the category or transfer flag on a transaction.

**Body** (all fields optional)
```json
{
  "categoryId": 5,
  "isTransfer": false
}
```

**Response**
```json
{ "transactionId": 42, "updated": true }
```

---

## Import

### `POST /import/upload`
Parses a Lloyds CSV export and inserts new transactions into the database. Duplicate rows (matched by `ImportHash`) are silently skipped.

**Body** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `account_id` | int | Account to import into |
| `file` | file | Lloyds CSV export (.csv) |

**Response** — `201 Created`
```json
{
  "batchId": 3,
  "inserted": 47,
  "skipped": 0,
  "total": 47
}
```

`inserted` — rows added to the database.
`skipped` — rows already present (duplicates).
`total` — rows in the CSV file.
