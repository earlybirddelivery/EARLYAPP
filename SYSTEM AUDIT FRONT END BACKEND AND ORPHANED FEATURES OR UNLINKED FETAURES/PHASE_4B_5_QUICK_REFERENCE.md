# 📸 PHASE 4B.5: Image OCR - Quick Reference Guide

**Phase:** 4B.5 - Image OCR & Receipt Scanning  
**Status:** ✅ 100% COMPLETE  
**Quick Setup Time:** 45 minutes  
**Production Ready:** YES  

---

## ⚡ Quick Start (45 Minutes)

### Backend Setup (30 minutes)
```bash
# 1. Install dependencies
pip install easyocr flask pymongo fuzzywuzzy python-levenshtein pillow

# 2. Copy files to backend/
cp models_ocr.py backend/
cp ocr_service.py backend/
cp routes_ocr.py backend/

# 3. Initialize database
python -c "
from pymongo import MongoClient
from models_ocr import initialize_ocr_collections
db = MongoClient('mongodb://localhost:27017/')['earlybird_kirana']
initialize_ocr_collections(db)
"

# 4. Register in server.py
# Add to server.py:
from routes_ocr import init_ocr_bp
ocr_bp = init_ocr_bp(db)
app.register_blueprint(ocr_bp)
```

### Frontend Setup (15 minutes)
```bash
# 1. Copy files to frontend/
cp CameraCapture.jsx src/components/
cp OCRResults.jsx src/components/
cp CameraCapture.module.css src/components/
cp OCRResults.module.css src/components/
cp ocrService.js src/services/

# 2. Update .env
REACT_APP_API_URL=http://localhost:5000/api

# 3. Build and deploy
npm run build
```

---

## 📁 Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| models_ocr.py | 500+ | MongoDB schemas (4 collections, 15 indexes) |
| ocr_service.py | 800+ | Core OCR logic (7 methods, EasyOCR integration) |
| routes_ocr.py | 600+ | REST API (6 endpoints, auth, validation) |
| CameraCapture.jsx | 400+ | Camera component (live feed, capture, preview) |
| OCRResults.jsx | 500+ | Results display (confidence, editing, filtering) |
| ocrService.js | 300+ | API client (upload, batch, history) |
| CameraCapture.module.css | 500+ | Camera styling (responsive, dark mode) |
| OCRResults.module.css | 400+ | Results styling (cards, tabs, animations) |
| **TOTAL** | **3,800+** | **Complete system** |

---

## 🔌 API Quick Reference

### Upload Receipt
```bash
curl -X POST http://localhost:5000/api/ocr/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@receipt.jpg" \
  -F "scan_type=receipt"

# Response:
{
  "scan_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "confidence_score": 87.5,
  "matched_products": [...],
  "total_amount": 750
}
```

### Get Results
```bash
curl -X GET http://localhost:5000/api/ocr/65a1b2c3d4e5f6g7h8i9j0k1 \
  -H "Authorization: Bearer $TOKEN"
```

### Update Matches
```bash
curl -X PUT http://localhost:5000/api/ocr/65a1b2c3d4e5f6g7h8i9j0k1/match \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"matches": [...]}'
```

### Get History
```bash
curl -X GET "http://localhost:5000/api/ocr/history/user_123?limit=50&skip=0" \
  -H "Authorization: Bearer $TOKEN"
```

### Delete Scan
```bash
curl -X DELETE http://localhost:5000/api/ocr/65a1b2c3d4e5f6g7h8i9j0k1 \
  -H "Authorization: Bearer $TOKEN"
```

### Batch Upload
```bash
curl -X POST http://localhost:5000/api/ocr/batch \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@receipt1.jpg" \
  -F "files=@receipt2.jpg" \
  -F "scan_type=receipt"
```

---

## 🔑 Core Methods Reference

### Backend

**OCRService class:**
```python
# 1. Extract text from image
ocr_service.extract_text_from_image(image_path, user_id)
# Returns: {extracted_text, confidence_score, text_blocks, ...}

# 2. Parse receipt structure
ocr_service.parse_receipt(extracted_text)
# Returns: {merchant_name, items, total, payment_method, ...}

# 3. Match products
ocr_service.match_products(line_items, user_id, threshold=70)
# Returns: [{product_id, product_name, confidence, ...}, ...]

# 4. Save to database
ocr_service.save_scan_history(scan_data, user_id, customer_id)
# Returns: scan_id

# 5. Get user scans
ocr_service.get_user_scans(user_id, limit=50, skip=0)
# Returns: [scan1, scan2, ...]

# 6. Delete scan
ocr_service.delete_scan(scan_id, user_id)
# Returns: True/False

# 7. Calculate confidence
ocr_service.calculate_confidence_score(ocr_conf, match_conf, text_length)
# Returns: overall_score (0-100)
```

### Frontend

**ocrService methods:**
```javascript
// 1. Upload receipt
ocrService.uploadReceipt(file, scanType)
// Returns: {scan_id, extracted_text, confidence_score, matched_products}

// 2. Get extraction
ocrService.getExtraction(scanId)
// Returns: {scan object with full details}

// 3. Update matches
ocrService.updateProductMatch(scanId, matches)
// Returns: {matches_updated count}

// 4. Get history
ocrService.getScanHistory(userId, limit, skip)
// Returns: {scans, total, limit, skip}

// 5. Delete scan
ocrService.deleteScan(scanId)
// Returns: {success: true}

// 6. Batch upload
ocrService.batchUpload(files, scanType)
// Returns: {results, successful, failed}

// 7. Validate file
ocrService.validateImageFile(file)
// Returns: {valid: true/false, error: message}
```

---

## 📊 Database Collections

### scan_history
```javascript
{
  user_id: "user_123",
  confidence_score: 87.5,
  matched_products: [
    {product_id, product_name, quantity, unit_price, total_price, confidence}
  ],
  total_amount: 750,
  status: "COMPLETED",
  created_at: Date
}

Key Indexes:
- (user_id, created_at DESC)
- (customer_id, created_at DESC)
- (status)
- (confidence_score DESC)
```

### receipt_data
```javascript
{
  scan_id: "...",
  merchant_name: "XYZ Kirana",
  line_items: [{item_name, quantity, unit, unit_price, total_price}],
  total: 750,
  payment_method: "cash"
}
```

### product_matches
```javascript
{
  scan_id: "...",
  extracted_text: "Rice - 5kg",
  product_id: "prod_rice_001",
  confidence: 95,
  user_confirmed: true
}
```

### ocr_logs
```javascript
{
  scan_id: "...",
  event_type: "EXTRACTION",
  status: "SUCCESS",
  processing_time_ms: 2340,
  confidence_avg: 87
}
```

---

## 📱 Component Props

### CameraCapture
```javascript
<CameraCapture
  onCapture={(file, scanType) => {...}}  // Called with photo File object
  onClose={() => {...}}                   // Called when closing
  scanType="receipt"                      // Type: receipt, bill, invoice, menu
  maxRetries={5}                          // Max photos before auto-submit
/>
```

### OCRResults
```javascript
<OCRResults
  scanId="65a1b2c3d4e5f6g7h8i9j0k1"
  extractedText="Text from OCR..."
  matchedProducts={[...]}                 // Array of matched products
  confidence={87.5}                       // Overall confidence 0-100
  onConfirm={({scanId, products, totalAmount}) => {...}}
  onEdit={({scanId, editedText, products}) => {...}}
  onClose={() => {...}}
/>
```

---

## 🎯 Common Operations

### Example 1: Simple Receipt Scan
```javascript
import CameraCapture from './components/CameraCapture';
import OCRResults from './components/OCRResults';
import ocrService from './services/ocrService';
import { useState } from 'react';

function ReceiptScanner() {
  const [results, setResults] = useState(null);

  const handleCapture = async (file) => {
    const result = await ocrService.uploadReceipt(file, 'receipt');
    setResults(result);
  };

  const handleConfirm = async (data) => {
    console.log('Adding to cart:', data.products);
    // Add to cart logic
  };

  return results ? (
    <OCRResults
      scanId={results.scan_id}
      extractedText={results.extracted_text}
      matchedProducts={results.matched_products}
      confidence={results.confidence_score}
      onConfirm={handleConfirm}
    />
  ) : (
    <CameraCapture onCapture={handleCapture} />
  );
}
```

### Example 2: Batch Processing
```javascript
async function processBatch(files) {
  const result = await ocrService.batchUpload(files, 'receipt');
  
  console.log(`Success: ${result.successful}, Failed: ${result.failed}`);
  
  result.results.forEach(item => {
    if (item.success) {
      console.log(`${item.filename}: ✓ ${item.items_matched} items`);
    } else {
      console.log(`${item.filename}: ✗ ${item.error}`);
    }
  });
}
```

### Example 3: History Management
```javascript
async function showUserHistory(userId) {
  const result = await ocrService.getScanHistory(userId, 10, 0);
  
  result.scans.forEach(scan => {
    console.log(`
      ID: ${scan._id}
      Items: ${scan.matched_products.length}
      Amount: ₹${scan.total_amount}
      Confidence: ${scan.confidence_score}%
      Date: ${new Date(scan.created_at).toLocaleDateString()}
    `);
  });
  
  console.log(`Total scans: ${result.total}`);
}
```

---

## ⚙️ Configuration

### Environment Variables
```bash
# Backend
EASYOCR_LANGUAGES=en,hi          # Languages to support
UPLOAD_FOLDER=/tmp/ocr_uploads   # Temp file storage
MAX_FILE_SIZE=10485760           # 10MB max
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp,bmp

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
```

### Performance Tuning

**Image Compression:**
```javascript
// Compress to 80% quality, max 2048px
const quality = 0.8;
const maxDimension = 2048;
```

**Batch Processing:**
```python
# Process up to 10 files per batch
MAX_BATCH_SIZE = 10
```

**Database Indexes:**
```javascript
// Already created:
db.scan_history.createIndex({user_id: 1, created_at: -1})
db.scan_history.createIndex({status: 1})
db.scan_history.createIndex({confidence_score: 1})
```

---

## 🧪 Quick Tests

### Test Extraction
```bash
# Upload and verify extraction
curl -X POST http://localhost:5000/api/ocr/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_receipt.jpg" | jq '.confidence_score'

# Expected: >70%
```

### Test Batch Upload
```bash
# Batch 3 receipts
curl -X POST http://localhost:5000/api/ocr/batch \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@receipt1.jpg" \
  -F "files=@receipt2.jpg" \
  -F "files=@receipt3.jpg" | jq '.successful'

# Expected: 3
```

### Test History
```bash
# Get user's scans
curl -X GET "http://localhost:5000/api/ocr/history/user_123" \
  -H "Authorization: Bearer $TOKEN" | jq '.total'

# Expected: >0
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| **"OCR too slow"** | First run downloads models. Cache them. |
| **"Products not matching"** | Low confidence? Use manual edit mode. |
| **"Camera permission denied"** | Check browser settings, enable camera. |
| **"File upload fails"** | File >10MB? Compress or split upload. |
| **"Empty extraction"** | Image too blurry/dark. Better lighting needed. |
| **"Database connection error"** | Check MongoDB running, credentials correct. |

---

## 📈 Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Extract text | <3s | Includes OCR processing |
| Match products | <1s | Fuzzy matching algorithm |
| Save to DB | <500ms | Batch inserts |
| API response | <7s | Total end-to-end |
| Image upload | <2s | With compression |
| Batch 10 files | <50s | Parallel processing |

---

## 🔒 Security Checklist

- [x] JWT token validation on all endpoints
- [x] File type validation (jpg, png, webp, gif)
- [x] File size limits (10MB max)
- [x] User ID verification for data access
- [x] Input sanitization for search
- [x] Error messages don't leak sensitive info
- [x] CORS properly configured
- [x] Rate limiting recommended

---

## 📞 Quick Support

**Setup Issues:**
- Check Python 3.8+ installed
- Verify MongoDB running
- Ensure EasyOCR models downloaded (~200MB)

**Performance Issues:**
- Images >2048px? Auto-resize applied
- OCR slow? Use GPU acceleration (GPU support needed)
- Database slow? Check indexes created

**Integration Issues:**
- API not responding? Check server.py blueprint registration
- JWT errors? Verify token in Authorization header
- CORS errors? Update allowed origins

---

## 📚 Documentation Index

- **Complete Guide:** PHASE_4B_5_COMPLETE_GUIDE.md (Full technical details)
- **API Reference:** Complete API documentation in this guide
- **Code Examples:** Implementation patterns and usage
- **Troubleshooting:** Common issues and solutions
- **Deployment:** Production setup and monitoring

---

**Last Updated:** January 28, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
