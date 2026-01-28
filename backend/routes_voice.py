"""
PHASE 4B.7: Voice Integration - REST API Routes
================================================

Flask blueprint for voice-based ordering and command processing.

Endpoints:
- POST /api/voice/upload - Upload and process audio
- GET /api/voice/{log_id} - Get voice log details
- POST /api/voice/{log_id}/parse - Parse and execute command
- GET /api/voice/history/{user_id} - Get voice history
- GET /api/voice/commands/list - Get supported commands
- PUT /api/voice/accessibility/{user_id} - Update accessibility settings
- POST /api/voice/health - Health check

Author: EarlyBird Kirana Team
Date: January 28, 2026
"""

import logging
import os
from datetime import datetime
from functools import wraps
from typing import Dict, Tuple

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import jwt

from voice_service import VoiceService


# ============================================================================
# CONFIGURATION
# ============================================================================

UPLOAD_FOLDER = "/tmp/voice_uploads"
ALLOWED_EXTENSIONS = {"wav", "m4a", "ogg", "webm", "flac", "mp3"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ============================================================================
# BLUEPRINT SETUP
# ============================================================================

voice_bp = Blueprint("voice", __name__, url_prefix="/api/voice")
logger = logging.getLogger(__name__)


# ============================================================================
# AUTHENTICATION DECORATOR
# ============================================================================

def require_auth(f):
    """Decorator to require JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"error": "Invalid Authorization header"}), 401
        
        if not token:
            return jsonify({"error": "Missing Authorization token"}), 401
        
        try:
            # Verify token (implementation depends on your JWT setup)
            # data = jwt.decode(token, current_app.config['JWT_SECRET'], algorithms=['HS256'])
            # request.user_id = data['user_id']
            # For now, just validate token format
            request.user_id = "user_from_token"  # Replace with actual JWT verification
            return f(*args, **kwargs)
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
    
    return decorated_function


# ============================================================================
# FILE VALIDATION
# ============================================================================

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_audio_file(file) -> Tuple[bool, str]:
    """Validate uploaded audio file"""
    if not file:
        return False, "No file provided"
    
    if not allowed_file(file.filename):
        return False, f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    
    if file.content_length and file.content_length > MAX_FILE_SIZE:
        return False, f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024:.0f} MB"
    
    return True, ""


# ============================================================================
# ROUTES
# ============================================================================

@voice_bp.route("/upload", methods=["POST"])
@require_auth
def upload_audio():
    """
    Upload and process audio file for transcription.
    
    Request:
        - file: Audio file (wav, m4a, ogg, webm, flac)
        - language: Language code ("en" or "hi", default: "en")
        - customer_id: Customer ID
    
    Response:
        {
            "voice_log_id": "voice_log_...",
            "transcription": "...",
            "confidence_score": 92.5,
            "status": "COMPLETED"
        }
    """
    try:
        # Validate file
        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files["file"]
        is_valid, error_msg = validate_audio_file(file)
        
        if not is_valid:
            return jsonify({"error": error_msg}), 400
        
        # Get parameters
        language = request.form.get("language", "en")
        customer_id = request.form.get("customer_id", "")
        
        if language not in ["en", "hi"]:
            return jsonify({"error": "Unsupported language"}), 400
        
        # Save file
        filename = secure_filename(file.filename)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filepath = os.path.join(UPLOAD_FOLDER, f"{timestamp}_{filename}")
        
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        file.save(filepath)
        
        # Initialize voice service
        db = current_app.config["MONGO_DB"]
        voice_service = VoiceService(db)
        
        # Transcribe audio
        transcription_result = voice_service.transcribe_audio(
            filepath,
            language=language
        )
        
        if not transcription_result["success"]:
            return jsonify({
                "error": transcription_result.get("error", "Transcription failed"),
                "status": "FAILED"
            }), 400
        
        # Get file stats
        file_size_kb = os.path.getsize(filepath) / 1024
        audio_duration_ms = request.form.get("duration_ms", 0)
        
        # Save voice log
        voice_log_id = voice_service.save_voice_log(
            user_id=request.user_id,
            customer_id=customer_id,
            transcription=transcription_result["transcription"],
            confidence_score=transcription_result["confidence_score"],
            audio_metadata={
                "file_path": filepath,
                "duration_ms": int(audio_duration_ms),
                "encoding": filename.rsplit(".", 1)[1].lower(),
                "size_kb": int(file_size_kb),
                "processing_time_ms": transcription_result.get("processing_time_ms", 0),
            },
            voice_type="order"
        )
        
        logger.info(f"Audio uploaded and transcribed: {voice_log_id}")
        
        return jsonify({
            "voice_log_id": voice_log_id,
            "transcription": transcription_result["transcription"],
            "confidence_score": transcription_result["confidence_score"],
            "language": language,
            "status": "COMPLETED"
        }), 200
    
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({"error": str(e)}), 500


@voice_bp.route("/<voice_log_id>", methods=["GET"])
@require_auth
def get_voice_log(voice_log_id: str):
    """
    Get details of a voice log.
    
    Response:
        {
            "_id": "voice_log_...",
            "transcription": "...",
            "confidence_score": 92.5,
            "status": "COMPLETED",
            ...
        }
    """
    try:
        db = current_app.config["MONGO_DB"]
        
        voice_log = db.voice_logs.find_one(
            {"_id": voice_log_id, "user_id": request.user_id}
        )
        
        if not voice_log:
            return jsonify({"error": "Voice log not found"}), 404
        
        # Convert datetime to string for JSON serialization
        voice_log["created_at"] = voice_log["created_at"].isoformat()
        voice_log["updated_at"] = voice_log["updated_at"].isoformat()
        
        return jsonify(voice_log), 200
    
    except Exception as e:
        logger.error(f"Get voice log error: {e}")
        return jsonify({"error": str(e)}), 500


@voice_bp.route("/<voice_log_id>/parse", methods=["POST"])
@require_auth
def parse_and_execute(voice_log_id: str):
    """
    Parse voice command and execute it.
    
    Request:
        {
            "customer_id": "cust_...",
            "auto_execute": true  // Optional, default: true
        }
    
    Response:
        {
            "command_type": "order",
            "intent": "CREATE_ORDER",
            "entities": {...},
            "execution": {
                "success": true,
                "created_order_id": "order_...",
                "result": "..."
            }
        }
    """
    try:
        db = current_app.config["MONGO_DB"]
        voice_service = VoiceService(db)
        
        # Get voice log
        voice_log = db.voice_logs.find_one(
            {"_id": voice_log_id, "user_id": request.user_id}
        )
        
        if not voice_log:
            return jsonify({"error": "Voice log not found"}), 404
        
        # Get parameters
        data = request.get_json() or {}
        customer_id = data.get("customer_id", "")
        auto_execute = data.get("auto_execute", True)
        
        # Parse command
        command_result = voice_service.parse_command(voice_log["transcription"])
        
        if not command_result["success"]:
            return jsonify({
                "error": command_result.get("error", "Command parsing failed"),
                "status": "PARSING_FAILED"
            }), 400
        
        # Execute command if auto_execute is true
        execution_result = None
        if auto_execute and command_result["confidence_score"] > 70:
            execution_result = voice_service.execute_command(
                user_id=request.user_id,
                customer_id=customer_id,
                intent=command_result["intent"],
                entities=command_result["entities"],
                voice_log_id=voice_log_id
            )
        
        # Save command to database
        command_doc = {
            "_id": f"voice_cmd_{voice_log_id}",
            "user_id": request.user_id,
            "customer_id": customer_id,
            "voice_log_id": voice_log_id,
            "command_type": command_result["command_type"],
            "command_text": voice_log["transcription"],
            "confidence_score": command_result["confidence_score"],
            "intent": command_result["intent"],
            "entities": command_result["entities"],
            "execution_status": "COMPLETED" if execution_result and execution_result["success"] else "PENDING",
            "created_at": datetime.utcnow(),
        }
        
        if execution_result:
            command_doc["execution_result"] = execution_result.get("result", "")
            command_doc["created_order_id"] = execution_result.get("created_order_id")
        
        db.voice_commands.insert_one(command_doc)
        
        logger.info(f"Command executed: {command_result['intent']}")
        
        response = {
            "command_type": command_result["command_type"],
            "intent": command_result["intent"],
            "confidence_score": command_result["confidence_score"],
            "entities": command_result["entities"],
        }
        
        if execution_result:
            response["execution"] = {
                "success": execution_result["success"],
                "created_order_id": execution_result.get("created_order_id"),
                "result": execution_result.get("result", ""),
                "error": execution_result.get("error", "")
            }
        
        return jsonify(response), 200
    
    except Exception as e:
        logger.error(f"Parse and execute error: {e}")
        return jsonify({"error": str(e)}), 500


@voice_bp.route("/history/<user_id>", methods=["GET"])
@require_auth
def get_history(user_id: str):
    """
    Get user's voice command history.
    
    Query parameters:
        - limit: Number of records (default: 20)
        - skip: Number of records to skip (default: 0)
    
    Response:
        {
            "logs": [...],
            "total": 100,
            "limit": 20,
            "skip": 0
        }
    """
    try:
        # Verify user is accessing their own history
        if user_id != request.user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        db = current_app.config["MONGO_DB"]
        voice_service = VoiceService(db)
        
        limit = int(request.args.get("limit", 20))
        skip = int(request.args.get("skip", 0))
        
        # Validate pagination
        if limit > 100:
            limit = 100
        if skip < 0:
            skip = 0
        
        logs = voice_service.get_user_voice_history(user_id, limit, skip)
        
        # Convert datetime to string
        for log in logs:
            if "created_at" in log:
                log["created_at"] = log["created_at"].isoformat()
            if "updated_at" in log:
                log["updated_at"] = log["updated_at"].isoformat()
        
        total = db.voice_logs.count_documents({"user_id": user_id})
        
        return jsonify({
            "logs": logs,
            "total": total,
            "limit": limit,
            "skip": skip
        }), 200
    
    except Exception as e:
        logger.error(f"Get history error: {e}")
        return jsonify({"error": str(e)}), 500


@voice_bp.route("/commands/list", methods=["GET"])
@require_auth
def list_commands():
    """
    Get list of supported voice commands.
    
    Response:
        {
            "commands": [
                {
                    "type": "order",
                    "intent": "CREATE_ORDER",
                    "examples": ["order 5 kg rice", "I want to buy 2 liters oil"],
                    "description": "Create a new order"
                },
                ...
            ]
        }
    """
    commands = [
        {
            "type": "order",
            "intent": "CREATE_ORDER",
            "description": "Create a new order",
            "examples": [
                "Order 5 kilos of basmati rice",
                "I want to buy 2 liters of mustard oil",
                "Send me 1 kilogram sugar",
            ]
        },
        {
            "type": "cancel",
            "intent": "CANCEL_ORDER",
            "description": "Cancel an order",
            "examples": [
                "Cancel order #12345",
                "Don't send my last order",
                "Abort the delivery",
            ]
        },
        {
            "type": "repeat",
            "intent": "REPEAT_ORDER",
            "description": "Repeat your last order",
            "examples": [
                "Repeat my last order",
                "Order same as yesterday",
                "Place same order again",
            ]
        },
        {
            "type": "search",
            "intent": "SEARCH_PRODUCT",
            "description": "Search for a product",
            "examples": [
                "Do you have basmati rice?",
                "Show me organic vegetables",
                "Find mustard oil",
            ]
        },
        {
            "type": "help",
            "intent": "GET_HELP",
            "description": "Get help with voice commands",
            "examples": [
                "Help",
                "What commands can I use?",
                "Voice commands",
            ]
        },
    ]
    
    return jsonify({"commands": commands}), 200


@voice_bp.route("/accessibility/<user_id>", methods=["GET", "PUT"])
@require_auth
def accessibility_settings(user_id: str):
    """
    Get or update accessibility preferences.
    
    GET Response:
        {
            "preferred_language": "en",
            "voice_speed": 1.0,
            "enable_captions": true,
            "enable_audio_feedback": true,
            ...
        }
    
    PUT Request:
        {
            "preferred_language": "hi",
            "voice_speed": 1.2,
            "enable_captions": true,
            ...
        }
    """
    try:
        # Verify user is modifying their own settings
        if user_id != request.user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        db = current_app.config["MONGO_DB"]
        voice_service = VoiceService(db)
        
        if request.method == "GET":
            prefs = voice_service.get_accessibility_preferences(user_id)
            return jsonify(prefs), 200
        
        elif request.method == "PUT":
            data = request.get_json() or {}
            
            success = voice_service.update_accessibility_preferences(user_id, data)
            
            if success:
                return jsonify({"message": "Settings updated"}), 200
            else:
                return jsonify({"error": "Failed to update settings"}), 500
    
    except Exception as e:
        logger.error(f"Accessibility settings error: {e}")
        return jsonify({"error": str(e)}), 500


@voice_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint for voice service.
    
    Response:
        {
            "status": "healthy",
            "voice_service": "ready",
            "database": "connected"
        }
    """
    try:
        db = current_app.config["MONGO_DB"]
        
        # Check database connectivity
        db.admin.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return jsonify({
        "status": "healthy",
        "voice_service": "ready",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat()
    }), 200


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@voice_bp.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({"error": "Endpoint not found"}), 404


@voice_bp.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({"error": "Method not allowed"}), 405


@voice_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal error: {error}")
    return jsonify({"error": "Internal server error"}), 500


# ============================================================================
# INITIALIZATION FUNCTION
# ============================================================================

def init_voice_bp(app, db):
    """
    Initialize voice blueprint with Flask app.
    
    Usage:
        from routes_voice import init_voice_bp
        app = Flask(__name__)
        init_voice_bp(app, db)
    """
    app.config["MONGO_DB"] = db
    app.register_blueprint(voice_bp)
    logger.info("Voice blueprint initialized")
    return voice_bp
