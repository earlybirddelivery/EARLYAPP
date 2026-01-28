"""
PHASE 4B.7: Voice Integration - Database Models
================================================

This module defines MongoDB schemas for voice transcription, commands, and logs.
Supports speech-to-text ordering, voice commands, and accessibility features.

Collections:
1. voice_logs - Raw voice recording metadata and transcription results
2. voice_commands - Parsed voice commands and execution results
3. voice_transcripts - Full transcript history with corrections
4. voice_accessibility - User accessibility preferences

Author: EarlyBird Kirana Team
Date: January 28, 2026
"""

from datetime import datetime, timedelta
from pymongo import ASCENDING, DESCENDING, TEXT


# ============================================================================
# COLLECTION 1: voice_logs (Raw voice recordings and transcriptions)
# ============================================================================

VOICE_LOGS_SCHEMA = {
    "_id": str,  # UUID
    "user_id": str,  # Links to users collection
    "customer_id": str,  # Links to customers_v2
    "audio_file": str,  # S3 path to audio file
    "audio_duration_ms": int,  # Length of recording in milliseconds
    "audio_encoding": str,  # Format: "wav", "m4a", "ogg", "webm"
    "audio_size_kb": int,  # File size in KB
    
    # Transcription Results
    "transcription": str,  # Full transcribed text
    "confidence_score": float,  # 0-100, speech recognition confidence
    "language": str,  # "en", "hi", "en-IN"
    "detected_language": str,  # Auto-detected language if different
    
    # Audio Quality Metrics
    "noise_level": float,  # 0-100, ambient noise percentage
    "speech_rate": float,  # Words per second (typical 2.5-3.5)
    "clarity_score": float,  # 0-100, audio clarity/quality
    
    # Processing Details
    "processing_time_ms": int,  # Time to transcribe
    "status": str,  # "PROCESSING", "COMPLETED", "FAILED", "SKIPPED"
    "error_message": str,  # If status is FAILED
    "retry_count": int,  # Number of retry attempts
    
    # Type Detection
    "voice_type": str,  # "order", "command", "question", "feedback"
    
    # Metadata
    "created_at": datetime,
    "updated_at": datetime,
    "expires_at": datetime,  # TTL for automatic cleanup (30 days)
}

VOICE_LOGS_SAMPLE = {
    "_id": "voice_log_65a1b2c3d4e5f6g7h8i9j0k1",
    "user_id": "user_123",
    "customer_id": "cust_123",
    "audio_file": "s3://earlybird-voice/2026-01-28/user_123_voice_log_123.wav",
    "audio_duration_ms": 8500,
    "audio_encoding": "wav",
    "audio_size_kb": 136,
    
    "transcription": "I want to order 5 kilos of basmati rice and 2 bottles of mustard oil",
    "confidence_score": 92.5,
    "language": "en",
    "detected_language": "en",
    
    "noise_level": 15.5,
    "speech_rate": 2.8,
    "clarity_score": 88.0,
    
    "processing_time_ms": 2340,
    "status": "COMPLETED",
    "error_message": None,
    "retry_count": 0,
    
    "voice_type": "order",
    
    "created_at": datetime(2026, 1, 28, 10, 30, 45),
    "updated_at": datetime(2026, 1, 28, 10, 30, 47),
    "expires_at": datetime(2026, 2, 27, 10, 30, 45),
}


# ============================================================================
# COLLECTION 2: voice_commands (Parsed commands and execution)
# ============================================================================

VOICE_COMMANDS_SCHEMA = {
    "_id": str,  # UUID
    "user_id": str,
    "customer_id": str,
    "voice_log_id": str,  # Links to voice_logs
    
    # Command Details
    "command_type": str,  # "order", "cancel", "repeat", "help", "settings", "search"
    "command_text": str,  # Parsed command from transcription
    "confidence_score": float,  # 0-100, command parsing confidence
    
    # Intent Detection
    "intent": str,  # "CREATE_ORDER", "CANCEL_ORDER", "REPEAT_ORDER", "SEARCH_PRODUCT", "GET_HELP"
    "entities": {
        "products": [  # Detected products/items
            {
                "product_name": str,
                "quantity": float,
                "unit": str,  # "kg", "l", "g", "ml", "pack", "piece"
                "confidence": float,
                "product_id": str,  # Matched product ID if found
            }
        ],
        "amount": float,  # Detected amount/price if mentioned
        "order_id": str,  # For cancel/repeat commands
        "delivery_address": str,  # If mentioned in voice
    },
    
    # Execution
    "execution_status": str,  # "PENDING", "EXECUTING", "COMPLETED", "FAILED", "REQUIRES_CONFIRMATION"
    "execution_result": str,  # Result details
    "created_order_id": str,  # If order was created
    "confirmation_required": bool,  # If user needs to confirm
    "human_review_needed": bool,  # If automation uncertain
    
    # Metadata
    "created_at": datetime,
    "executed_at": datetime,
}

VOICE_COMMANDS_SAMPLE = {
    "_id": "voice_cmd_65a1b2c3d4e5f6g7h8i9j0k2",
    "user_id": "user_123",
    "customer_id": "cust_123",
    "voice_log_id": "voice_log_65a1b2c3d4e5f6g7h8i9j0k1",
    
    "command_type": "order",
    "command_text": "order 5 kilos basmati rice and 2 liters mustard oil",
    "confidence_score": 91.2,
    
    "intent": "CREATE_ORDER",
    "entities": {
        "products": [
            {
                "product_name": "basmati rice",
                "quantity": 5,
                "unit": "kg",
                "confidence": 94.5,
                "product_id": "prod_rice_basmati_001",
            },
            {
                "product_name": "mustard oil",
                "quantity": 2,
                "unit": "l",
                "confidence": 89.3,
                "product_id": "prod_oil_mustard_001",
            }
        ],
        "amount": 750.0,
        "order_id": None,
        "delivery_address": None,
    },
    
    "execution_status": "COMPLETED",
    "execution_result": "Order created successfully",
    "created_order_id": "order_65a1b2c3d4e5f6g7h8i9j0k3",
    "confirmation_required": False,
    "human_review_needed": False,
    
    "created_at": datetime(2026, 1, 28, 10, 30, 47),
    "executed_at": datetime(2026, 1, 28, 10, 30, 50),
}


# ============================================================================
# COLLECTION 3: voice_transcripts (Full transcript history with corrections)
# ============================================================================

VOICE_TRANSCRIPTS_SCHEMA = {
    "_id": str,  # UUID
    "user_id": str,
    "customer_id": str,
    "voice_log_id": str,  # Links to voice_logs
    
    # Transcript Versions
    "original_transcript": str,  # From speech-to-text
    "corrected_transcript": str,  # After user correction
    "final_transcript": str,  # Version used for processing
    
    # Corrections
    "corrections": [
        {
            "position": int,  # Character position
            "original_text": str,
            "corrected_text": str,
            "corrected_by": str,  # "user", "ai", "admin"
            "corrected_at": datetime,
        }
    ],
    
    # Confidence & Quality
    "average_confidence": float,  # Average word confidence
    "word_count": int,
    "accuracy_score": float,  # 0-100, estimated accuracy
    
    # Usage
    "used_for_order": bool,
    "used_for_command": bool,
    "order_id": str,  # If used for order creation
    
    # Metadata
    "created_at": datetime,
    "last_corrected_at": datetime,
}

VOICE_TRANSCRIPTS_SAMPLE = {
    "_id": "voice_trans_65a1b2c3d4e5f6g7h8i9j0k4",
    "user_id": "user_123",
    "customer_id": "cust_123",
    "voice_log_id": "voice_log_65a1b2c3d4e5f6g7h8i9j0k1",
    
    "original_transcript": "I want to order 5 kilos of basmati rice and 2 bottles of mustard oil",
    "corrected_transcript": "I want to order 5 kilos of basmati rice and 2 liters of mustard oil",
    "final_transcript": "I want to order 5 kilos of basmati rice and 2 liters of mustard oil",
    
    "corrections": [
        {
            "position": 54,
            "original_text": "bottles",
            "corrected_text": "liters",
            "corrected_by": "ai",
            "corrected_at": datetime(2026, 1, 28, 10, 30, 48),
        }
    ],
    
    "average_confidence": 91.2,
    "word_count": 13,
    "accuracy_score": 94.5,
    
    "used_for_order": True,
    "used_for_command": False,
    "order_id": "order_65a1b2c3d4e5f6g7h8i9j0k3",
    
    "created_at": datetime(2026, 1, 28, 10, 30, 47),
    "last_corrected_at": datetime(2026, 1, 28, 10, 30, 48),
}


# ============================================================================
# COLLECTION 4: voice_accessibility (User accessibility preferences)
# ============================================================================

VOICE_ACCESSIBILITY_SCHEMA = {
    "_id": str,  # UUID or user_id
    "user_id": str,  # Links to users collection
    "customer_id": str,
    
    # Voice Settings
    "preferred_language": str,  # "en", "hi", "en-IN"
    "voice_speed": float,  # 0.5-2.0 (playback speed for feedback)
    "voice_volume": float,  # 0-100
    
    # Accessibility Features
    "enable_captions": bool,  # Show transcript while speaking
    "enable_audio_feedback": bool,  # Audio confirmation of actions
    "enable_haptic_feedback": bool,  # Vibration feedback
    "enable_visual_waveform": bool,  # Show waveform during recording
    
    # Display Preferences
    "font_size": str,  # "small", "medium", "large", "extra-large"
    "high_contrast_mode": bool,
    "dark_mode": bool,
    "text_to_speech": bool,  # Read results aloud
    
    # Voice Commands
    "voice_commands_enabled": bool,
    "require_confirmation_for_orders": bool,
    "auto_repeat_confirmation": bool,
    "confirmation_repetitions": int,  # Number of times to repeat confirmation
    
    # Quality Settings
    "minimum_confidence_threshold": float,  # 0-100
    "allow_noisy_audio": bool,
    "language_auto_detect": bool,
    
    # Metadata
    "created_at": datetime,
    "updated_at": datetime,
}

VOICE_ACCESSIBILITY_SAMPLE = {
    "_id": "voice_acc_user_123",
    "user_id": "user_123",
    "customer_id": "cust_123",
    
    "preferred_language": "en",
    "voice_speed": 1.0,
    "voice_volume": 80,
    
    "enable_captions": True,
    "enable_audio_feedback": True,
    "enable_haptic_feedback": True,
    "enable_visual_waveform": True,
    
    "font_size": "large",
    "high_contrast_mode": False,
    "dark_mode": True,
    "text_to_speech": False,
    
    "voice_commands_enabled": True,
    "require_confirmation_for_orders": True,
    "auto_repeat_confirmation": True,
    "confirmation_repetitions": 2,
    
    "minimum_confidence_threshold": 75.0,
    "allow_noisy_audio": True,
    "language_auto_detect": True,
    
    "created_at": datetime(2026, 1, 28, 10, 0, 0),
    "updated_at": datetime(2026, 1, 28, 10, 30, 0),
}


# ============================================================================
# INDEX DEFINITIONS (For Performance Optimization)
# ============================================================================

VOICE_INDEXES = {
    "voice_logs": [
        # Primary queries
        {"keys": [("user_id", ASCENDING), ("created_at", DESCENDING)]},
        {"keys": [("customer_id", ASCENDING), ("created_at", DESCENDING)]},
        {"keys": [("status", ASCENDING)]},
        {"keys": [("voice_type", ASCENDING)]},
        
        # Performance queries
        {"keys": [("confidence_score", DESCENDING)]},
        {"keys": [("clarity_score", DESCENDING)]},
        
        # TTL index for automatic cleanup (30 days)
        {"keys": [("expires_at", ASCENDING)], "expireAfterSeconds": 0},
        
        # Search indexes
        {"keys": [("transcription", TEXT)]},
    ],
    
    "voice_commands": [
        # Primary queries
        {"keys": [("user_id", ASCENDING), ("created_at", DESCENDING)]},
        {"keys": [("customer_id", ASCENDING), ("created_at", DESCENDING)]},
        {"keys": [("command_type", ASCENDING)]},
        {"keys": [("intent", ASCENDING)]},
        
        # Execution tracking
        {"keys": [("execution_status", ASCENDING)]},
        {"keys": [("human_review_needed", ASCENDING)]},
        
        # Links
        {"keys": [("voice_log_id", ASCENDING)]},
        {"keys": [("created_order_id", ASCENDING)]},
    ],
    
    "voice_transcripts": [
        # Primary queries
        {"keys": [("user_id", ASCENDING), ("created_at", DESCENDING)]},
        {"keys": [("voice_log_id", ASCENDING)]},
        
        # Usage tracking
        {"keys": [("used_for_order", ASCENDING)]},
        {"keys": [("used_for_command", ASCENDING)]},
        
        # Search
        {"keys": [("final_transcript", TEXT)]},
    ],
    
    "voice_accessibility": [
        {"keys": [("user_id", ASCENDING)]},
    ],
}


# ============================================================================
# INITIALIZATION FUNCTION
# ============================================================================

def initialize_voice_collections(db):
    """
    Initialize voice collections and indexes in MongoDB.
    
    Args:
        db: PyMongo database instance
        
    Returns:
        dict: Status of initialization
    """
    try:
        collections_created = []
        indexes_created = []
        
        # Create voice_logs collection
        if "voice_logs" not in db.list_collection_names():
            db.create_collection("voice_logs")
            collections_created.append("voice_logs")
        
        # Create voice_commands collection
        if "voice_commands" not in db.list_collection_names():
            db.create_collection("voice_commands")
            collections_created.append("voice_commands")
        
        # Create voice_transcripts collection
        if "voice_transcripts" not in db.list_collection_names():
            db.create_collection("voice_transcripts")
            collections_created.append("voice_transcripts")
        
        # Create voice_accessibility collection
        if "voice_accessibility" not in db.list_collection_names():
            db.create_collection("voice_accessibility")
            collections_created.append("voice_accessibility")
        
        # Create indexes
        for collection_name, indexes in VOICE_INDEXES.items():
            for index_spec in indexes:
                db[collection_name].create_index(
                    index_spec["keys"],
                    **{k: v for k, v in index_spec.items() if k != "keys"}
                )
                indexes_created.append(f"{collection_name}:{index_spec}")
        
        return {
            "success": True,
            "collections_created": collections_created,
            "indexes_created": len(indexes_created),
            "message": "Voice collections initialized successfully"
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to initialize voice collections"
        }


# ============================================================================
# USAGE EXAMPLES
# ============================================================================

if __name__ == "__main__":
    """
    Example usage:
    
    from pymongo import MongoClient
    from models_voice import initialize_voice_collections
    
    # Connect to database
    client = MongoClient('mongodb://localhost:27017/')
    db = client['earlybird_kirana']
    
    # Initialize collections
    result = initialize_voice_collections(db)
    print(result)
    
    # Insert sample data
    db.voice_logs.insert_one(VOICE_LOGS_SAMPLE)
    db.voice_commands.insert_one(VOICE_COMMANDS_SAMPLE)
    db.voice_transcripts.insert_one(VOICE_TRANSCRIPTS_SAMPLE)
    db.voice_accessibility.insert_one(VOICE_ACCESSIBILITY_SAMPLE)
    """
    pass
