"""
Product validation functions - check if products exist before creating references
"""

from fastapi import HTTPException
from typing import List


async def validate_product_exists(db, product_id: str) -> bool:
    """
    Check if product exists in db.products
    
    Args:
        db: MongoDB database
        product_id: UUID of product
        
    Raises:
        HTTPException(404): Product not found
        HTTPException(400): Invalid product_id format
        
    Returns:
        bool: True if exists
    """
    if not product_id or not isinstance(product_id, str):
        raise HTTPException(status_code=400, detail="Invalid product_id format")
    
    try:
        product = await db.products.find_one({"id": product_id})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating product: {str(e)}")


async def validate_products_exist(
    db,
    product_ids: List[str]
) -> bool:
    """
    Check if multiple products exist
    
    Args:
        db: MongoDB database
        product_ids: List of product UUIDs
        
    Raises:
        HTTPException(404): One or more products not found
        HTTPException(400): Invalid product_ids format
        
    Returns:
        bool: True if all exist
    """
    if not product_ids or not isinstance(product_ids, list):
        raise HTTPException(status_code=400, detail="Invalid product_ids format")
    
    try:
        missing_products = []
        for product_id in product_ids:
            product = await db.products.find_one({"id": product_id})
            if not product:
                missing_products.append(product_id)
        
        if missing_products:
            raise HTTPException(
                status_code=404,
                detail=f"Products not found: {', '.join(missing_products)}"
            )
        
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating products: {str(e)}")


async def validate_product_available(db, product_id: str) -> bool:
    """
    Check if product is available (not discontinued)
    
    Args:
        db: MongoDB database
        product_id: UUID of product
        
    Raises:
        HTTPException(410): Product is discontinued
        HTTPException(404): Product not found
        
    Returns:
        bool: True if available
    """
    try:
        product = await db.products.find_one({"id": product_id})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
        
        if product.get("discontinued", False):
            raise HTTPException(status_code=410, detail=f"Product {product_id} is no longer available")
        
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating product availability: {str(e)}")
