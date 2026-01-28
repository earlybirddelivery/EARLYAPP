"""
OCR Service - Image Text Extraction & Product Matching
Phase 4B.5: Receipt Scanning & Product Recognition

Core Methods:
1. extract_text_from_image() - Extract text from receipt image
2. parse_receipt() - Parse extracted text into structured data
3. match_products() - Match extracted items to products in catalog
4. calculate_confidence() - Calculate overall confidence score
5. save_scan_history() - Save scan to database
6. get_user_scans() - Retrieve user's scan history
7. delete_scan() - Remove scan from history
8. batch_process_scans() - Process multiple scans
"""

import os
import io
import time
import logging
import requests
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import numpy as np
from PIL import Image
import easyocr
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from fuzzywuzzy import fuzz
from fuzzywuzzy import process

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# OCR SERVICE CLASS
# ============================================================================

class OCRService:
    """Service for image OCR, text extraction, and product matching"""
    
    def __init__(self, db, ocr_languages=['en', 'hi']):
        """
        Initialize OCR Service
        
        Args:
            db: MongoDB database instance
            ocr_languages: List of languages to detect (default: English, Hindi)
        """
        self.db = db
        self.ocr_languages = ocr_languages
        
        # Initialize OCR reader (EasyOCR)
        logger.info(f"Initializing EasyOCR with languages: {ocr_languages}")
        self.reader = easyocr.Reader(ocr_languages, gpu=True)
        logger.info("✅ EasyOCR initialized")
        
        # Common currency symbols and patterns
        self.currency_patterns = {
            '₹': 'INR',
            '₨': 'INR',
            '$': 'USD',
            '€': 'EUR'
        }
        
        # Product category keywords for better matching
        self.category_keywords = {
            'grains': ['rice', 'dal', 'wheat', 'flour', 'pulses', 'lentils'],
            'oils': ['oil', 'ghee', 'butter', 'vanaspati'],
            'spices': ['spice', 'masala', 'turmeric', 'chili', 'cumin'],
            'vegetables': ['onion', 'potato', 'tomato', 'carrot', 'cabbage'],
            'dairy': ['milk', 'yogurt', 'cheese', 'paneer', 'butter'],
            'beverages': ['tea', 'coffee', 'juice', 'water', 'milk'],
            'snacks': ['chips', 'biscuit', 'cookie', 'snack', 'bread']
        }
        
        self.max_retries = 3
        self.timeout = 30
    
    # ========================================================================
    # CORE METHOD 1: Extract text from image
    # ========================================================================
    
    def extract_text_from_image(self, image_path: str, user_id: str) -> Dict:
        """
        Extract text from receipt image using EasyOCR
        
        Args:
            image_path: Path or URL to image file
            user_id: User ID for logging
            
        Returns:
            Dict with extracted text, confidence, and metadata
        """
        start_time = time.time()
        scan_id = self._generate_scan_id()
        
        try:
            logger.info(f"Starting text extraction for user {user_id}, scan {scan_id}")
            
            # Load and preprocess image
            image = self._load_and_preprocess_image(image_path)
            
            if image is None:
                raise ValueError("Failed to load image")
            
            # Get image dimensions for logging
            height, width = image.shape[:2]
            image_size_kb = os.path.getsize(image_path) / 1024 if isinstance(image_path, str) else 0
            
            # Extract text using EasyOCR
            logger.info(f"Running OCR on image {width}x{height}")
            results = self.reader.readtext(image)
            
            if not results:
                logger.warning(f"No text detected in image for user {user_id}")
                return {
                    'scan_id': scan_id,
                    'success': False,
                    'error': 'No text detected in image',
                    'extracted_text': '',
                    'confidence_score': 0,
                    'text_blocks': []
                }
            
            # Process OCR results
            extracted_text = '\n'.join([text[1] for text in results])
            confidence_scores = [text[2] for text in results]
            avg_confidence = (np.mean(confidence_scores) * 100) if confidence_scores else 0
            
            # Build text blocks with bounding boxes
            text_blocks = []
            for (bbox, text, confidence) in results:
                text_blocks.append({
                    'text': text,
                    'confidence': round(confidence * 100, 2),
                    'bounding_box': {
                        'x': float(bbox[0][0]),
                        'y': float(bbox[0][1]),
                        'width': float(bbox[2][0] - bbox[0][0]),
                        'height': float(bbox[2][1] - bbox[0][1])
                    }
                })
            
            processing_time = time.time() - start_time
            
            logger.info(f"✅ Extraction complete: {len(extracted_text)} chars, {avg_confidence:.1f}% confidence in {processing_time:.2f}s")
            
            return {
                'scan_id': scan_id,
                'success': True,
                'extracted_text': extracted_text[:5000],  # Limit to 5000 chars
                'full_text': extracted_text,
                'confidence_score': round(avg_confidence, 2),
                'text_blocks': text_blocks,
                'processing_time_ms': round(processing_time * 1000),
                'image_dimensions': {
                    'width': width,
                    'height': height,
                    'size_kb': round(image_size_kb, 2)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Text extraction error: {str(e)}")
            return {
                'scan_id': scan_id,
                'success': False,
                'error': str(e),
                'extracted_text': '',
                'confidence_score': 0
            }
    
    # ========================================================================
    # CORE METHOD 2: Parse receipt data
    # ========================================================================
    
    def parse_receipt(self, extracted_text: str) -> Dict:
        """
        Parse extracted receipt text into structured data
        
        Args:
            extracted_text: Raw OCR text from receipt
            
        Returns:
            Dict with parsed receipt structure
        """
        try:
            logger.info("Parsing receipt structure from OCR text")
            
            lines = extracted_text.split('\n')
            parsed_data = {
                'merchant_name': '',
                'merchant_phone': '',
                'merchant_address': '',
                'receipt_number': '',
                'receipt_date': None,
                'line_items': [],
                'subtotal': 0,
                'tax': 0,
                'discount': 0,
                'total': 0,
                'payment_method': 'unknown'
            }
            
            # Extract merchant information (first few lines)
            for i, line in enumerate(lines[:10]):
                line_clean = line.strip()
                
                # Phone number detection
                if any(char.isdigit() for char in line_clean) and len(line_clean) > 8:
                    if '+91' in line_clean or any(c.isdigit() for c in line_clean):
                        if parsed_data['merchant_phone'] == '':
                            parsed_data['merchant_phone'] = self._extract_phone(line_clean)
                
                # Store name (usually first non-empty line)
                if i == 0 and line_clean and not parsed_data['merchant_name']:
                    parsed_data['merchant_name'] = line_clean
            
            # Extract line items and prices
            line_items = []
            for line in lines:
                line_clean = line.strip()
                
                # Skip empty lines and headers
                if not line_clean or line_clean.lower() in ['total', 'subtotal', 'tax', 'discount']:
                    continue
                
                # Try to extract item and price
                item_info = self._extract_line_item(line_clean)
                if item_info:
                    line_items.append(item_info)
            
            parsed_data['line_items'] = line_items
            
            # Extract amounts
            amounts = self._extract_amounts(extracted_text)
            if amounts:
                parsed_data['subtotal'] = amounts.get('subtotal', 0)
                parsed_data['tax'] = amounts.get('tax', 0)
                parsed_data['discount'] = amounts.get('discount', 0)
                parsed_data['total'] = amounts.get('total', 0)
            
            # Extract payment method
            parsed_data['payment_method'] = self._detect_payment_method(extracted_text)
            
            # Extract receipt number and date
            parsed_data['receipt_number'] = self._extract_receipt_number(extracted_text)
            parsed_data['receipt_date'] = self._extract_date(extracted_text)
            
            logger.info(f"✅ Parsed receipt: {len(line_items)} items, ₹{parsed_data['total']}")
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"❌ Receipt parsing error: {str(e)}")
            return {}
    
    # ========================================================================
    # CORE METHOD 3: Match products
    # ========================================================================
    
    def match_products(self, line_items: List[Dict], user_id: str, threshold=70) -> List[Dict]:
        """
        Match extracted items to products in catalog
        
        Args:
            line_items: List of line items from receipt
            user_id: User ID for preferences
            threshold: Fuzzy match threshold (0-100)
            
        Returns:
            List of matched products with confidence
        """
        try:
            logger.info(f"Starting product matching for {len(line_items)} items")
            
            # Get all products from database
            products_collection = self.db['products']
            products = list(products_collection.find({}, {
                '_id': 1,
                'name': 1,
                'category': 1,
                'brand': 1,
                'sku': 1,
                'unit': 1
            }).limit(5000))
            
            logger.info(f"Loaded {len(products)} products for matching")
            
            matched_products = []
            
            for item in line_items:
                item_name = item.get('item_name', '')
                best_match = None
                best_score = 0
                
                # Try to find best matching product
                for product in products:
                    product_name = product.get('name', '')
                    
                    # Calculate similarity score
                    score = fuzz.token_set_ratio(
                        item_name.lower(),
                        product_name.lower()
                    )
                    
                    # Category bonus if item category mentioned
                    category_bonus = 0
                    if item.get('category'):
                        product_category = product.get('category', '').lower()
                        item_category = item.get('category', '').lower()
                        if product_category == item_category:
                            category_bonus = 10
                    
                    total_score = min(100, score + category_bonus)
                    
                    if total_score > best_score and total_score >= threshold:
                        best_score = total_score
                        best_match = product
                
                if best_match:
                    matched_products.append({
                        'item_text': item.get('item_name'),
                        'product_id': str(best_match['_id']),
                        'product_name': best_match['name'],
                        'category': best_match.get('category', ''),
                        'brand': best_match.get('brand', ''),
                        'sku': best_match.get('sku', ''),
                        'quantity': item.get('quantity', 1),
                        'unit': item.get('unit', best_match.get('unit', '')),
                        'confidence': round(best_score, 2),
                        'match_method': 'fuzzy_match' if best_score < 95 else 'exact_match'
                    })
                else:
                    logger.warning(f"No match found for item: {item_name}")
            
            logger.info(f"✅ Matched {len(matched_products)} products")
            return matched_products
            
        except Exception as e:
            logger.error(f"❌ Product matching error: {str(e)}")
            return []
    
    # ========================================================================
    # CORE METHOD 4: Save scan history
    # ========================================================================
    
    def save_scan_history(self, scan_data: Dict, user_id: str, customer_id: str) -> str:
        """
        Save scan to database
        
        Args:
            scan_data: Complete scan data
            user_id: User ID
            customer_id: Customer ID
            
        Returns:
            Scan ID
        """
        try:
            logger.info(f"Saving scan history for user {user_id}")
            
            scan_record = {
                'user_id': user_id,
                'customer_id': customer_id,
                'scan_type': scan_data.get('scan_type', 'receipt'),
                'image_url': scan_data.get('image_url', ''),
                'image_size': scan_data.get('image_size', 0),
                'image_format': scan_data.get('image_format', ''),
                'confidence_score': scan_data.get('confidence_score', 0),
                'text_extracted': scan_data.get('extracted_text', '')[:5000],
                'matched_products': scan_data.get('matched_products', []),
                'total_amount': scan_data.get('total_amount', 0),
                'currency': scan_data.get('currency', 'INR'),
                'status': 'COMPLETED',
                'created_at': datetime.utcnow(),
                'processed_at': datetime.utcnow()
            }
            
            result = self.db['scan_history'].insert_one(scan_record)
            scan_id = str(result.inserted_id)
            
            logger.info(f"✅ Scan saved with ID: {scan_id}")
            
            # Also save receipt details
            if scan_data.get('receipt_data'):
                receipt_record = {
                    'scan_id': scan_id,
                    'user_id': user_id,
                    **scan_data['receipt_data'],
                    'created_at': datetime.utcnow()
                }
                self.db['receipt_data'].insert_one(receipt_record)
            
            return scan_id
            
        except PyMongoError as e:
            logger.error(f"❌ Database error: {str(e)}")
            raise
    
    # ========================================================================
    # CORE METHOD 5: Get user scans
    # ========================================================================
    
    def get_user_scans(self, user_id: str, limit: int = 50, skip: int = 0) -> List[Dict]:
        """
        Get user's scan history
        
        Args:
            user_id: User ID
            limit: Max scans to return
            skip: Number to skip (pagination)
            
        Returns:
            List of scan records
        """
        try:
            scans = list(self.db['scan_history'].find(
                {'user_id': user_id},
                sort=[('created_at', -1)],
                limit=limit,
                skip=skip
            ))
            
            # Convert ObjectId to string
            for scan in scans:
                scan['_id'] = str(scan['_id'])
            
            return scans
            
        except Exception as e:
            logger.error(f"❌ Error retrieving scans: {str(e)}")
            return []
    
    # ========================================================================
    # CORE METHOD 6: Delete scan
    # ========================================================================
    
    def delete_scan(self, scan_id: str, user_id: str) -> bool:
        """
        Delete a scan from history
        
        Args:
            scan_id: Scan ID to delete
            user_id: User ID (for authorization)
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            from bson import ObjectId
            
            result = self.db['scan_history'].delete_one({
                '_id': ObjectId(scan_id),
                'user_id': user_id
            })
            
            if result.deleted_count > 0:
                # Also delete related receipt data
                self.db['receipt_data'].delete_many({'scan_id': scan_id})
                self.db['product_matches'].delete_many({'scan_id': scan_id})
                
                logger.info(f"✅ Deleted scan {scan_id}")
                return True
            
            logger.warning(f"Scan not found: {scan_id}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Error deleting scan: {str(e)}")
            return False
    
    # ========================================================================
    # CORE METHOD 7: Calculate confidence
    # ========================================================================
    
    def calculate_confidence_score(self, ocr_confidence: float, match_confidence: float, text_length: int) -> float:
        """
        Calculate overall confidence score
        
        Args:
            ocr_confidence: OCR text extraction confidence (0-100)
            match_confidence: Product matching confidence (0-100)
            text_length: Length of extracted text
            
        Returns:
            Overall confidence score (0-100)
        """
        # Weight components
        weights = {
            'ocr': 0.4,           # 40% OCR quality
            'matching': 0.4,      # 40% Product matching
            'text_quality': 0.2   # 20% Text quality indicators
        }
        
        # Text quality score based on length
        text_quality_score = min(100, (text_length / 300) * 100)
        
        # Calculate weighted score
        overall_score = (
            (ocr_confidence * weights['ocr']) +
            (match_confidence * weights['matching']) +
            (text_quality_score * weights['text_quality'])
        )
        
        return round(overall_score, 2)
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _load_and_preprocess_image(self, image_path: str) -> Optional[np.ndarray]:
        """Load and preprocess image for OCR"""
        try:
            if isinstance(image_path, str) and image_path.startswith('http'):
                # Download from URL
                response = requests.get(image_path, timeout=self.timeout)
                image = Image.open(io.BytesIO(response.content))
            else:
                # Load from file
                image = Image.open(image_path)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            image_array = np.array(image)
            
            # Resize if too large (max 2048px on longest side)
            height, width = image_array.shape[:2]
            if max(height, width) > 2048:
                scale = 2048 / max(height, width)
                new_height = int(height * scale)
                new_width = int(width * scale)
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                image_array = np.array(image)
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error loading image: {str(e)}")
            return None
    
    def _extract_line_item(self, line: str) -> Optional[Dict]:
        """Extract item name, quantity, and price from text line"""
        import re
        
        # Pattern: Item Name - Qty Unit - Price
        pattern = r'(.+?)\s*-\s*(\d+\.?\d*)\s*(\w+)?\s*-?\s*(₹|Rs\.?)?(\d+\.?\d*)'
        match = re.search(pattern, line)
        
        if match:
            return {
                'item_name': match.group(1).strip(),
                'quantity': float(match.group(2)),
                'unit': match.group(3) or 'unit',
                'unit_price': float(match.group(5))
            }
        
        return None
    
    def _extract_amounts(self, text: str) -> Dict:
        """Extract financial amounts from text"""
        import re
        
        amounts = {
            'subtotal': 0,
            'tax': 0,
            'discount': 0,
            'total': 0
        }
        
        patterns = {
            'total': r'(?:total|TOTAL|Total)\s*:?\s*(₹|Rs\.?)?(\d+\.?\d*)',
            'tax': r'(?:tax|TAX|Tax|GST)\s*:?\s*(₹|Rs\.?)?(\d+\.?\d*)',
            'discount': r'(?:discount|DISCOUNT|Discount)\s*:?\s*(₹|Rs\.?)?(\d+\.?\d*)',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text)
            if match:
                amounts[key] = float(match.group(2))
        
        return amounts
    
    def _extract_phone(self, text: str) -> str:
        """Extract phone number from text"""
        import re
        
        pattern = r'\+?91[-.\s]?[0-9]{10}|[0-9]{10}'
        match = re.search(pattern, text)
        return match.group(0) if match else ''
    
    def _extract_receipt_number(self, text: str) -> str:
        """Extract receipt/bill number"""
        import re
        
        pattern = r'(?:Receipt|Bill|Invoice|Check)[\s#:]*([A-Z0-9-]+)'
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1) if match else ''
    
    def _extract_date(self, text: str) -> Optional[datetime]:
        """Extract date from receipt"""
        import re
        
        date_patterns = [
            r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})',  # DD/MM/YYYY
            r'(\d{2,4})-(\d{1,2})-(\d{1,2})',         # YYYY-MM-DD
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    parts = match.groups()
                    if len(parts[2]) == 2:
                        year = 2000 + int(parts[2])
                    else:
                        year = int(parts[2])
                    
                    return datetime(year, int(parts[1]), int(parts[0]))
                except:
                    pass
        
        return None
    
    def _detect_payment_method(self, text: str) -> str:
        """Detect payment method from text"""
        text_lower = text.lower()
        
        if 'cash' in text_lower:
            return 'cash'
        elif 'card' in text_lower:
            return 'card'
        elif 'upi' in text_lower:
            return 'upi'
        elif 'net' in text_lower and 'bank' in text_lower:
            return 'netbanking'
        
        return 'unknown'
    
    def _generate_scan_id(self) -> str:
        """Generate unique scan ID"""
        from bson import ObjectId
        return str(ObjectId())

# ============================================================================
# USAGE EXAMPLE
# ============================================================================

"""
from pymongo import MongoClient
from ocr_service import OCRService

# Initialize
db = MongoClient("mongodb://localhost:27017/")["earlybird_kirana"]
ocr_service = OCRService(db)

# Extract text from image
extraction = ocr_service.extract_text_from_image(
    image_path="/path/to/receipt.jpg",
    user_id="user_123"
)

# Parse receipt
parsed = ocr_service.parse_receipt(extraction['extracted_text'])

# Match products
products = ocr_service.match_products(
    line_items=parsed['line_items'],
    user_id="user_123"
)

# Save scan
scan_id = ocr_service.save_scan_history(
    scan_data={
        'extracted_text': extraction['extracted_text'],
        'matched_products': products,
        'total_amount': parsed['total']
    },
    user_id="user_123",
    customer_id="cust_456"
)
"""
