# EARLYAPP Online Deployment Guide
**Date**: January 28, 2026 | **Status**: Complete Deployment Setup

---

## Overview
This guide covers deploying EARLYAPP with:
- **Backend**: Python/FastAPI on Google Cloud Run
- **Database**: MongoDB Atlas (Cloud)
- **Frontend**: Firebase Hosting
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Storage**: Google Cloud Storage
- **Repository**: GitHub (Public)

---

## 1. MongoDB Atlas Setup (Database)

### Step 1.1: Create MongoDB Atlas Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account or sign in
3. Click "Create a New Cluster"
4. Select your cloud provider (Google Cloud recommended)
5. Choose region closest to your users (e.g., us-central1)
6. Create cluster (takes 5-10 minutes)

### Step 1.2: Set Up Database User
1. Navigate to "Security" → "Database Access"
2. Create a new database user
   - **Username**: `earlyapp_user`
   - **Password**: Generate strong password (save it!)
3. Click "Create Database User"

### Step 1.3: Configure Network Access
1. Go to "Network Access"
2. Click "Add IP Address"
3. For development: Add `0.0.0.0/0` (allow all)
4. For production: Add specific IP addresses only
5. Click "Confirm"

### Step 1.4: Get Connection String
1. Click "Connect" on your cluster
2. Select "Connect your application"
3. Choose "Python" as driver
4. Copy the connection string
5. Replace `<password>` with your database user password

### Step 1.5: Configure Backend .env
Create/update `backend/.env`:
```env
MONGO_URL=mongodb+srv://earlyapp_user:<password>@cluster0.xxxxx.mongodb.net/earlyapp?retryWrites=true&w=majority
DB_NAME=earlyapp
ENVIRONMENT=production
```

---

## 2. Google Cloud Setup

### Step 2.1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a Project" → "New Project"
3. Name it: `earlyapp-production`
4. Click "Create"

### Step 2.2: Enable Required APIs
Enable these APIs:
- Cloud Run
- Cloud Build
- Container Registry
- Cloud Storage
- Cloud Tasks
- Secret Manager

**Quick enable command**:
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  storage-api.googleapis.com \
  cloudtasks.googleapis.com \
  secretmanager.googleapis.com
```

### Step 2.3: Set Up Service Account
1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Name: `earlyapp-backend`
4. Grant roles:
   - Cloud Run Admin
   - Cloud Build Editor
   - Storage Admin
   - Secret Manager Admin
5. Click "Create and Continue"
6. Create JSON key (for local development)
7. Download and store securely

### Step 2.4: Configure gcloud CLI
```bash
# Install gcloud (if not already installed)
# https://cloud.google.com/sdk/docs/install

# Initialize gcloud
gcloud init

# Set project
gcloud config set project earlyapp-production

# Authenticate
gcloud auth login
```

---

## 3. Firebase Setup (Frontend & FCM)

### Step 3.1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name: `earlyapp-production`
4. Enable Google Analytics (optional)
5. Create project

### Step 3.2: Configure Web App
1. Click the Web icon (</> ) in Firebase Console
2. Register app name: `earlyapp-web`
3. Copy Firebase config object
4. Check "Also set up Firebase Hosting"

### Step 3.3: Update Frontend Firebase Config
Update `frontend/src/config/firebase.js`:
```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "earlyapp-production.firebaseapp.com",
  projectId: "earlyapp-production",
  storageBucket: "earlyapp-production.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);
```

### Step 3.4: Set Up Firebase Hosting
```bash
cd frontend

# Install Firebase CLI (if not already)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase
firebase init hosting

# When prompted:
# - Use earlyapp-production project
# - Set public directory to: build
# - Configure as single-page app: Yes
# - Don't overwrite build/index.html
```

### Step 3.5: Configure .firebaserc
Update `frontend/.firebaserc`:
```json
{
  "projects": {
    "default": "earlyapp-production"
  }
}
```

---

## 4. Firebase Cloud Messaging (FCM) Setup

### Step 4.1: Generate Web Push Certificate
1. In Firebase Console, go to Project Settings
2. Navigate to "Cloud Messaging" tab
3. Under "Web configuration", generate new key pair
4. Copy the Server API Key and Sender ID

### Step 4.2: Create Service Worker for FCM
Create `frontend/public/firebase-messaging-sw.js`:
```javascript
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "earlyapp-production.firebaseapp.com",
  projectId: "earlyapp-production",
  storageBucket: "earlyapp-production.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

### Step 4.3: Request FCM Token in Frontend
Create `frontend/src/utils/fcm.js`:
```javascript
import { messaging } from '@/config/firebase';
import { getToken } from 'firebase/messaging';

export const getFCMToken = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_PUBLIC_KEY'
    });
    if (token) {
      console.log('FCM Token:', token);
      // Send this token to your backend
      return token;
    }
  } catch (error) {
    console.error('Failed to get FCM token:', error);
  }
};

// Request notification permission
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return await getFCMToken();
    }
  } catch (error) {
    console.error('Notification permission denied:', error);
  }
};
```

### Step 4.4: Save FCM Token in Backend
Update `backend/routes_notifications.py`:
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class FCMTokenRequest(BaseModel):
    user_id: str
    token: str

@router.post("/api/fcm/save-token")
async def save_fcm_token(request: FCMTokenRequest):
    # Save to database
    await db.fcm_tokens.update_one(
        {"user_id": request.user_id},
        {"$set": {"token": request.token, "updated_at": datetime.now()}},
        upsert=True
    )
    return {"status": "success"}
```

---

## 5. Backend Deployment to Google Cloud Run

### Step 5.1: Prepare Backend
1. Ensure `backend/requirements.txt` is up-to-date:
```bash
pip freeze > backend/requirements.txt
```

2. Create `backend/.dockerignore`:
```
__pycache__
*.pyc
.env
.git
venv
tests
*.log
```

3. Verify `backend/Dockerfile` exists and is correct:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Step 5.2: Store Secrets in Google Secret Manager
```bash
# Store MongoDB URL
echo -n "mongodb+srv://earlyapp_user:password@cluster0.xxxxx.mongodb.net/earlyapp?retryWrites=true&w=majority" | \
  gcloud secrets create mongo-url --data-file=-

# Store JWT Secret
echo -n "your-super-secret-jwt-key" | \
  gcloud secrets create jwt-secret --data-file=-

# Store other sensitive variables
gcloud secrets create fcm-server-key --data-file=-
gcloud secrets create stripe-api-key --data-file=-
```

### Step 5.3: Deploy Backend to Cloud Run
```bash
cd backend

# Build and deploy
gcloud run deploy earlyapp-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 3600 \
  --set-env-vars "ENVIRONMENT=production,DB_NAME=earlyapp" \
  --update-secrets "MONGO_URL=mongo-url:latest,JWT_SECRET=jwt-secret:latest"

# Note the service URL (e.g., https://earlyapp-backend-xxxxx.run.app)
```

### Step 5.4: Configure CORS for Frontend
Update `backend/server.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://earlyapp-production.web.app",
        "https://earlyapp-production.firebaseapp.com",
        "http://localhost:3000"  # for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 6. Frontend Deployment to Firebase Hosting

### Step 6.1: Build Frontend
```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### Step 6.2: Update API Endpoints
Update `frontend/src/config/api.js`:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'https://earlyapp-backend-xxxxx.run.app';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Step 6.3: Deploy to Firebase Hosting
```bash
cd frontend

# Deploy
firebase deploy --only hosting

# View deployment
firebase open hosting:site
```

---

## 7. Set Up Custom Domain (Optional)

### For Firebase Hosting
1. In Firebase Console → Hosting
2. Click "Connect Domain"
3. Enter your domain (e.g., `app.earlybirds.in`)
4. Follow DNS configuration steps

### For Cloud Run Backend
1. Get your Cloud Run URL
2. Create DNS CNAME record pointing to Cloud Run service
3. Or use Cloud Load Balancer with custom domain

---

## 8. Environment Configuration Summary

### Frontend (.env)
```env
REACT_APP_API_URL=https://earlyapp-backend-xxxxx.run.app
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
REACT_APP_FIREBASE_PROJECT_ID=earlyapp-production
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
```

### Backend (.env - in Google Secret Manager)
```env
MONGO_URL=mongodb+srv://earlyapp_user:password@cluster0.xxxxx.mongodb.net/earlyapp?retryWrites=true&w=majority
DB_NAME=earlyapp
JWT_SECRET=your-secret-key
ENVIRONMENT=production
FCM_SERVER_KEY=your-fcm-key
STRIPE_API_KEY=sk_live_xxxxx
```

---

## 9. CI/CD Pipeline Setup (GitHub Actions)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy Backend to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v0
        with:
          service: earlyapp-backend
          image: gcr.io/${{ secrets.GCP_PROJECT_ID }}/earlyapp-backend
          region: us-central1
          credentials: ${{ secrets.GCP_SA_KEY }}

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: cd frontend && npm install
      
      - name: Build
        run: cd frontend && npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: earlyapp-production
          channelId: live
```

---

## 10. Monitoring & Logging

### Google Cloud Logging
```bash
# View backend logs
gcloud logging read "resource.service.name=earlyapp-backend" --limit 50

# Stream logs in real-time
gcloud logging read "resource.service.name=earlyapp-backend" --stream
```

### Firebase Analytics
- Enable in Firebase Console
- View user analytics automatically
- Set up custom events in frontend

---

## 11. Security Checklist

- [ ] MongoDB credentials secured in Secret Manager
- [ ] Firebase rules configured (Firestore, Storage)
- [ ] Backend CORS properly configured
- [ ] API keys restricted to appropriate domains
- [ ] HTTPS enforced everywhere
- [ ] Regular backups configured
- [ ] Rate limiting enabled on API
- [ ] Input validation on all endpoints
- [ ] Authentication tokens rotated regularly

---

## 12. Deployment Commands Cheat Sheet

### Backend (From backend/ directory)
```bash
# Deploy to Cloud Run
gcloud run deploy earlyapp-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# View logs
gcloud logging read "resource.service.name=earlyapp-backend" --stream

# Update secret
gcloud secrets versions add mongo-url --data-file=-
```

### Frontend (From frontend/ directory)
```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting

# View deployment URL
firebase open hosting:site
```

---

## 13. Rollback Procedures

### Backend Rollback
```bash
# List previous revisions
gcloud run revisions list --service=earlyapp-backend

# Revert to previous version
gcloud run deploy earlyapp-backend \
  --image gcr.io/earlyapp-production/earlyapp-backend:previous-tag
```

### Frontend Rollback
```bash
# View deployment history
firebase hosting:channels:list

# Rollback to previous deploy
firebase hosting:channels:deploy previous-version
```

---

## 14. Cost Optimization

- Use Google Cloud's **Always Free** tier for small workloads
- Enable **Cloud Scheduler** for automated tasks
- Use **Firestore** for real-time data (cheaper for read-heavy apps)
- Enable **Cloud CDN** for static assets
- Set up **Budget Alerts** in Google Cloud Console

---

## 15. Next Steps

1. [ ] Create MongoDB Atlas account and cluster
2. [ ] Set up Google Cloud project
3. [ ] Configure Firebase project
4. [ ] Deploy backend to Cloud Run
5. [ ] Deploy frontend to Firebase Hosting
6. [ ] Set up custom domain
7. [ ] Configure FCM notifications
8. [ ] Set up CI/CD pipeline
9. [ ] Configure monitoring and alerts
10. [ ] Test all services end-to-end

---

**Support Resources**:
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Google Cloud Run Docs](https://cloud.google.com/run/docs)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

---

**Last Updated**: January 28, 2026
**Next Review**: February 28, 2026
