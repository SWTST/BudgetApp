from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import get_connection

router = APIRouter(prefix="/accounts", tags=["accounts"])


class AccountCreate(BaseModel):
    accountName: str
    bankName: str
    accountType: str  # Current | Savings | Credit | Cash


@router.get("")
def list_accounts():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT AccountId, AccountName, BankName, AccountType, IsActive "
            "FROM Ledger.Accounts "
            "WHERE IsActive = 1 "
            "ORDER BY AccountName"
        )
        rows = cursor.fetchall()
    return [
        {
            "accountId": r[0],
            "accountName": r[1],
            "bankName": r[2],
            "accountType": r[3],
            "isActive": bool(r[4]),
        }
        for r in rows
    ]


@router.post("", status_code=201)
def create_account(body: AccountCreate):
    valid_types = ("Current", "Savings", "Credit", "Cash")
    if body.accountType not in valid_types:
        raise HTTPException(status_code=400, detail=f"accountType must be one of: {', '.join(valid_types)}")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Ledger.Accounts (AccountName, BankName, AccountType) "
            "OUTPUT INSERTED.AccountId "
            "VALUES (?, ?, ?)",
            body.accountName, body.bankName, body.accountType,
        )
        account_id = cursor.fetchone()[0]

    return {"accountId": account_id, "accountName": body.accountName, "bankName": body.bankName, "accountType": body.accountType}
