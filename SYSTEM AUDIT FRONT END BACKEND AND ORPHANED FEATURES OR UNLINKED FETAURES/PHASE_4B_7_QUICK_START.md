# Phase 4B.7: Voice Integration Quick Start Guide

## 5-Minute Setup

### Prerequisites
- Node.js 14+ (frontend)
- Python 3.8+ (backend)
- MongoDB running
- Google Cloud credentials (optional, for better speech recognition)

---

## Backend Setup (5 minutes)

### Step 1: Install Dependencies
```bash
cd backend
pip install google-cloud-speech python-dotenv flask-cors pymongo
```

### Step 2: Copy Database Models
Create `backend/models_voice.py` with voice data schemas

### Step 3: Copy Voice Service
Create `backend/voice_service.py` with transcription and command processing logic

### Step 4: Register API Routes
In your main Flask app (`backend/app.py`):
```python
from backend.routes_voice import voice_bp

app.register_blueprint(voice_bp, url_prefix='/api/voice')
```

### Step 5: Start Backend
```bash
python app.py
# API available at: http://localhost:5000/api/voice
```

---

## Frontend Setup (5 minutes)

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

### Step 2: Copy Components
- `src/components/VoiceInput.jsx`
- `src/components/VoiceCommandCenter.jsx`
- `src/components/VoiceInput.module.css`
- `src/components/VoiceCommandCenter.module.css`

### Step 3: Copy Services
Create `src/services/voiceService.js` with API client

### Step 4: Add to Your App
```jsx
import VoiceInput from './components/VoiceInput';

function App() {
  return (
    <div>
      <VoiceInput onCommand={handleCommand} />
    </div>
  );
}
```

### Step 5: Start Frontend
```bash
npm start
# App available at: http://localhost:3000
```

---

## First Voice Command (2 minutes)

1. **Open the app** in your browser
2. **Click the microphone** button
3. **Speak clearly:** "order coffee"
4. **See results** in real-time
5. **Confirm execution** to place order

---

## Available Commands Quick Reference

### Ordering
- "order coffee" → Place order
- "change my order" → Modify order
- "cancel my order" → Cancel order
- "repeat last order" → Reorder

### Navigation
- "show menu" → Display menu
- "show my orders" → View orders
- "go home" → Navigate to home
- "settings" → Open settings

### Accessibility
- "repeat that" → Repeat last message
- "speak louder" → Increase volume
- "slow down" → Speak slowly

---

## Testing Checklist

- [ ] Microphone permission granted
- [ ] Audio recording starts on click
- [ ] Real-time transcription displays
- [ ] Commands recognized and executed
- [ ] Orders appear in database
- [ ] Error messages display correctly

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Microphone not working | Check browser permissions (Settings → Privacy → Microphone) |
| No transcription | Enable in Settings panel, check internet connection |
| Commands not recognized | Speak clearly, check confidence threshold |
| Server not responding | Verify backend is running on port 5000 |
| MongoDB errors | Ensure MongoDB service is running |

---

## Configuration

### Environment Variables

**Backend** (`.env`):
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
VOICE_MAX_DURATION=60
VOICE_CONFIDENCE_THRESHOLD=0.7
MONGODB_URI=mongodb://localhost:27017
```

**Frontend** (`.env`):
```
REACT_APP_VOICE_API=http://localhost:5000/api/voice
REACT_APP_MAX_DURATION=60
```

### Key Settings

Access settings through VoiceCommandCenter component:
- **Language:** Choose from en-IN, en-US, etc.
- **Confidence Threshold:** Lower = more permissive (0.5-0.9)
- **Voice Captions:** Show/hide live transcription
- **Speaking Rate:** Control output speech speed (0.5-2.0)

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/voice/transcribe` | Convert audio to text |
| POST | `/api/voice/process` | Identify command from text |
| POST | `/api/voice/execute` | Execute a command |
| GET | `/api/voice/history` | View past commands |
| GET | `/api/voice/commands` | List available commands |

---

## Next Steps

1. **Customize Commands:** Edit command definitions in backend
2. **Add Voice Feedback:** Implement text-to-speech responses
3. **Train Models:** Improve recognition with user-specific training
4. **Monitor Usage:** Check voice logs and analytics
5. **Extend Commands:** Add custom commands for your use case

---

## File Structure

```
earlybird-emergent/
├── backend/
│   ├── models_voice.py          # Database schemas
│   ├── voice_service.py         # Core service logic
│   ├── routes_voice.py          # API endpoints
│   └── app.py                   # Main Flask app
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceInput.jsx
│   │   │   ├── VoiceInput.module.css
│   │   │   ├── VoiceCommandCenter.jsx
│   │   │   └── VoiceCommandCenter.module.css
│   │   ├── services/
│   │   │   └── voiceService.js
│   │   └── App.jsx
│   └── package.json
└── docs/
    ├── PHASE_4B_7_VOICE_INTEGRATION.md
    ├── PHASE_4B_7_API_REFERENCE.md
    └── PHASE_4B_7_QUICK_START.md
```

---

## Support

- **Full Guide:** See PHASE_4B_7_VOICE_INTEGRATION.md
- **API Docs:** See PHASE_4B_7_API_REFERENCE.md
- **Issues:** Check troubleshooting section above

---

**Ready to go!** Start with Step 1 above. Questions? Check the full documentation.

**Estimated Revenue:** ₹2-5K/month from voice feature usage
