# EARLYAPP - How to Run the Code

**Date**: January 28, 2026 | **Status**: Ready to Deploy

---

## Quick Start (5 Minutes)

### Run Backend Locally
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python server.py
```

**Backend will be available at**: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Swagger UI: `http://localhost:8000/redoc`

### Run Frontend Locally
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

**Frontend will be available at**: `http://localhost:3000`

---

## Running Backend in Detail

### Step 1: Set Up Environment
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

### Step 2: Install Dependencies
```bash
# Upgrade pip first
pip install --upgrade pip

# Install from requirements.txt
pip install -r requirements.txt

# Or freeze current environment
pip freeze > requirements.txt
```

### Step 3: Configure Environment Variables
Create `backend/.env` file:
```env
# Database
MONGO_URL=mongodb://localhost:27017/earlyapp
DB_NAME=earlyapp

# Server
ENVIRONMENT=development
DEBUG=True
PORT=8000

# Authentication
JWT_SECRET=your-secret-key-here

# Notifications (optional)
FCM_SERVER_KEY=your-fcm-key

# Email (optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Stripe (if using payments)
STRIPE_API_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Step 4: Start Backend Server
```bash
# Run with uvicorn
python server.py

# Or directly with uvicorn
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

**Output should show**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
```

### Step 5: Test Backend
```bash
# In another terminal, test the health endpoint
curl http://localhost:8000/health

# Should return:
# {"status":"ok"}
```

---

## Running Frontend in Detail

### Step 1: Navigate to Frontend
```bash
cd frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

**Wait for** `added X packages` message.

### Step 3: Configure Firebase (Important!)
Update `frontend/src/config/firebase.js` with your Firebase credentials from [Firebase Console](https://console.firebase.google.com):

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "1:123456789:web:abc123..."
};
```

Or use `.env` file:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
REACT_APP_FIREBASE_PROJECT_ID=your-project
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_VAPID_KEY=your-vapid-key
```

### Step 4: Start Development Server
```bash
npm start
```

**Output should show**:
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Press q to quit.
```

### Step 5: Open in Browser
Open `http://localhost:3000` in your browser.

---

## Running Both Together (Full Stack)

### Terminal 1: Backend
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python server.py
# Should see: Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm start
# Should see: Local: http://localhost:3000
```

### Terminal 3: Optional - Database (if not using cloud)
```bash
# If using local MongoDB
mongod

# Or if using Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

**Now you have**:
- ✅ Backend API running: `http://localhost:8000`
- ✅ Frontend UI running: `http://localhost:3000`
- ✅ Database running: `mongodb://localhost:27017`

---

## Running Tests

### Backend Tests
```bash
cd backend

# Install test dependencies
pip install pytest pytest-asyncio

# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v

# Run with coverage
pip install pytest-cov
pytest --cov=.
```

### Frontend Tests
```bash
cd frontend

# Run tests in watch mode
npm test

# Run tests once
npm test -- --watchAll=false

# Run with coverage
npm test -- --coverage
```

---

## Building for Production

### Build Frontend
```bash
cd frontend

# Create optimized production build
npm run build

# This creates a `build/` directory ready for deployment
# Size should be < 500KB (gzipped)
```

### Build Backend Docker Image
```bash
cd backend

# Build Docker image
docker build -t earlyapp-backend:latest .

# Run Docker container
docker run -p 8080:8080 earlyapp-backend:latest

# Test it
curl http://localhost:8080/health
```

---

## Deployment Scripts (One-Click Deploy)

### Automated Setup (First Time Only)
```bash
# From project root
bash scripts/deploy-setup.sh

# This will:
# 1. Check prerequisites (gcloud, firebase)
# 2. Set up Google Cloud project
# 3. Enable required APIs
# 4. Create service accounts
# 5. Guide MongoDB Atlas setup
# 6. Store secrets securely
```

### Deploy Backend to Production
```bash
cd backend
bash ../scripts/deploy-backend.sh

# This will:
# 1. Update requirements.txt
# 2. Build Docker image
# 3. Deploy to Google Cloud Run
# 4. Test health endpoint
# 5. Show service URL
```

### Deploy Frontend to Production
```bash
cd frontend
bash ../scripts/deploy-frontend.sh

# This will:
# 1. Install dependencies
# 2. Build optimized bundle
# 3. Deploy to Firebase Hosting
# 4. Show live URLs
```

---

## Environment Setup by Platform

### Windows
```bash
# Create virtual environment
python -m venv venv

# Activate (PowerShell)
venv\Scripts\Activate.ps1

# Activate (Command Prompt)
venv\Scripts\activate.bat

# Install dependencies
pip install -r backend/requirements.txt

# Install Node modules
cd frontend && npm install
```

### macOS / Linux
```bash
# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Install Node modules
cd frontend && npm install
```

---

## Docker Setup (Alternative)

### Run Everything in Docker
```bash
# From project root
docker-compose up

# This runs:
# - MongoDB on port 27017
# - Backend on port 8000
# - Frontend on port 3000 (with live reload)
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Stop Services
```bash
docker-compose down

# With volume cleanup
docker-compose down -v
```

---

## Common Issues & Solutions

### Issue: Port Already in Use
```bash
# Check what's using port 3000
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000

# Kill the process
# Windows
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>

# Or use different port
npm start -- --port 3001
```

### Issue: Module Not Found / Dependencies
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clear Python cache
cd backend
rm -rf __pycache__ .pytest_cache
pip install --force-reinstall -r requirements.txt
```

### Issue: MongoDB Connection Error
```bash
# Check if MongoDB is running
# Windows
Get-Service MongoDB

# macOS (if installed via brew)
brew services list | grep mongodb

# Start MongoDB if needed
mongod

# Or use Docker
docker run -d -p 27017:27017 mongo
```

### Issue: Firebase Configuration Error
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Copy your project config
3. Update `frontend/src/config/firebase.js`
4. Ensure `.firebaserc` has correct project ID

### Issue: API Calls Failing (CORS Error)
```bash
# Make sure backend CORS is configured correctly
# In backend/server.py, check:

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Development Workflow

### 1. Start Fresh
```bash
# Terminal 1: Backend
cd backend && source venv/bin/activate && python server.py

# Terminal 2: Frontend
cd frontend && npm start

# Terminal 3: (Optional) Database
docker run -d -p 27017:27017 mongo
```

### 2. Make Changes
- **Backend**: Edit files in `backend/` - server auto-reloads
- **Frontend**: Edit files in `frontend/src/` - browser auto-refreshes

### 3. Debug Issues
- **Backend**: Check logs in terminal 1
- **Frontend**: Check browser console (F12)
- **Network**: Check in browser DevTools → Network tab
- **Database**: Check MongoDB with `mongosh` or MongoDB Compass

### 4. Commit Changes
```bash
git add .
git commit -m "feat: describe your changes"
git push origin main
```

---

## Going to Production

### Step 1: Read the Guides
1. [DEPLOYMENT_GUIDE_ONLINE.md](DEPLOYMENT_GUIDE_ONLINE.md) - Full deployment guide
2. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Verification checklist

### Step 2: Create Accounts
- Google Cloud (for backend)
- Firebase (for frontend & FCM)
- MongoDB Atlas (for database)

### Step 3: Run Setup Script
```bash
bash scripts/deploy-setup.sh
```

### Step 4: Deploy
```bash
# Deploy backend
cd backend && bash ../scripts/deploy-backend.sh

# Deploy frontend
cd frontend && bash ../scripts/deploy-frontend.sh
```

### Step 5: Test
- Visit frontend URL
- Check API health endpoint
- Test key features
- Monitor logs

---

## Quick Commands Reference

```bash
# Backend
cd backend
python -m venv venv                    # Create env
source venv/bin/activate              # Activate (Mac/Linux)
venv\Scripts\activate                 # Activate (Windows)
pip install -r requirements.txt       # Install deps
python server.py                       # Run server
pytest                                 # Run tests

# Frontend
cd frontend
npm install                            # Install deps
npm start                              # Dev server
npm run build                          # Production build
npm test                               # Run tests
firebase deploy                        # Deploy to Firebase

# Deployment
bash scripts/deploy-setup.sh           # First-time setup
bash scripts/deploy-backend.sh         # Deploy backend
bash scripts/deploy-frontend.sh        # Deploy frontend

# Database
mongod                                 # Run local MongoDB
mongo                                  # Connect to MongoDB
docker run -p 27017:27017 mongo        # Docker MongoDB

# Git
git status                             # Check status
git add .                              # Stage changes
git commit -m "message"                # Commit
git push origin main                   # Push to GitHub
```

---

## Next Steps

1. **Local Development**: Follow the Quick Start section above
2. **Test Locally**: Use both terminals (backend + frontend)
3. **Prepare for Production**: Read DEPLOYMENT_GUIDE_ONLINE.md
4. **Deploy**: Use the deploy scripts when ready
5. **Monitor**: Check logs and metrics post-deployment

---

## Support

- **Backend Issues**: Check `backend/` logs and [FastAPI docs](https://fastapi.tiangolo.com/)
- **Frontend Issues**: Check `frontend/` logs and [React docs](https://react.dev/)
- **Deployment Issues**: Refer to [DEPLOYMENT_GUIDE_ONLINE.md](DEPLOYMENT_GUIDE_ONLINE.md)
- **Database Issues**: Check [MongoDB Atlas docs](https://docs.atlas.mongodb.com/)

---

**Ready to run EARLYAPP! 🚀**

Choose your path:
- **Local Development**: Follow "Quick Start" or detailed sections above
- **Production Deployment**: Follow "Deployment Scripts" section
- **Docker Setup**: Use `docker-compose up`

---
**Last Updated**: January 28, 2026
**Version**: 1.0
