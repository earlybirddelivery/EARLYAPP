"""
MongoDB Models for Image OCR System
Phase 4B.5: Receipt Scanning & Product Recognition

Collections:
1. scan_history - Track all OCR scans by user
2. receipt_data - Raw extracted data from receipts
3. product_matches - Matched products from OCR text
4. ocr_logs - System logs for debugging
"""

# ============================================================================
# COLLECTION 1: scan_history
# Purpose: Track all OCR scan operations by user
# Usage: Get user's scan history, manage scans, analytics
# ============================================================================

SCAN_HISTORY_SCHEMA = {
    "_id": "ObjectId",  # Unique scan ID
    "user_id": "String",  # Links to users collection
    "customer_id": "String",  # Links to customers_v2
    "scan_type": "String",  # "receipt", "bill", "invoice", "menu"
    "image_url": "String",  # S3/CDN URL to original image
    "image_size": "Number",  # Bytes
    "image_format": "String",  # "jpg", "png", "webp"
    "confidence_score": "Number",  # 0-100, overall OCR confidence
    "language": "String",  # "en", "hi", "ta", etc.
    "processing_time_ms": "Number",  # Time to extract text
    "text_extracted": "String",  # Raw extracted text (first 5000 chars)
    "matched_products": [
        {
            "product_id": "String",
            "product_name": "String",
            "quantity": "Number",
            "unit": "String",  # "kg", "pieces", "liters"
            "unit_price": "Number",
            "total_price": "Number",
            "confidence": "Number",  # 0-100
            "matched_at": "Date"
        }
    ],
    "total_amount": "Number",  # Total bill amount
    "currency": "String",  # "INR"
    "status": "String",  # "PENDING", "PROCESSED", "MATCHED", "COMPLETED", "ERROR"
    "error_message": "String",  # If processing failed
    "created_at": "Date",
    "processed_at": "Date",
    "completed_at": "Date"
}

SCAN_HISTORY_SAMPLE = {
    "_id": "ObjectId('65a1b2c3d4e5f6g7h8i9j0k1')",
    "user_id": "user_abc123",
    "customer_id": "cust_xyz789",
    "scan_type": "receipt",
    "image_url": "https://cdn.example.com/scans/scan_123.jpg",
    "image_size": 245000,
    "image_format": "jpg",
    "confidence_score": 87,
    "language": "en",
    "processing_time_ms": 2340,
    "text_extracted": "XYZ Kirana Store\nReceipt #12345\n\nRice - 5kg - ₹250\nDal - 2kg - ₹180\nOil - 2L - ₹320\n\nTotal: ₹750\nDate: 28/01/2026",
    "matched_products": [
        {
            "product_id": "prod_rice_001",
            "product_name": "Basmati Rice (5kg)",
            "quantity": 5,
            "unit": "kg",
            "unit_price": 50,
            "total_price": 250,
            "confidence": 95,
            "matched_at": "2026-01-28T10:30:00Z"
        },
        {
            "product_id": "prod_dal_002",
            "product_name": "Moong Dal (2kg)",
            "quantity": 2,
            "unit": "kg",
            "unit_price": 90,
            "total_price": 180,
            "confidence": 88,
            "matched_at": "2026-01-28T10:30:00Z"
        }
    ],
    "total_amount": 750,
    "currency": "INR",
    "status": "COMPLETED",
    "created_at": "2026-01-28T10:25:00Z",
    "processed_at": "2026-01-28T10:27:00Z",
    "completed_at": "2026-01-28T10:30:00Z"
}

# ============================================================================
# COLLECTION 2: receipt_data
# Purpose: Store detailed extracted data from receipts
# Usage: Access raw OCR data, audit trail, corrections
# ============================================================================

RECEIPT_DATA_SCHEMA = {
    "_id": "ObjectId",
    "scan_id": "String",  # Links to scan_history
    "user_id": "String",
    "merchant_name": "String",  # Store name extracted
    "merchant_phone": "String",  # Store phone if found
    "merchant_address": "String",  # Address if found
    "receipt_number": "String",  # Receipt/bill number
    "receipt_date": "Date",  # Date from receipt
    "line_items": [
        {
            "item_index": "Number",
            "item_text": "String",  # Raw text for item
            "item_name": "String",  # Parsed item name
            "quantity": "Number",
            "unit": "String",
            "unit_price": "Number",
            "total_price": "Number",
            "confidence": "Number"
        }
    ],
    "subtotal": "Number",
    "tax": "Number",
    "discount": "Number",
    "total": "Number",
    "payment_method": "String",  # "cash", "card", "upi"
    "raw_text": "String",  # Full OCR output
    "text_blocks": [
        {
            "text": "String",
            "confidence": "Number",
            "bounding_box": {
                "x": "Number",
                "y": "Number",
                "width": "Number",
                "height": "Number"
            }
        }
    ],
    "manual_corrections": [
        {
            "field": "String",
            "original": "String",
            "corrected": "String",
            "corrected_by": "String",
            "corrected_at": "Date"
        }
    ],
    "created_at": "Date"
}

RECEIPT_DATA_SAMPLE = {
    "_id": "ObjectId('65a1b2c3d4e5f6g7h8i9j0k2')",
    "scan_id": "ObjectId('65a1b2c3d4e5f6g7h8i9j0k1')",
    "user_id": "user_abc123",
    "merchant_name": "XYZ Kirana Store",
    "merchant_phone": "+91-98765-43210",
    "merchant_address": "123 Main St, Delhi",
    "receipt_number": "RCP-12345",
    "receipt_date": "2026-01-28T14:30:00Z",
    "line_items": [
        {
            "item_index": 1,
            "item_text": "Rice - 5kg",
            "item_name": "Basmati Rice",
            "quantity": 5,
            "unit": "kg",
            "unit_price": 50,
            "total_price": 250,
            "confidence": 92
        },
        {
            "item_index": 2,
            "item_text": "Dal - 2kg",
            "item_name": "Moong Dal",
            "quantity": 2,
            "unit": "kg",
            "unit_price": 90,
            "total_price": 180,
            "confidence": 88
        }
    ],
    "subtotal": 750,
    "tax": 0,
    "discount": 0,
    "total": 750,
    "payment_method": "cash",
    "raw_text": "[Full OCR text...]",
    "created_at": "2026-01-28T10:25:00Z"
}

# ============================================================================
# COLLECTION 3: product_matches
# Purpose: Track product matching results for analytics
# Usage: Improve matching algorithm, track success rates
# ============================================================================

PRODUCT_MATCHES_SCHEMA = {
    "_id": "ObjectId",
    "scan_id": "String",  # Links to scan_history
    "user_id": "String",
    "extracted_text": "String",  # Original OCR text for item
    "product_id": "String",  # Links to products collection
    "product_name": "String",
    "category": "String",
    "brand": "String",
    "sku": "String",
    "match_method": "String",  # "text_match", "fuzzy_match", "semantic", "manual"
    "confidence_score": "Number",  # 0-100
    "match_reasoning": "String",  # Why this product was matched
    "similarity_details": {
        "name_similarity": "Number",
        "keyword_match": "Boolean",
        "category_match": "Boolean",
        "brand_match": "Boolean"
    },
    "user_confirmed": "Boolean",  # Did user accept this match?
    "confirmed_at": "Date",
    "rejected": "Boolean",  # User rejected match
    "rejected_reason": "String",
    "alternative_matches": [
        {
            "product_id": "String",
            "product_name": "String",
            "confidence": "Number"
        }
    ],
    "created_at": "Date"
}

PRODUCT_MATCHES_SAMPLE = {
    "_id": "ObjectId('65a1b2c3d4e5f6g7h8i9j0k3')",
    "scan_id": "ObjectId('65a1b2c3d4e5f6g7h8i9j0k1')",
    "user_id": "user_abc123",
    "extracted_text": "Rice - 5kg",
    "product_id": "prod_rice_001",
    "product_name": "Basmati Rice (5kg)",
    "category": "Grains",
    "brand": "Premium",
    "sku": "SKU-RICE-001",
    "match_method": "text_match",
    "confidence_score": 95,
    "match_reasoning": "Exact match on 'Basmati Rice' + weight",
    "similarity_details": {
        "name_similarity": 98,
        "keyword_match": True,
        "category_match": True,
        "brand_match": False
    },
    "user_confirmed": True,
    "confirmed_at": "2026-01-28T10:35:00Z",
    "rejected": False,
    "alternative_matches": [
        {
            "product_id": "prod_rice_002",
            "product_name": "White Rice (5kg)",
            "confidence": 78
        }
    ],
    "created_at": "2026-01-28T10:30:00Z"
}

# ============================================================================
# COLLECTION 4: ocr_logs
# Purpose: System logs for debugging and monitoring
# Usage: Troubleshooting, performance analysis, error tracking
# ============================================================================

OCR_LOGS_SCHEMA = {
    "_id": "ObjectId",
    "scan_id": "String",  # Links to scan_history
    "user_id": "String",
    "timestamp": "Date",
    "event_type": "String",  # "UPLOAD", "PROCESSING", "EXTRACTION", "MATCHING", "ERROR"
    "status": "String",  # "START", "PROGRESS", "SUCCESS", "FAILURE"
    "log_level": "String",  # "DEBUG", "INFO", "WARNING", "ERROR"
    "message": "String",
    "error_code": "String",  # Error code if failed
    "error_details": "String",  # Full error message
    "processing_details": {
        "image_width": "Number",
        "image_height": "Number",
        "image_size_kb": "Number",
        "ocr_engine": "String",  # "tesseract", "easyocr", "paddle"
        "processing_time_ms": "Number",
        "confidence_avg": "Number",
        "text_length": "Number"
    },
    "performance_metrics": {
        "upload_time_ms": "Number",
        "processing_time_ms": "Number",
        "matching_time_ms": "Number",
        "total_time_ms": "Number"
    },
    "user_agent": "String",
    "ip_address": "String",
    "created_at": "Date"
}

OCR_LOGS_SAMPLE = {
    "_id": "ObjectId('65a1b2c3d4e5f6g7h8i9j0k4')",
    "scan_id": "ObjectId('65a1b2c3d4e5f6g7h8i9j0k1')",
    "user_id": "user_abc123",
    "timestamp": "2026-01-28T10:25:00Z",
    "event_type": "EXTRACTION",
    "status": "SUCCESS",
    "log_level": "INFO",
    "message": "Successfully extracted text from image",
    "processing_details": {
        "image_width": 1920,
        "image_height": 1440,
        "image_size_kb": 245,
        "ocr_engine": "easyocr",
        "processing_time_ms": 2340,
        "confidence_avg": 87,
        "text_length": 450
    },
    "performance_metrics": {
        "upload_time_ms": 1200,
        "processing_time_ms": 2340,
        "matching_time_ms": 850,
        "total_time_ms": 4390
    },
    "created_at": "2026-01-28T10:25:00Z"
}

# ============================================================================
# INDEXES - FOR PERFORMANCE OPTIMIZATION
# ============================================================================

INDEXES = [
    # scan_history indexes
    ("scan_history", [("user_id", 1), ("created_at", -1)]),
    ("scan_history", [("customer_id", 1), ("created_at", -1)]),
    ("scan_history", [("scan_type", 1)]),
    ("scan_history", [("status", 1)]),
    ("scan_history", [("confidence_score", 1)]),
    ("scan_history", [("created_at", -1)]),
    
    # receipt_data indexes
    ("receipt_data", [("scan_id", 1)]),
    ("receipt_data", [("user_id", 1)]),
    ("receipt_data", [("receipt_date", -1)]),
    ("receipt_data", [("merchant_name", 1)]),
    
    # product_matches indexes
    ("product_matches", [("scan_id", 1)]),
    ("product_matches", [("user_id", 1), ("created_at", -1)]),
    ("product_matches", [("product_id", 1)]),
    ("product_matches", [("confidence_score", -1)]),
    ("product_matches", [("user_confirmed", 1)]),
    
    # ocr_logs indexes
    ("ocr_logs", [("scan_id", 1)]),
    ("ocr_logs", [("user_id", 1), ("timestamp", -1)]),
    ("ocr_logs", [("event_type", 1)]),
    ("ocr_logs", [("log_level", 1)]),
]

# ============================================================================
# MONGODB COLLECTION INITIALIZATION
# ============================================================================

def initialize_ocr_collections(db):
    """Initialize all OCR collections with proper indexes"""
    
    # Create scan_history collection
    if "scan_history" not in db.list_collection_names():
        db.create_collection("scan_history")
    
    # Create receipt_data collection
    if "receipt_data" not in db.list_collection_names():
        db.create_collection("receipt_data")
    
    # Create product_matches collection
    if "product_matches" not in db.list_collection_names():
        db.create_collection("product_matches")
    
    # Create ocr_logs collection
    if "ocr_logs" not in db.list_collection_names():
        db.create_collection("ocr_logs")
    
    # Create all indexes
    for collection_name, index_fields in INDEXES:
        collection = db[collection_name]
        try:
            collection.create_index(index_fields)
            print(f"✅ Created index on {collection_name}: {index_fields}")
        except Exception as e:
            print(f"⚠️  Index already exists or error: {e}")
    
    print("✅ All OCR collections initialized successfully")

# ============================================================================
# USAGE EXAMPLE
# ============================================================================

"""
from pymongo import MongoClient
from models_ocr import initialize_ocr_collections

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["earlybird_kirana"]

# Initialize collections
initialize_ocr_collections(db)

# Insert sample scan
sample_scan = {
    "user_id": "user_abc123",
    "customer_id": "cust_xyz789",
    "scan_type": "receipt",
    "image_url": "https://cdn.example.com/scans/scan_123.jpg",
    "status": "PENDING",
    "created_at": datetime.datetime.now()
}

result = db.scan_history.insert_one(sample_scan)
print(f"Inserted scan with ID: {result.inserted_id}")
"""
