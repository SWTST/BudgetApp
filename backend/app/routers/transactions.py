from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from app.db import get_connection

router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionPatch(BaseModel):
    categoryId: Optional[int] = None
    isTransfer: Optional[bool] = None


@router.get("")
def list_transactions(
    account_id: int = Query(..., description="Filter by account"),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    search: Optional[str] = Query(None, description="Filter by description (partial match)"),
    uncategorised_only: bool = Query(False),
):
    sql = """
        SELECT
            t.TransactionId,
            CONVERT(VARCHAR(10), t.TransactionDate, 23) AS TransactionDate,
            t.Description,
            t.AmountPence,
            t.TransactionType,
            t.CategoryId,
            c.Name          AS CategoryName,
            p.Name          AS ParentCategoryName,
            t.IsTransfer,
            t.BatchId
        FROM Ledger.Transactions t
        LEFT JOIN App.Categories c ON t.CategoryId = c.CategoryId
        LEFT JOIN App.Categories p ON c.ParentCategoryId = p.CategoryId
        WHERE t.AccountId = ?
    """
    params = [account_id]

    if year is not None:
        sql += " AND YEAR(t.TransactionDate) = ?"
        params.append(year)
    if month is not None:
        sql += " AND MONTH(t.TransactionDate) = ?"
        params.append(month)
    if search:
        sql += " AND t.Description LIKE ?"
        params.append(f"%{search}%")
    if uncategorised_only:
        sql += " AND t.CategoryId IS NULL"

    sql += " ORDER BY t.TransactionDate DESC, t.TransactionId DESC"

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, *params)
        rows = cursor.fetchall()

    return [
        {
            "transactionId": r[0],
            "transactionDate": r[1],
            "description": r[2],
            "amountPence": r[3],
            "transactionType": r[4],
            "categoryId": r[5],
            "categoryName": r[6],
            "parentCategoryName": r[7],
            "isTransfer": bool(r[8]),
            "batchId": r[9],
        }
        for r in rows
    ]


@router.patch("/{transaction_id}")
def update_transaction(transaction_id: int, body: TransactionPatch):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT TransactionId FROM Ledger.Transactions WHERE TransactionId = ?", transaction_id)
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Transaction not found")

        fields = []
        params = []
        if body.categoryId is not None:
            fields.append("CategoryId = ?")
            params.append(body.categoryId)
        if body.isTransfer is not None:
            fields.append("IsTransfer = ?")
            params.append(1 if body.isTransfer else 0)

        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        fields.append("UpdatedAt = GETUTCDATE()")
        params.append(transaction_id)
        cursor.execute(f"UPDATE Ledger.Transactions SET {', '.join(fields)} WHERE TransactionId = ?", *params)

    return {"transactionId": transaction_id, "updated": True}
