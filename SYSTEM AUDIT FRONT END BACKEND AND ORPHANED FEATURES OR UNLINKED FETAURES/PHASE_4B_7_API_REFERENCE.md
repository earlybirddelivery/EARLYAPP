# Phase 4B.7: Voice Integration API Reference

## Base URL
```
/api/voice
```

## Authentication
All endpoints require:
```
Authorization: Bearer {JWT_TOKEN}
```

---

## Endpoints

### 1. POST /transcribe

**Description:** Submit audio for speech-to-text transcription

**Request Body:**
```json
{
  "audio_data": "base64-encoded-audio-stream",
  "language": "en-IN",
  "duration": 5.2,
  "encoding": "LINEAR16",
  "sample_rate": 16000
}
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| audio_data | string (base64) | Yes | Encoded audio file |
| language | string | No | Language code (default: en-IN) |
| duration | number | Yes | Duration in seconds |
| encoding | string | No | Audio encoding (default: LINEAR16) |
| sample_rate | number | No | Sample rate in Hz (default: 16000) |

**Response (200 OK):**
```json
{
  "success": true,
  "text": "order one coffee with sugar",
  "language": "en-IN",
  "duration": 5.2,
  "confidence": 0.98,
  "alternatives": [
    {
      "transcript": "order one coffee with sugar",
      "confidence": 0.98
    }
  ]
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "INVALID_AUDIO",
  "message": "Audio data is invalid or corrupted"
}
```

**Response (429 Too Many Requests):**
```json
{
  "success": false,
  "error": "RATE_LIMIT",
  "message": "Too many transcription requests. Try again later."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/voice/transcribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_data": "UklGRiYAAABXQVZFZm10...",
    "language": "en-IN",
    "duration": 5.2
  }'
```

---

### 2. POST /process

**Description:** Parse voice text and identify command intent

**Request Body:**
```json
{
  "text": "order one coffee with sugar",
  "language": "en-IN",
  "context": "order"
}
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| text | string | Yes | Text to process |
| language | string | No | Language code (default: en-IN) |
| context | string | No | Command category hint |

**Response (200 OK):**
```json
{
  "success": true,
  "original_text": "order one coffee with sugar",
  "processed_text": "order coffee quantity 1 customization sugar",
  "command": "place_order",
  "confidence": 0.95,
  "parameters": {
    "item": "coffee",
    "quantity": 1,
    "customization": ["sugar"]
  },
  "message": "Command identified successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "COMMAND_NOT_FOUND",
  "message": "No matching command found for input",
  "suggestions": ["place_order", "show_menu"]
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "success": false,
  "error": "LOW_CONFIDENCE",
  "message": "Command confidence below threshold (0.65 < 0.70)",
  "detected_command": "place_order",
  "confidence": 0.65
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/voice/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "order one coffee with sugar",
    "language": "en-IN"
  }'
```

---

### 3. POST /execute

**Description:** Execute a voice command

**Request Body:**
```json
{
  "command": "place_order",
  "parameters": {
    "item": "coffee",
    "quantity": 1,
    "customization": ["sugar"]
  },
  "log_voice": true
}
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| command | string | Yes | Command identifier |
| parameters | object | Yes | Command parameters |
| log_voice | boolean | No | Log in voice history (default: true) |

**Response (200 OK):**
```json
{
  "success": true,
  "command": "place_order",
  "status": "success",
  "order_id": "ORD-2024-001234",
  "message": "Order placed successfully",
  "details": {
    "item": "coffee",
    "quantity": 1,
    "estimated_time": "5 mins",
    "total_price": 250
  },
  "voice_log_id": "VL-2024-001",
  "timestamp": "2024-01-20T10:30:00Z"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "COMMAND_NOT_FOUND",
  "message": "Command 'unknown_command' not found"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "INVALID_PARAMETERS",
  "message": "Missing required parameter: item",
  "required": ["item", "quantity"]
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/voice/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "place_order",
    "parameters": {
      "item": "coffee",
      "quantity": 1,
      "customization": ["sugar"]
    }
  }'
```

---

### 4. GET /history

**Description:** Retrieve user's voice command history

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Max results (default: 20, max: 100) |
| offset | number | No | Pagination offset (default: 0) |
| user_id | string | No | Filter by user (default: current user) |
| status | string | No | Filter by status (success/failed/partial) |
| command | string | No | Filter by command type |
| from_date | string (ISO-8601) | No | Start date filter |
| to_date | string (ISO-8601) | No | End date filter |

**Response (200 OK):**
```json
{
  "success": true,
  "logs": [
    {
      "id": "VL-2024-001",
      "timestamp": "2024-01-20T10:30:00Z",
      "original_text": "order one coffee with sugar",
      "processed_text": "order coffee",
      "detected_command": "place_order",
      "confidence": 0.95,
      "status": "success",
      "order_id": "ORD-2024-001234",
      "audio_duration": 5.2,
      "language": "en-IN"
    },
    {
      "id": "VL-2024-002",
      "timestamp": "2024-01-20T09:15:00Z",
      "original_text": "show my orders",
      "processed_text": "show orders",
      "detected_command": "show_orders",
      "confidence": 0.92,
      "status": "success",
      "audio_duration": 3.1,
      "language": "en-IN"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "INVALID_PARAMETERS",
  "message": "limit must be between 1 and 100"
}
```

**cURL Example:**
```bash
curl "http://localhost:5000/api/voice/history?limit=20&status=success" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. GET /commands

**Description:** Get list of available voice commands

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | No | Filter by category |
| search | string | No | Search command name/description |

**Response (200 OK):**
```json
{
  "success": true,
  "commands": [
    {
      "id": "place_order",
      "name": "Place Order",
      "category": "ordering",
      "description": "Place a new order",
      "icon": "📦",
      "examples": [
        "order coffee",
        "i want a pizza",
        "place order for sandwich"
      ],
      "parameters": [
        {
          "name": "item",
          "type": "string",
          "required": true,
          "description": "Item to order"
        },
        {
          "name": "quantity",
          "type": "number",
          "required": false,
          "default": 1,
          "description": "Quantity (default: 1)"
        },
        {
          "name": "customization",
          "type": "array",
          "required": false,
          "description": "Special requests"
        }
      ]
    },
    {
      "id": "modify_order",
      "name": "Modify Order",
      "category": "ordering",
      "description": "Modify an existing order",
      "icon": "✏️",
      "examples": [
        "change my order",
        "add sugar to my coffee",
        "modify quantity"
      ],
      "parameters": [
        {
          "name": "order_id",
          "type": "string",
          "required": true,
          "description": "Order to modify"
        },
        {
          "name": "modifications",
          "type": "object",
          "required": true,
          "description": "Changes to apply"
        }
      ]
    },
    {
      "id": "cancel_order",
      "name": "Cancel Order",
      "category": "ordering",
      "description": "Cancel an existing order",
      "icon": "❌",
      "examples": [
        "cancel my order",
        "remove last order",
        "cancel order"
      ],
      "parameters": [
        {
          "name": "order_id",
          "type": "string",
          "required": true,
          "description": "Order to cancel"
        }
      ]
    },
    {
      "id": "show_menu",
      "name": "Show Menu",
      "category": "navigation",
      "description": "Display available menu items",
      "icon": "🍽️",
      "examples": [
        "show menu",
        "what do you have",
        "list items"
      ],
      "parameters": []
    },
    {
      "id": "show_orders",
      "name": "Show Orders",
      "category": "navigation",
      "description": "Display user's orders",
      "icon": "📋",
      "examples": [
        "show my orders",
        "list orders",
        "my orders"
      ],
      "parameters": []
    },
    {
      "id": "repeat",
      "name": "Repeat",
      "category": "accessibility",
      "description": "Repeat the last message",
      "icon": "🔊",
      "examples": [
        "repeat that",
        "say it again"
      ],
      "parameters": []
    }
  ],
  "categories": ["ordering", "navigation", "accessibility"],
  "total": 6
}
```

**cURL Example:**
```bash
curl "http://localhost:5000/api/voice/commands?category=ordering" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. GET /commands/:id

**Description:** Get details of a specific command

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Command identifier |

**Response (200 OK):**
```json
{
  "success": true,
  "command": {
    "id": "place_order",
    "name": "Place Order",
    "category": "ordering",
    "description": "Place a new order",
    "detailed_description": "Order items from the menu. You can specify quantity and customizations.",
    "icon": "📦",
    "examples": [
      "order coffee",
      "i want a pizza",
      "place order for sandwich"
    ],
    "parameters": [
      {
        "name": "item",
        "type": "string",
        "required": true,
        "description": "Item to order"
      },
      {
        "name": "quantity",
        "type": "number",
        "required": false,
        "default": 1,
        "description": "Quantity (default: 1)"
      }
    ],
    "syntax": "order [quantity] [item] [customization]",
    "usage_count": 1250,
    "success_rate": 0.94
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "COMMAND_NOT_FOUND",
  "message": "Command 'unknown_command' not found"
}
```

**cURL Example:**
```bash
curl "http://localhost:5000/api/voice/commands/place_order" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. DELETE /history/:id

**Description:** Delete a voice log entry

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Voice log ID |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Voice log deleted successfully",
  "id": "VL-2024-001"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "LOG_NOT_FOUND",
  "message": "Voice log 'VL-2024-001' not found"
}
```

**cURL Example:**
```bash
curl -X DELETE "http://localhost:5000/api/voice/history/VL-2024-001" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 8. GET /settings

**Description:** Get user's voice settings

**Response (200 OK):**
```json
{
  "success": true,
  "settings": {
    "language": "en-IN",
    "confidence_threshold": 0.70,
    "auto_execute": false,
    "show_captions": true,
    "voice_feedback": true,
    "speaking_rate": 1.0,
    "voice_volume": 100
  }
}
```

---

### 9. PUT /settings

**Description:** Update user's voice settings

**Request Body:**
```json
{
  "language": "en-US",
  "confidence_threshold": 0.75,
  "show_captions": true,
  "speaking_rate": 1.2
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": {
    "language": "en-US",
    "confidence_threshold": 0.75,
    "show_captions": true,
    "speaking_rate": 1.2
  }
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:5000/api/voice/settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en-US",
    "confidence_threshold": 0.75
  }'
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| INVALID_AUDIO | 400 | Audio data is invalid or corrupted |
| INVALID_PARAMETERS | 400 | Required parameters missing or invalid |
| COMMAND_NOT_FOUND | 404 | Specified command not found |
| LOW_CONFIDENCE | 422 | Confidence score below threshold |
| RATE_LIMIT | 429 | Too many requests |
| AUTHENTICATION_FAILED | 401 | Invalid or missing token |
| PERMISSION_DENIED | 403 | User lacks permission |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

Voice endpoints are rate-limited:
- **Transcription:** 100 requests/minute per user
- **Process:** 200 requests/minute per user
- **Execute:** 50 requests/minute per user
- **History:** 100 requests/minute per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705755060
```

---

## Supported Languages

| Code | Language | Region |
|------|----------|--------|
| en-IN | English | India |
| en-US | English | USA |
| hi-IN | Hindi | India |
| ta-IN | Tamil | India |
| te-IN | Telugu | India |
| ka-IN | Kannada | India |
| ml-IN | Malayalam | India |

---

## Testing

### Using Postman

1. Import the collection: `voice-api.postman_collection.json`
2. Set environment variables:
   - `{{base_url}}`: http://localhost:5000
   - `{{token}}`: Your JWT token
3. Run requests from the collection

### Using JavaScript/Fetch

```javascript
// Transcribe audio
const response = await fetch('/api/voice/transcribe', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    audio_data: audioBase64,
    language: 'en-IN',
    duration: 5.2
  })
});

const result = await response.json();
console.log(result);
```

---

**Last Updated:** January 2024  
**API Version:** 1.0.0  
**Status:** Production Ready
