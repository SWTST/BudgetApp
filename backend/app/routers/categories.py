from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.db import get_connection

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str
    parentCategoryId: Optional[int] = None
    displayOrder: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    parentCategoryId: Optional[int] = None
    displayOrder: Optional[int] = None
    isActive: Optional[bool] = None


def _row_to_dict(r):
    return {
        "categoryId": r[0],
        "parentCategoryId": r[1],
        "name": r[2],
        "displayOrder": r[3],
        "isActive": bool(r[4]),
    }


@router.get("")
def list_categories():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT CategoryId, ParentCategoryId, Name, DisplayOrder, IsActive "
            "FROM App.Categories "
            "ORDER BY ISNULL(ParentCategoryId, CategoryId), ParentCategoryId, DisplayOrder"
        )
        rows = cursor.fetchall()
    return [_row_to_dict(r) for r in rows]


@router.post("", status_code=201)
def create_category(body: CategoryCreate):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder) "
            "OUTPUT INSERTED.CategoryId "
            "VALUES (?, ?, ?)",
            body.name, body.parentCategoryId, body.displayOrder,
        )
        category_id = cursor.fetchone()[0]
    return {"categoryId": category_id, "name": body.name, "parentCategoryId": body.parentCategoryId, "displayOrder": body.displayOrder, "isActive": True}


@router.put("/{category_id}")
def update_category(category_id: int, body: CategoryUpdate):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT CategoryId FROM App.Categories WHERE CategoryId = ?", category_id)
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Category not found")

        fields = []
        params = []
        if body.name is not None:
            fields.append("Name = ?")
            params.append(body.name)
        if body.parentCategoryId is not None:
            fields.append("ParentCategoryId = ?")
            params.append(body.parentCategoryId)
        if body.displayOrder is not None:
            fields.append("DisplayOrder = ?")
            params.append(body.displayOrder)
        if body.isActive is not None:
            fields.append("IsActive = ?")
            params.append(1 if body.isActive else 0)

        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(category_id)
        cursor.execute(f"UPDATE App.Categories SET {', '.join(fields)} WHERE CategoryId = ?", *params)

        cursor.execute(
            "SELECT CategoryId, ParentCategoryId, Name, DisplayOrder, IsActive "
            "FROM App.Categories WHERE CategoryId = ?",
            category_id,
        )
        return _row_to_dict(cursor.fetchone())


@router.delete("/{category_id}", status_code=204)
def deactivate_category(category_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT CategoryId FROM App.Categories WHERE CategoryId = ?", category_id)
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Category not found")
        cursor.execute("UPDATE App.Categories SET IsActive = 0 WHERE CategoryId = ?", category_id)
