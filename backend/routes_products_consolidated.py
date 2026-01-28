"""
STEP 28 PHASE 3: Products & Suppliers Consolidation
====================================================
Consolidated routes for all product and supplier operations.

CONSOLIDATION DETAILS:
- Source files:
  * routes_products.py (48 lines) - MongoDB backend
  * routes_products_admin.py (336 lines) - SQLAlchemy backend
  * routes_supplier.py (55 lines) - MongoDB backend
- Total merged: 439 lines
- Output file: routes_products_consolidated.py
- Router prefixes: /products, /api/admin/products, /suppliers
- Organization:
  * Section 1: Public Product Catalog (MongoDB - 3 endpoints)
  * Section 2: Admin Product Management (SQLAlchemy - 6 endpoints)
  * Section 3: Supplier Management (MongoDB - 4 endpoints)

ARCHITECTURAL NOTE:
- MIXED DATABASE BACKENDS handled via conditional imports
- Public APIs use MongoDB (routes_products.py, routes_supplier.py)
- Admin APIs use SQLAlchemy (routes_products_admin.py)
- Separation maintained to avoid mixing DB technologies
- Future migration: Move all to MongoDB or SQLAlchemy for uniformity

DEPENDENCIES:
- FastAPI routing
- MongoDB: models, database.db, auth for public endpoints
- SQLAlchemy ORM: database.get_db, models.Product, models_supplier for admin
- Authentication: require_role, verify_token
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Union
from datetime import datetime, timezone
import logging
from utils_id_generator import generate_product_id, generate_id

# ============================================================================
# CONDITIONAL IMPORTS: Handle mixed database backends
# ============================================================================

# MongoDB dependencies (public endpoints)
try:
    from models import *
    from database import db
    from auth import require_role, get_current_user
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False

# SQLAlchemy dependencies (admin endpoints)
get_db = None
verify_token = None
SQLALCHEMY_AVAILABLE = False

try:
    # from sqlalchemy.orm import Session as SQLSession  # SQLAlchemy optional
    from database import get_db
    from auth import verify_token
    from models import Product
    from models_supplier import (
        Supplier, SupplierProduct, SupplierDelivery, SupplierPayable
    )
    SQLALCHEMY_AVAILABLE = True
except (ImportError, NameError, ModuleNotFoundError):
    SQLALCHEMY_AVAILABLE = False

# Create routers
router = APIRouter(tags=["Products & Suppliers"])
logger = logging.getLogger(__name__)


# ============================================================================
# SECTION 1: PUBLIC PRODUCT CATALOG (MongoDB - 3 endpoints)
# ============================================================================

products_router = APIRouter(prefix="/products", tags=["Products"])

@products_router.get("/", response_model=List[Product] if MONGODB_AVAILABLE else dict)
async def get_products():
    """
    Get all available products (public endpoint).
    
    No authentication required - visible to all users.
    
    Returns:
    - List of Product objects with public information
    """
    if not MONGODB_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    products = await db.products.find({}, {"_id": 0}).to_list(None)
    return products


@products_router.get("/{product_id}", response_model=Product if MONGODB_AVAILABLE else dict)
async def get_product(product_id: str):
    """
    Get a specific product by ID (public endpoint).
    
    Parameters:
    - product_id: Unique identifier of the product
    
    Returns:
    - Product details with pricing, category, etc.
    
    Raises:
    - 404: Product not found
    """
    if not MONGODB_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@products_router.post("/", response_model=Product if MONGODB_AVAILABLE else dict)
async def create_product(
    product: ProductCreate, 
    current_user: dict = Depends(require_role([UserRole.ADMIN])) if MONGODB_AVAILABLE else None
):
    """
    Create a new product (admin only).
    
    Creates product with:
    - Unique UUID
    - Category
    - Unit type (ml, kg, pieces, etc.)
    - MRP and description
    
    Security:
    - Admin role required
    
    Parameters:
    - product: ProductCreate object with product details
    
    Returns:
    - Created Product object
    """
    if not MONGODB_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    product_doc = {
        "id": generate_product_id(),
        **product.model_dump()
    }
    await db.products.insert_one(product_doc)
    return product_doc


@products_router.put("/{product_id}")
async def update_product(
    product_id: str, 
    product: ProductCreate, 
    current_user: dict = Depends(require_role([UserRole.ADMIN])) if MONGODB_AVAILABLE else None
):
    """
    Update product details (admin only).
    
    Parameters:
    - product_id: Unique identifier of the product
    - product: ProductCreate object with updated details
    
    Returns:
    - Success message
    
    Raises:
    - 404: Product not found
    """
    if not MONGODB_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": product.model_dump(exclude_unset=True)}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product updated"}


@products_router.delete("/{product_id}")
async def delete_product(
    product_id: str, 
    current_user: dict = Depends(require_role([UserRole.ADMIN])) if MONGODB_AVAILABLE else None
):
    """
    Delete a product (admin only).
    
    Parameters:
    - product_id: Unique identifier of the product
    
    Returns:
    - Success message
    
    Raises:
    - 404: Product not found
    """
    if not MONGODB_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}


# ============================================================================
# SECTION 2: ADMIN PRODUCT MANAGEMENT (SQLAlchemy - 6 endpoints)
# ============================================================================

admin_products_router = APIRouter(prefix="/api/admin/products", tags=["Admin Products"])

@admin_products_router.post("/create")
async def create_product_admin(
    data: dict,
    current_user = Depends(verify_token) if SQLALCHEMY_AVAILABLE else None,
    db = Depends(get_db) if SQLALCHEMY_AVAILABLE else None
):
    """
    Create a new product with supplier linkage (SQLAlchemy backend).
    
    Required fields:
    - name: Product name
    - category: Product category
    - unit: Unit of measurement (ml, kg, pieces, etc.)
    - mrp: Maximum retail price
    - description: (optional) Product description
    - image_url: (optional) Product image URL
    
    Security:
    - Admin or manager role required
    
    Returns:
    - Created product with full details
    """
    if not SQLALCHEMY_AVAILABLE:
        raise HTTPException(status_code=503, detail="SQLAlchemy not available")
    
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


@admin_products_router.put("/{product_id}")
async def update_product_admin(
    product_id: int,
    data: dict,
    current_user = Depends(verify_token) if SQLALCHEMY_AVAILABLE else None,
    db = Depends(get_db) if SQLALCHEMY_AVAILABLE else None
):
    """
    Update product details.
    
    Parameters:
    - product_id: Product ID (integer for SQLAlchemy)
    - data: Dictionary with fields to update
    
    Returns:
    - Updated product details
    
    Raises:
    - 403: Not authorized
    - 404: Product not found
    """
    if not SQLALCHEMY_AVAILABLE:
        raise HTTPException(status_code=503, detail="SQLAlchemy not available")
    
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


@admin_products_router.get("/")
async def get_products_admin(
    current_user = Depends(verify_token) if SQLALCHEMY_AVAILABLE else None,
    db = Depends(get_db) if SQLALCHEMY_AVAILABLE else None,
    limit: int = Query(100, ge=1, le=500),
    category: Optional[str] = None
):
    """
    Get all products with supplier information (admin view).
    
    Parameters:
    - limit: Maximum number of products to return (default: 100)
    - category: Filter by product category (optional)
    
    Returns:
    - List of products with enriched supplier information
    """
    if not SQLALCHEMY_AVAILABLE:
        raise HTTPException(status_code=503, detail="SQLAlchemy not available")
    
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


@admin_products_router.get("/{product_id}")
async def get_product_detail(
    product_id: int,
    current_user = Depends(verify_token) if SQLALCHEMY_AVAILABLE else None,
    db = Depends(get_db) if SQLALCHEMY_AVAILABLE else None
):
    """
    Get product details with suppliers and delivery history.
    
    Parameters:
    - product_id: Product ID (integer for SQLAlchemy)
    
    Returns:
    - Detailed product information including:
      * Supplier links with pricing terms
      * Recent deliveries from suppliers
      * Current month payables
    
    Raises:
    - 404: Product not found
    """
    if not SQLALCHEMY_AVAILABLE:
        raise HTTPException(status_code=503, detail="SQLAlchemy not available")
    
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


@admin_products_router.post("/{product_id}/link-supplier")
async def link_supplier_to_product(
    product_id: int,
    data: dict,
    current_user = Depends(verify_token) if SQLALCHEMY_AVAILABLE else None,
    db = Depends(get_db) if SQLALCHEMY_AVAILABLE else None
):
    """
    Link a supplier to a product with pricing terms.
    
    Required fields:
    - supplier_id: Supplier ID
    - purchase_rate: Cost per unit from supplier
    - agreed_quantity: Daily agreed quantity
    - delivery_cutoff_time: HH:MM format
    - delivery_frequency: (optional) daily, weekly, etc.
    - penalty_per_day_late: (optional) Late delivery penalty
    
    Security:
    - Admin or manager role required
    
    Returns:
    - Created supplier-product link details
    
    Raises:
    - 403: Not authorized
    - 404: Product or supplier not found
    - 400: Supplier already linked to product
    """
    if not SQLALCHEMY_AVAILABLE:
        raise HTTPException(status_code=503, detail="SQLAlchemy not available")
    
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


@admin_products_router.put("/supplier-link/{supplier_product_id}")
async def update_supplier_link(
    supplier_product_id: int,
    data: dict,
    current_user = Depends(verify_token) if SQLALCHEMY_AVAILABLE else None,
    db = Depends(get_db) if SQLALCHEMY_AVAILABLE else None
):
    """
    Update supplier-product linking terms.
    
    Parameters:
    - supplier_product_id: Link ID to update
    - data: Fields to update (purchase_rate, agreed_quantity, penalties, etc.)
    
    Returns:
    - Updated link details
    
    Raises:
    - 403: Not authorized
    - 404: Link not found
    """
    if not SQLALCHEMY_AVAILABLE:
        raise HTTPException(status_code=503, detail="SQLAlchemy not available")
    
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


# ============================================================================
# SECTION 3: SUPPLIER MANAGEMENT (MongoDB - 4 endpoints)
# ============================================================================

suppliers_router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@suppliers_router.post("/", response_model=Supplier if MONGODB_AVAILABLE else dict)
async def create_supplier(
    supplier: SupplierCreate, 
    current_user: dict = Depends(require_role([UserRole.ADMIN])) if MONGODB_AVAILABLE else None
):
    """
    Create a new supplier (admin only).
    
    Creates supplier with:
    - Unique UUID
    - Contact information
    - Bank details
    - Active status
    
    Parameters:
    - supplier: SupplierCreate object with supplier details
    
    Returns:
    - Created Supplier object
    """
    if not MONGODB_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    supplier_doc = {
        "id": generate_id("sup"),
        **supplier.model_dump(),
        "is_active": True
    }
    await db.suppliers.insert_one(supplier_doc)
    return supplier_doc


@suppliers_router.get("/", response_model=List[Supplier] if MONGODB_AVAILABLE else dict)
async def get_suppliers(
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPPLIER])) if MONGODB_AVAILABLE else None
):
    """
    Get all suppliers (admin and suppliers only).
    
    Returns:
    - List of all active suppliers with their details
    """
    if not MONGODB_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(None)
    return suppliers


@suppliers_router.get("/my-orders")
async def get_supplier_orders(
    current_user: dict = Depends(require_role([UserRole.SUPPLIER])) if MONGODB_AVAILABLE else None
):
    """
    Get procurement orders for logged-in supplier.
    
    Finds supplier by email and returns their procurement orders,
    sorted by creation date (newest first).
    
    Returns:
    - List of procurement orders assigned to this supplier
    
    Raises:
    - 404: Supplier profile not found for user email
    """
    if not MONGODB_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    # Find supplier by user email
    supplier = await db.suppliers.find_one({"email": current_user["email"]}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    
    orders = await db.procurement_orders.find(
        {"supplier_id": supplier["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(None)
    
    return orders


@suppliers_router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str, 
    status: str, 
    current_user: dict = Depends(require_role([UserRole.SUPPLIER, UserRole.ADMIN])) if MONGODB_AVAILABLE else None
):
    """
    Update procurement order status.
    
    Valid statuses:
    - pending: Order placed, awaiting supplier confirmation
    - confirmed: Supplier confirmed the order
    - delivered: Order delivered to warehouse
    - cancelled: Order cancelled by admin or supplier
    
    Parameters:
    - order_id: Unique identifier of the procurement order
    - status: New status from valid list above
    
    Returns:
    - Success message
    
    Raises:
    - 400: Invalid status provided
    - 404: Order not found
    """
    if not MONGODB_AVAILABLE:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    if status not in ["pending", "confirmed", "delivered", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.procurement_orders.update_one(
        {"id": order_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated"}


# ============================================================================
# ROUTER REGISTRATION
# ============================================================================

# Include all routers
router.include_router(products_router)
router.include_router(admin_products_router)
router.include_router(suppliers_router)
