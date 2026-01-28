"""
Data Import Routes for EarlyBird Admin Portal
Supports bulk importing of customers, orders, deliveries, subscriptions, and suppliers from Excel/CSV
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, date
from pydantic import BaseModel, EmailStr, field_validator
import pandas as pd
import uuid
import json
import re
from io import BytesIO

router = APIRouter(prefix="/api/admin/import", tags=["Admin Import"])

# ==================== MODELS ====================

class ImportResult(BaseModel):
    import_id: str
    status: str  # success, partial, failed
    data_type: str
    file_name: str
    total_records: int
    imported_records: int
    failed_records: int
    errors: List[str] = []
    warnings: List[str] = []
    timestamp: str
    duration_ms: int

class ImportLog(BaseModel):
    id: str
    import_date: str
    imported_by: str
    data_type: str
    file_name: str
    total_records: int
    imported_records: int
    failed_records: int
    errors: List[str]
    warnings: List[str]
    status: str
    file_hash: Optional[str] = None
    duration_ms: int

# ==================== VALIDATION SCHEMAS ====================

class CustomerImportRow(BaseModel):
    name: str
    email: EmailStr
    phone: str
    area: str
    subscription: Optional[str] = None
    price: Optional[float] = None
    balance: Optional[float] = 0.0
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if not re.match(r'^\d{10}$', v.replace('-', '')):
            raise ValueError('Invalid phone number format (must be 10 digits)')
        return v

class OrderImportRow(BaseModel):
    customer_id: str
    order_date: str
    delivery_date: Optional[str] = None
    amount: float
    status: Optional[str] = "pending"
    
    @field_validator('order_date', 'delivery_date')
    @classmethod
    def validate_date_format(cls, v):
        if v:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError('Invalid date format (use YYYY-MM-DD)')
        return v

class DeliveryImportRow(BaseModel):
    customer_id: str
    customer_name: str
    delivery_date: str
    area: str
    address: Optional[str] = None
    status: Optional[str] = "pending"
    
    @field_validator('delivery_date')
    @classmethod
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
        except ValueError:
            raise ValueError('Invalid date format (use YYYY-MM-DD)')
        return v

class SubscriptionImportRow(BaseModel):
    customer_id: str
    product_id: Optional[str] = None
    plan_name: str
    price: float
    start_date: Optional[str] = None
    frequency: Optional[str] = "daily"
    
    @field_validator('start_date')
    @classmethod
    def validate_date_format(cls, v):
        if v:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError('Invalid date format (use YYYY-MM-DD)')
        return v

class SupplierImportRow(BaseModel):
    name: str
    contact_person: str
    phone: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if not re.match(r'^\d{10}$', v.replace('-', '')):
            raise ValueError('Invalid phone number format (must be 10 digits)')
        return v

# ==================== HELPER FUNCTIONS ====================

def validate_required_columns(df: pd.DataFrame, data_type: str) -> tuple[bool, List[str]]:
    """Validate that all required columns are present"""
    required_columns = {
        'customers': ['name', 'email', 'phone', 'area'],
        'orders': ['customer_id', 'order_date', 'amount'],
        'delivery': ['customer_id', 'customer_name', 'delivery_date', 'area'],
        'subscriptions': ['customer_id', 'plan_name', 'price'],
        'suppliers': ['name', 'contact_person', 'phone']
    }
    
    required = required_columns.get(data_type, [])
    df_columns = [col.lower().strip() for col in df.columns]
    required_lower = [col.lower() for col in required]
    
    missing = [col for col in required_lower if col not in df_columns]
    
    if missing:
        return False, [f"Missing required columns: {', '.join(missing)}"]
    
    return True, []

def standardize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Convert column names to lowercase and strip whitespace"""
    df.columns = [col.lower().strip() for col in df.columns]
    return df

def validate_email_format(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, str(email)))

def validate_date_format(date_str: str) -> bool:
    """Validate date is in YYYY-MM-DD format"""
    if not date_str:
        return True  # Optional dates
    try:
        datetime.strptime(str(date_str), '%Y-%m-%d')
        return True
    except (ValueError, TypeError):
        return False

def validate_phone_format(phone: str) -> bool:
    """Validate phone is 10 digits"""
    if not phone:
        return False
    clean_phone = str(phone).replace('-', '').replace(' ', '')
    return bool(re.match(r'^\d{10}$', clean_phone))

async def get_current_admin(token: Optional[str] = None) -> Dict[str, Any]:
    """
    Mock implementation - Replace with actual auth when available
    In production, this would verify JWT token
    """
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Mock admin user - replace with real auth
    return {
        "id": "admin-001",
        "email": "admin@earlybird.com",
        "name": "Admin User",
        "role": "admin"
    }

# ==================== IMPORT ENDPOINTS ====================

@router.post("/customers")
async def import_customers(
    file: UploadFile = File(...),
    auth_token: Optional[str] = None
) -> ImportResult:
    """
    Bulk import customers from Excel or CSV
    
    Required columns: name, email, phone, area
    Optional columns: subscription, price, balance
    """
    import_start = datetime.now(timezone.utc)
    import_id = str(uuid.uuid4())
    errors: List[str] = []
    warnings: List[str] = []
    imported_records = 0
    total_records = 0
    
    try:
        # Verify authentication
        # current_user = await get_current_admin(auth_token)
        
        # Parse file
        if file.filename.endswith('.xlsx'):
            df = pd.read_excel(BytesIO(await file.read()))
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(await file.read()))
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Use .xlsx or .csv"
            )
        
        # Standardize columns
        df = standardize_column_names(df)
        df = df.fillna('')
        
        # Validate structure
        is_valid, validation_errors = validate_required_columns(df, 'customers')
        if not is_valid:
            return ImportResult(
                import_id=import_id,
                status="failed",
                data_type="customers",
                file_name=file.filename,
                total_records=0,
                imported_records=0,
                failed_records=0,
                errors=validation_errors,
                warnings=[],
                timestamp=import_start.isoformat(),
                duration_ms=0
            )
        
        total_records = len(df)
        
        # Validate and import rows
        for idx, row in df.iterrows():
            row_num = idx + 2  # +2 because Excel is 1-indexed and has header
            
            try:
                # Validate required fields
                if not row.get('name', '').strip():
                    errors.append(f"Row {row_num}: Missing customer name")
                    continue
                
                if not validate_email_format(row.get('email', '')):
                    errors.append(f"Row {row_num}: Invalid email format")
                    continue
                
                if not validate_phone_format(row.get('phone', '')):
                    errors.append(f"Row {row_num}: Invalid phone number (must be 10 digits)")
                    continue
                
                if not row.get('area', '').strip():
                    errors.append(f"Row {row_num}: Missing area")
                    continue
                
                # Prepare customer document
                customer_doc = {
                    "id": str(uuid.uuid4()),
                    "name": row['name'].strip(),
                    "email": row['email'].strip(),
                    "phone": str(row['phone']).replace('-', '').replace(' ', ''),
                    "area": row['area'].strip(),
                    "subscription": row.get('subscription', '').strip() or None,
                    "price": float(row['price']) if row.get('price') else 0.0,
                    "balance": float(row.get('balance', 0)) or 0.0,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "is_active": True
                }
                
                # In production, save to database:
                # await db.customers.update_one(
                #     {"email": customer_doc["email"]},
                #     {"$set": customer_doc},
                #     upsert=True
                # )
                
                imported_records += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        # Calculate metrics
        failed_records = total_records - imported_records
        duration_ms = int((datetime.now(timezone.utc) - import_start).total_seconds() * 1000)
        
        # Create import log
        import_log = ImportLog(
            id=import_id,
            import_date=import_start.isoformat(),
            imported_by="admin-001",  # Would be current_user["id"]
            data_type="customers",
            file_name=file.filename,
            total_records=total_records,
            imported_records=imported_records,
            failed_records=failed_records,
            errors=errors,
            warnings=warnings,
            status="success" if failed_records == 0 else "partial",
            duration_ms=duration_ms
        )
        
        # In production, save to database:
        # await db.import_logs.insert_one(import_log.model_dump())
        
        return ImportResult(
            import_id=import_id,
            status=import_log.status,
            data_type="customers",
            file_name=file.filename,
            total_records=total_records,
            imported_records=imported_records,
            failed_records=failed_records,
            errors=errors,
            warnings=warnings,
            timestamp=import_start.isoformat(),
            duration_ms=duration_ms
        )
        
    except Exception as e:
        duration_ms = int((datetime.now(timezone.utc) - import_start).total_seconds() * 1000)
        return ImportResult(
            import_id=import_id,
            status="failed",
            data_type="customers",
            file_name=file.filename if file else "unknown",
            total_records=total_records,
            imported_records=0,
            failed_records=total_records,
            errors=[f"Fatal error: {str(e)}"],
            warnings=[],
            timestamp=import_start.isoformat(),
            duration_ms=duration_ms
        )

@router.post("/orders")
async def import_orders(
    file: UploadFile = File(...),
    auth_token: Optional[str] = None
) -> ImportResult:
    """
    Bulk import orders from Excel or CSV
    
    Required columns: customer_id, order_date, amount
    Optional columns: delivery_date, status
    """
    return await _import_generic_data(file, "orders", auth_token)

@router.post("/delivery")
async def import_delivery(
    file: UploadFile = File(...),
    auth_token: Optional[str] = None
) -> ImportResult:
    """
    Bulk import delivery records from Excel or CSV
    
    Required columns: customer_id, customer_name, delivery_date, area
    Optional columns: address, status
    """
    return await _import_generic_data(file, "delivery", auth_token)

@router.post("/subscriptions")
async def import_subscriptions(
    file: UploadFile = File(...),
    auth_token: Optional[str] = None
) -> ImportResult:
    """
    Bulk import subscriptions from Excel or CSV
    
    Required columns: customer_id, plan_name, price
    Optional columns: product_id, start_date, frequency
    """
    return await _import_generic_data(file, "subscriptions", auth_token)

@router.post("/suppliers")
async def import_suppliers(
    file: UploadFile = File(...),
    auth_token: Optional[str] = None
) -> ImportResult:
    """
    Bulk import suppliers from Excel or CSV
    
    Required columns: name, contact_person, phone
    Optional columns: email, address
    """
    return await _import_generic_data(file, "suppliers", auth_token)

async def _import_generic_data(
    file: UploadFile,
    data_type: str,
    auth_token: Optional[str]
) -> ImportResult:
    """Generic import handler for all data types"""
    import_start = datetime.now(timezone.utc)
    import_id = str(uuid.uuid4())
    errors: List[str] = []
    warnings: List[str] = []
    imported_records = 0
    total_records = 0
    
    try:
        # Parse file
        if file.filename.endswith('.xlsx'):
            df = pd.read_excel(BytesIO(await file.read()))
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(await file.read()))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Standardize and validate
        df = standardize_column_names(df)
        df = df.fillna('')
        
        is_valid, validation_errors = validate_required_columns(df, data_type)
        if not is_valid:
            return ImportResult(
                import_id=import_id,
                status="failed",
                data_type=data_type,
                file_name=file.filename,
                total_records=0,
                imported_records=0,
                failed_records=0,
                errors=validation_errors,
                timestamp=import_start.isoformat(),
                duration_ms=0
            )
        
        total_records = len(df)
        
        # Import rows (simplified - actual implementation would vary by type)
        for idx, row in df.iterrows():
            row_num = idx + 2
            try:
                # Validate based on data type
                if data_type == "orders":
                    if not row.get('customer_id'):
                        raise ValueError("Missing customer_id")
                    if not validate_date_format(row.get('order_date')):
                        raise ValueError("Invalid order_date format")
                    if not row.get('amount'):
                        raise ValueError("Missing amount")
                
                elif data_type == "delivery":
                    if not row.get('customer_id'):
                        raise ValueError("Missing customer_id")
                    if not row.get('customer_name'):
                        raise ValueError("Missing customer_name")
                    if not validate_date_format(row.get('delivery_date')):
                        raise ValueError("Invalid delivery_date format")
                    if not row.get('area'):
                        raise ValueError("Missing area")
                
                elif data_type == "subscriptions":
                    if not row.get('customer_id'):
                        raise ValueError("Missing customer_id")
                    if not row.get('plan_name'):
                        raise ValueError("Missing plan_name")
                    if not row.get('price'):
                        raise ValueError("Missing price")
                
                elif data_type == "suppliers":
                    if not row.get('name'):
                        raise ValueError("Missing name")
                    if not row.get('contact_person'):
                        raise ValueError("Missing contact_person")
                    if not validate_phone_format(row.get('phone')):
                        raise ValueError("Invalid phone format")
                
                # In production, save to database
                imported_records += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        failed_records = total_records - imported_records
        duration_ms = int((datetime.now(timezone.utc) - import_start).total_seconds() * 1000)
        
        return ImportResult(
            import_id=import_id,
            status="success" if failed_records == 0 else "partial",
            data_type=data_type,
            file_name=file.filename,
            total_records=total_records,
            imported_records=imported_records,
            failed_records=failed_records,
            errors=errors,
            warnings=warnings,
            timestamp=import_start.isoformat(),
            duration_ms=duration_ms
        )
        
    except Exception as e:
        duration_ms = int((datetime.now(timezone.utc) - import_start).total_seconds() * 1000)
        return ImportResult(
            import_id=import_id,
            status="failed",
            data_type=data_type,
            file_name=file.filename,
            total_records=total_records,
            imported_records=0,
            failed_records=total_records,
            errors=[f"Fatal error: {str(e)}"],
            timestamp=import_start.isoformat(),
            duration_ms=duration_ms
        )

# ==================== HISTORY ENDPOINTS ====================

@router.get("/history")
async def get_import_history(
    data_type: Optional[str] = None,
    limit: int = 50,
    auth_token: Optional[str] = None
) -> List[ImportLog]:
    """
    Get import history
    
    Optional filters:
    - data_type: Filter by data type (customers, orders, delivery, etc.)
    - limit: Maximum records to return (default 50)
    """
    # In production, query from database:
    # query = {}
    # if data_type:
    #     query["data_type"] = data_type
    # return await db.import_logs.find(query).sort("import_date", -1).limit(limit).to_list(None)
    
    return []  # Mock return

@router.get("/statistics")
async def get_import_statistics(auth_token: Optional[str] = None) -> Dict[str, Any]:
    """
    Get import statistics aggregated by data type
    
    Returns:
    {
        "total_imports": 45,
        "total_records_imported": 12543,
        "by_data_type": {
            "customers": {
                "count": 20,
                "total_records": 5000,
                "success_rate": 99.5
            },
            ...
        }
    }
    """
    # In production, aggregate from database:
    # stats = await db.import_logs.aggregate([...])
    
    return {
        "total_imports": 0,
        "total_records_imported": 0,
        "by_data_type": {}
    }  # Mock return
