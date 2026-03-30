from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.db import get_connection
from app.services.import_service import parse_lloyds_csv, match_merchant_rules

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/upload", status_code=201)
async def upload_import(
    account_id: int = Form(..., description="Account to import transactions into"),
    file: UploadFile = File(...),
):
    # Validate account exists
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT AccountId FROM Ledger.Accounts WHERE AccountId = ?", account_id)
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Account {account_id} not found")

    content = await file.read()

    try:
        rows = parse_lloyds_csv(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")

    if not rows:
        raise HTTPException(status_code=400, detail="CSV contained no transaction rows")

    with get_connection() as conn:
        cursor = conn.cursor()

        # Load active merchant rules, highest priority first
        cursor.execute(
            "SELECT Pattern, CategoryId "
            "FROM Mapping.MerchantRules "
            "WHERE IsActive = 1 "
            "ORDER BY Priority DESC"
        )
        rules = cursor.fetchall()  # list of (Pattern, CategoryId)

        # Create import batch record
        cursor.execute(
            "INSERT INTO Ledger.ImportBatches (AccountId, FileName, [RowCount], Status) "
            "OUTPUT INSERTED.BatchId "
            "VALUES (?, ?, ?, 'Pending')",
            account_id, file.filename, len(rows),
        )
        batch_id = cursor.fetchone()[0]

        inserted = 0
        skipped = 0

        for row in rows:
            # Skip duplicates
            cursor.execute(
                "SELECT 1 FROM Ledger.Transactions WHERE ImportHash = ?",
                row["import_hash"],
            )
            if cursor.fetchone():
                skipped += 1
                continue

            # Auto-categorise via merchant rules
            category_id = match_merchant_rules(row["description"], rules)

            cursor.execute(
                "INSERT INTO Ledger.Transactions "
                "    (AccountId, BatchId, TransactionDate, Description, AmountPence, TransactionType, CategoryId, ImportHash) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                account_id,
                batch_id,
                row["transaction_date"],
                row["description"],
                row["amount_pence"],
                row["transaction_type"],
                category_id,
                row["import_hash"],
            )
            inserted += 1

        # Mark batch complete
        cursor.execute(
            "UPDATE Ledger.ImportBatches SET Status = 'Complete', [RowCount] = ? WHERE BatchId = ?",
            inserted, batch_id,
        )

    return {
        "batchId": batch_id,
        "inserted": inserted,
        "skipped": skipped,
        "total": len(rows),
    }
