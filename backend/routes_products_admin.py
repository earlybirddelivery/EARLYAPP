"""
Product Management Routes - Updated for Supplier Linkage
"""

from fastapi import APIRouter, HTTPException, Depends, Query, File, UploadFile
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import logging

from backend.database import get_db
from backend.auth import verify_token
from backend.models import Product
from backend.models_supplier import (
    Supplier, SupplierProduct, SupplierDelivery, SupplierPayable
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/products", tags=["products"])


# ==================== PRODUCT MANAGEMENT ====================

@router.post("/create")
async def create_product(
    data: dict,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Create a new product
    Required fields: name, category, unit, mrp
    """
    try:
        if current_user['role'] not in ['admin', 'manager']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        product = Product(
            name=data['name'],
            category=data['category'],
            unit=data['unit'],
            mrp=data['mrp'],
            description=data.get('description'),
            image_url=data.get('image_url'),
        )
        
        db.add(product)
        db.commit()
        db.refresh(product)
        
        logger.info(f"[Product] Created product {product.id}: {data['name']}")
        
        return {
            "success": True,
            "message": "Product created successfully",
            "product": product.to_dict()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"[Product] Error creating product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{product_id}")
async def update_product(
    product_id: int,
    data: dict,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Update product details"""
    try:
        if current_user['role'] not in ['admin', 'manager']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.deleted_at.is_(None)
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Update fields
        for key, value in data.items():
            if hasattr(product, key) and key not in ['id', 'created_at']:
                setattr(product, key, value)
        
        db.add(product)
        db.commit()
        db.refresh(product)
        
        logger.info(f"[Product] Updated product {product_id}")
        
        return {
            "success": True,
            "message": "Product updated successfully",
            "product": product.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[Product] Error updating product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def get_products(
    current_user = Depends(verify_token),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    category: Optional[str] = None
):
    """Get all products with supplier information"""
    try:
        query = db.query(Product).filter(Product.deleted_at.is_(None))
        
        if category:
            query = query.filter(Product.category == category)
        
        products = query.order_by(Product.created_at.desc()).limit(limit).all()
        
        # Enrich with supplier info
        enriched = []
        for product in products:
            product_dict = product.to_dict()
            
            # Get supplier links
            suppliers = db.query(SupplierProduct).filter(
                SupplierProduct.product_id == product.id,
                SupplierProduct.is_active == True
            ).all()
            
            product_dict['suppliers'] = [
                {
                    'id': sp.id,
                    'supplier_id': sp.supplier_id,
                    'supplier_name': sp.supplier.name,
                    'purchase_rate': sp.purchase_rate,
                    'agreed_quantity': sp.agreed_quantity,
                    'delivery_cutoff_time': sp.delivery_cutoff_time,
                }
                for sp in suppliers
            ]
            
            enriched.append(product_dict)
        
        return {
            "success": True,
            "count": len(enriched),
            "products": enriched
        }
    except Exception as e:
        logger.error(f"[Product] Error fetching products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{product_id}")
async def get_product_detail(
    product_id: int,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get product details with suppliers and delivery history"""
    try:
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.deleted_at.is_(None)
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        product_dict = product.to_dict()
        
        # Get supplier links
        supplier_products = db.query(SupplierProduct).filter(
            SupplierProduct.product_id == product_id,
            SupplierProduct.is_active == True
        ).all()
        
        product_dict['suppliers'] = []
        
        for sp in supplier_products:
            supplier_dict = {
                'id': sp.id,
                'supplier_id': sp.supplier_id,
                'supplier_name': sp.supplier.name,
                'purchase_rate': sp.purchase_rate,
                'agreed_quantity': sp.agreed_quantity,
                'delivery_cutoff_time': sp.delivery_cutoff_time,
                'penalty_per_day_late': sp.penalty_per_day_late,
            }
            
            # Recent deliveries
            recent_deliveries = db.query(SupplierDelivery).filter(
                SupplierDelivery.supplier_product_id == sp.id
            ).order_by(SupplierDelivery.delivery_date.desc()).limit(10).all()
            
            supplier_dict['recent_deliveries'] = [d.to_dict() for d in recent_deliveries]
            
            # Current month payable
            current_month = datetime.now().strftime('%Y-%m')
            payable = db.query(SupplierPayable).filter(
                SupplierPayable.supplier_id == sp.supplier_id,
                SupplierPayable.period_month == current_month
            ).first()
            
            supplier_dict['current_payable'] = payable.to_dict() if payable else None
            
            product_dict['suppliers'].append(supplier_dict)
        
        return {
            "success": True,
            "product": product_dict
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Product] Error fetching product details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PRODUCT-SUPPLIER LINKAGE ====================

@router.post("/{product_id}/link-supplier")
async def link_supplier_to_product(
    product_id: int,
    data: dict,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Link a supplier to a product with pricing terms
    
    Required fields:
    - supplier_id: Supplier ID
    - purchase_rate: Cost per unit
    - agreed_quantity: Daily quantity
    - delivery_cutoff_time: HH:MM format
    - delivery_frequency: daily, weekly, etc.
    - penalty_per_day_late: Penalty amount
    """
    try:
        if current_user['role'] not in ['admin', 'manager']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        supplier = db.query(Supplier).filter(Supplier.id == data['supplier_id']).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        # Check if already linked
        existing = db.query(SupplierProduct).filter(
            SupplierProduct.product_id == product_id,
            SupplierProduct.supplier_id == data['supplier_id']
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Supplier already linked to this product")
        
        supplier_product = SupplierProduct(
            supplier_id=data['supplier_id'],
            product_id=product_id,
            purchase_rate=data['purchase_rate'],
            agreed_quantity=data['agreed_quantity'],
            delivery_cutoff_time=data['delivery_cutoff_time'],
            delivery_frequency=data.get('delivery_frequency', 'daily'),
            penalty_per_day_late=data.get('penalty_per_day_late', 0),
        )
        
        db.add(supplier_product)
        db.commit()
        db.refresh(supplier_product)
        
        logger.info(f"[Product] Linked supplier {data['supplier_id']} to product {product_id}")
        
        return {
            "success": True,
            "message": "Supplier linked successfully",
            "supplier_product": supplier_product.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[Product] Error linking supplier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/supplier-link/{supplier_product_id}")
async def update_supplier_link(
    supplier_product_id: int,
    data: dict,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Update supplier-product linking terms"""
    try:
        if current_user['role'] not in ['admin', 'manager']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        sp = db.query(SupplierProduct).filter(
            SupplierProduct.id == supplier_product_id
        ).first()
        
        if not sp:
            raise HTTPException(status_code=404, detail="Supplier-Product link not found")
        
        # Update fields
        for key, value in data.items():
            if hasattr(sp, key) and key not in ['id', 'created_at']:
                setattr(sp, key, value)
        
        db.add(sp)
        db.commit()
        db.refresh(sp)
        
        logger.info(f"[Product] Updated supplier-product link {supplier_product_id}")
        
        return {
            "success": True,
            "message": "Link updated successfully",
            "supplier_product": sp.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[Product] Error updating supplier link: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
