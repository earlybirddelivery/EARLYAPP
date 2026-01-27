from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid

from models import Product, ProductCreate, UserRole
from database import db
from auth import require_role

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/", response_model=List[Product])
async def get_products():
    products = await db.products.find({}, {"_id": 0}).to_list(None)
    return products

@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/", response_model=Product)
async def create_product(product: ProductCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    product_doc = {
        "id": str(uuid.uuid4()),
        **product.model_dump()
    }
    await db.products.insert_one(product_doc)
    return product_doc

@router.put("/{product_id}")
async def update_product(product_id: str, product: ProductCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": product.model_dump(exclude_unset=True)}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product updated"}

@router.delete("/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}
