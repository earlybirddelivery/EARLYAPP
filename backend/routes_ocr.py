"""
REST API Routes for Image OCR Service
Phase 4B.5: Receipt Scanning & Product Recognition

Endpoints:
1. POST /api/ocr/upload - Upload and process receipt image
2. GET /api/ocr/{scan_id} - Get extraction results
3. PUT /api/ocr/{scan_id}/match - Match products
4. GET /api/ocr/history/{user_id} - Get scan history
5. DELETE /api/ocr/{scan_id} - Delete scan
6. POST /api/ocr/batch - Batch upload multiple receipts
"""

import os
import io
import logging
from datetime import datetime
from functools import wraps
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from werkzeug.exceptions import BadRequest
import jwt
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Blueprint setup
ocr_bp = Blueprint('ocr', __name__, url_prefix='/api/ocr')

# Database connection (initialized in server.py)
db = None

# Configuration
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_FOLDER = '/tmp/ocr_uploads'

# ============================================================================
# DECORATORS
# ============================================================================

def require_auth(f):
    """Verify JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'Missing authorization token'}), 401
        
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET', 'secret-key'), algorithms=['HS256'])
            request.user_id = payload.get('user_id')
            request.customer_id = payload.get('customer_id')
            request.role = payload.get('role', 'customer')
            return f(*args, **kwargs)
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
    
    return decorated_function

def validate_file(f):
    """Validate uploaded file"""
    if not f:
        raise BadRequest('No file provided')
    
    filename = secure_filename(f.filename)
    
    # Check extension
    if not ('.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS):
        raise BadRequest(f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}')
    
    # Check file size
    f.seek(0, os.SEEK_END)
    file_size = f.tell()
    f.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise BadRequest(f'File too large. Max: {MAX_FILE_SIZE / 1024 / 1024}MB')
    
    return f

# ============================================================================
# ROUTES
# ============================================================================

@ocr_bp.route('/upload', methods=['POST'])
@require_auth
def upload_receipt():
    """
    Upload and process receipt image
    
    Form Data:
        file: Image file (jpg, png, etc.)
        scan_type: Type of scan (receipt, bill, invoice, menu) - optional
    
    Returns:
        Dict with extraction results and matched products
    """
    try:
        logger.info(f"Receipt upload request from user {request.user_id}")
        
        # Validate file
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        validate_file(file)
        
        scan_type = request.form.get('scan_type', 'receipt')
        
        # Import OCR service
        from ocr_service import OCRService
        
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        ocr_service = OCRService(db)
        
        # Save file temporarily
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        temp_path = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
        file.save(temp_path)
        
        # Extract text from image
        extraction_result = ocr_service.extract_text_from_image(
            image_path=temp_path,
            user_id=request.user_id
        )
        
        if not extraction_result['success']:
            return jsonify({
                'success': False,
                'error': extraction_result.get('error', 'Extraction failed')
            }), 400
        
        # Parse receipt structure
        parsed_data = ocr_service.parse_receipt(extraction_result['full_text'])
        
        # Match products
        matched_products = ocr_service.match_products(
            line_items=parsed_data.get('line_items', []),
            user_id=request.user_id
        )
        
        # Calculate overall confidence
        overall_confidence = ocr_service.calculate_confidence_score(
            ocr_confidence=extraction_result['confidence_score'],
            match_confidence=sum([m.get('confidence', 0) for m in matched_products]) / len(matched_products) if matched_products else 50,
            text_length=len(extraction_result['extracted_text'])
        )
        
        # Prepare scan data
        scan_data = {
            'scan_type': scan_type,
            'image_url': f"file://{temp_path}",
            'image_size': len(file.read()) if hasattr(file, 'read') else 0,
            'image_format': file.filename.rsplit('.', 1)[1].lower(),
            'confidence_score': overall_confidence,
            'extracted_text': extraction_result['extracted_text'],
            'receipt_data': parsed_data,
            'matched_products': matched_products,
            'total_amount': parsed_data.get('total', 0)
        }
        
        # Save to database
        scan_id = ocr_service.save_scan_history(
            scan_data=scan_data,
            user_id=request.user_id,
            customer_id=request.customer_id
        )
        
        # Log operation
        logger.info(f"✅ Scan uploaded and processed: {scan_id}, confidence: {overall_confidence}%")
        
        return jsonify({
            'success': True,
            'scan_id': scan_id,
            'extracted_text': extraction_result['extracted_text'],
            'confidence_score': overall_confidence,
            'matched_products': matched_products,
            'total_amount': parsed_data.get('total', 0),
            'items_count': len(matched_products),
            'processing_time_ms': extraction_result.get('processing_time_ms', 0)
        }), 200
        
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"❌ Upload error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ocr_bp.route('/<scan_id>', methods=['GET'])
@require_auth
def get_extraction(scan_id):
    """
    Get extraction results for a scan
    
    Returns:
        Dict with extraction details and matched products
    """
    try:
        logger.info(f"Fetching scan {scan_id} for user {request.user_id}")
        
        from ocr_service import OCRService
        
        ocr_service = OCRService(db)
        
        # Fetch scan from database
        scan = db['scan_history'].find_one({
            '_id': ObjectId(scan_id),
            'user_id': request.user_id
        })
        
        if not scan:
            return jsonify({'error': 'Scan not found'}), 404
        
        # Convert ObjectId to string
        scan['_id'] = str(scan['_id'])
        
        return jsonify({
            'success': True,
            'scan': scan
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Fetch error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ocr_bp.route('/<scan_id>/match', methods=['PUT'])
@require_auth
def update_product_match(scan_id):
    """
    Update product match for an extraction
    
    JSON Body:
        matches: List of product matches to update
    
    Returns:
        Updated matches
    """
    try:
        logger.info(f"Updating product matches for scan {scan_id}")
        
        data = request.get_json()
        matches = data.get('matches', [])
        
        # Update in database
        db['scan_history'].update_one(
            {'_id': ObjectId(scan_id), 'user_id': request.user_id},
            {'$set': {
                'matched_products': matches,
                'status': 'COMPLETED',
                'completed_at': datetime.utcnow()
            }}
        )
        
        # Save individual matches for analytics
        for match in matches:
            db['product_matches'].insert_one({
                'scan_id': scan_id,
                'user_id': request.user_id,
                'extracted_text': match.get('item_text'),
                'product_id': match.get('product_id'),
                'product_name': match.get('product_name'),
                'confidence': match.get('confidence'),
                'user_confirmed': True,
                'confirmed_at': datetime.utcnow(),
                'created_at': datetime.utcnow()
            })
        
        logger.info(f"✅ Updated {len(matches)} product matches")
        
        return jsonify({
            'success': True,
            'matches_updated': len(matches)
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Match update error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ocr_bp.route('/history/<user_id>', methods=['GET'])
@require_auth
def get_scan_history(user_id):
    """
    Get user's scan history
    
    Query Parameters:
        limit: Max scans to return (default: 50)
        skip: Number to skip for pagination (default: 0)
    
    Returns:
        List of scans
    """
    try:
        # Verify user is requesting their own history
        if user_id != request.user_id and request.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        limit = int(request.args.get('limit', 50))
        skip = int(request.args.get('skip', 0))
        
        logger.info(f"Fetching scan history for user {user_id}")
        
        from ocr_service import OCRService
        
        ocr_service = OCRService(db)
        scans = ocr_service.get_user_scans(
            user_id=user_id,
            limit=limit,
            skip=skip
        )
        
        # Get total count
        total = db['scan_history'].count_documents({'user_id': user_id})
        
        return jsonify({
            'success': True,
            'scans': scans,
            'total': total,
            'limit': limit,
            'skip': skip
        }), 200
        
    except Exception as e:
        logger.error(f"❌ History fetch error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ocr_bp.route('/<scan_id>', methods=['DELETE'])
@require_auth
def delete_scan(scan_id):
    """
    Delete a scan from history
    
    Returns:
        Success status
    """
    try:
        logger.info(f"Deleting scan {scan_id} for user {request.user_id}")
        
        from ocr_service import OCRService
        
        ocr_service = OCRService(db)
        
        success = ocr_service.delete_scan(
            scan_id=scan_id,
            user_id=request.user_id
        )
        
        if not success:
            return jsonify({'error': 'Scan not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Scan deleted'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Delete error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ocr_bp.route('/batch', methods=['POST'])
@require_auth
def batch_upload():
    """
    Batch upload multiple receipt images
    
    Form Data:
        files: Multiple image files
        scan_type: Type of scan (receipt, bill, invoice, menu) - optional
    
    Returns:
        List of processed scans
    """
    try:
        logger.info(f"Batch upload request from user {request.user_id}")
        
        files = request.files.getlist('files')
        
        if not files or len(files) == 0:
            return jsonify({'error': 'No files provided'}), 400
        
        if len(files) > 10:
            return jsonify({'error': 'Maximum 10 files allowed'}), 400
        
        scan_type = request.form.get('scan_type', 'receipt')
        
        from ocr_service import OCRService
        
        ocr_service = OCRService(db)
        
        results = []
        
        for file in files:
            try:
                validate_file(file)
                
                # Save file temporarily
                os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                temp_path = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
                file.save(temp_path)
                
                # Process file
                extraction_result = ocr_service.extract_text_from_image(
                    image_path=temp_path,
                    user_id=request.user_id
                )
                
                if extraction_result['success']:
                    parsed_data = ocr_service.parse_receipt(extraction_result['full_text'])
                    matched_products = ocr_service.match_products(
                        line_items=parsed_data.get('line_items', []),
                        user_id=request.user_id
                    )
                    
                    scan_id = ocr_service.save_scan_history(
                        scan_data={
                            'scan_type': scan_type,
                            'image_url': f"file://{temp_path}",
                            'confidence_score': extraction_result['confidence_score'],
                            'extracted_text': extraction_result['extracted_text'],
                            'receipt_data': parsed_data,
                            'matched_products': matched_products,
                            'total_amount': parsed_data.get('total', 0)
                        },
                        user_id=request.user_id,
                        customer_id=request.customer_id
                    )
                    
                    results.append({
                        'filename': file.filename,
                        'scan_id': scan_id,
                        'success': True,
                        'items_matched': len(matched_products)
                    })
                else:
                    results.append({
                        'filename': file.filename,
                        'success': False,
                        'error': extraction_result.get('error')
                    })
                    
            except BadRequest as e:
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': str(e)
                })
        
        logger.info(f"✅ Batch processed: {len(results)} files")
        
        return jsonify({
            'success': True,
            'results': results,
            'successful': len([r for r in results if r['success']]),
            'failed': len([r for r in results if not r['success']])
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Batch upload error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ocr_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ocr',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@ocr_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@ocr_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@ocr_bp.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# INITIALIZATION
# ============================================================================

def init_ocr_bp(database):
    """Initialize blueprint with database connection"""
    global db
    db = database
    logger.info("✅ OCR Blueprint initialized")
    return ocr_bp

# ============================================================================
# USAGE IN server.py
# ============================================================================

"""
from routes_ocr import init_ocr_bp

# Register blueprint
ocr_bp = init_ocr_bp(db)
app.register_blueprint(ocr_bp)
"""
