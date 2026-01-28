# EARLYAPP - Online Deployment & Running Guide

**Date**: January 28, 2026 | **Status**: Production Deployment Ready

---

## 🌐 Running Your App Online (Not Locally)

This guide shows how to deploy and run EARLYAPP on cloud platforms:
- **Database**: MongoDB Atlas (Cloud)
- **Backend**: Google Cloud Run
- **Frontend**: Firebase Hosting
- **Push Notifications**: Firebase Cloud Messaging (FCM)

---

## ⚡ 30-Minute Quick Deployment

### Prerequisites (Create Accounts - 10 min)
1. [Google Cloud Account](https://console.cloud.google.com) - Free tier available
2. [Firebase Account](https://console.firebase.google.com) - Uses same Google account
3. [MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas) - Free tier (512MB)
4. [GitHub Account](https://github.com) - Already have this

### Step 1: Create MongoDB Cluster (5 min)
```
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Build a Database"
3. Select FREE tier (M0)
4. Choose your cloud provider (Google Cloud recommended)
5. Choose region (e.g., us-central1)
6. Create cluster (takes 2-3 minutes)
7. Create Database User:
   - Username: earlyapp_user
   - Password: Generate strong password (save it!)
8. Click "Connect"
9. Select "Connect your application"
10. Copy connection string like: mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp
```

### Step 2: Set Up Google Cloud (5 min)
```bash
# Install Google Cloud CLI
# Download from: https://cloud.google.com/sdk/docs/install

# Initialize
gcloud init

# Create project
gcloud projects create earlyapp-production --name="EARLYAPP Production"

# Set as active
gcloud config set project earlyapp-production

# Enable required APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### Step 3: Deploy Backend to Cloud Run (10 min)
```bash
# Navigate to backend
cd backend

# Deploy (replace with your MongoDB URL)
gcloud run deploy earlyapp-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "MONGO_URL=mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp"

# Copy the service URL shown (e.g., https://earlyapp-backend-xxxxx.run.app)
```

### Step 4: Deploy Frontend to Firebase (10 min)
```bash
# Navigate to frontend
cd frontend

# Login to Firebase
firebase login

# Initialize if not done
firebase init hosting

# Update .firebaserc with your project ID
# Build for production
npm run build

# Deploy
firebase deploy --only hosting

# Your app is now live at: https://your-project.web.app
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Users/Browsers                       │
└────────────┬──────────────────────────────────┬──────────────┘
             │                                  │
      ┌──────▼──────┐               ┌──────────▼────────┐
      │   Firebase   │               │  Google Cloud CDN  │
      │   Hosting    │               │   (Static Files)   │
      │              │               │                    │
      └──────┬───────┘               └────────────┬───────┘
             │                                    │
             └────────┬─────────────┬─────────────┘
                      │             │
                      │     CORS    │
                      ▼             ▼
            ┌─────────────────────────────┐
            │   Google Cloud Run          │
            │  (Backend API/FastAPI)      │
            │  https://earlyapp-xxx       │
            └─────────────┬───────────────┘
                          │
                    ┌─────▼─────┐
                    │  MongoDB   │
                    │   Atlas    │
                    │  (Cloud DB)│
                    └───────────┘

External Services:
├─ Firebase Cloud Messaging (FCM) - Push Notifications
├─ Google Cloud Storage - File uploads
└─ Google Cloud Logging - Monitoring
```

---

## 🚀 Complete Step-by-Step Online Deployment

### Phase 1: Account & Project Setup (30 minutes)

#### 1.1 Google Cloud Console
```
1. Go to https://console.cloud.google.com
2. Click on project selector (top left)
3. Click "NEW PROJECT"
4. Name: earlyapp-production
5. Click "CREATE"
6. Wait for project to be created
7. Select the new project
```

#### 1.2 Enable Required APIs
```bash
gcloud config set project earlyapp-production

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  storage-api.googleapis.com \
  secretmanager.googleapis.com
```

#### 1.3 Create Service Account
```bash
# Create service account
gcloud iam service-accounts create earlyapp-backend \
  --display-name "EARLYAPP Backend Service"

# Grant permissions
gcloud projects add-iam-policy-binding earlyapp-production \
  --member serviceAccount:earlyapp-backend@earlyapp-production.iam.gserviceaccount.com \
  --role roles/run.admin

gcloud projects add-iam-policy-binding earlyapp-production \
  --member serviceAccount:earlyapp-backend@earlyapp-production.iam.gserviceaccount.com \
  --role roles/storage.admin
```

#### 1.4 MongoDB Atlas Setup
```
1. Go to https://www.mongodb.com/cloud/atlas
2. Create account (or login)
3. Click "Build a Cluster"
4. Choose FREE M0 tier
5. Cloud Provider: Google Cloud
6. Region: us-central1 (or closest to you)
7. Cluster Name: earlyapp
8. Click "Create Deployment"

Configure Access:
1. Security → Database Access
2. Create Database User
   - Username: earlyapp_user
   - Password: [Generate and save it]
   - Click "Create Database User"

3. Security → Network Access
4. Click "Add IP Address"
5. Enter: 0.0.0.0/0 (Allow all)
6. Add Entry

Get Connection String:
1. Click "Clusters"
2. Click "CONNECT" button
3. Select "Connect your application"
4. Choose "Python 3.11+"
5. Copy connection string
6. Format: mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp
```

---

### Phase 2: Backend Deployment (30 minutes)

#### 2.1 Prepare Backend Code
```bash
cd backend

# Update requirements.txt
pip freeze > requirements.txt

# Ensure Dockerfile exists
cat Dockerfile
# Should contain:
# FROM python:3.11-slim
# WORKDIR /app
# COPY requirements.txt .
# RUN pip install -r requirements.txt
# COPY . .
# CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
```

#### 2.2 Set Secrets in Google Secret Manager
```bash
# Store MongoDB URL
echo -n "mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp" | \
  gcloud secrets create mongo-url --data-file=-

# Store JWT Secret
echo -n "your-super-secret-jwt-key-generate-random" | \
  gcloud secrets create jwt-secret --data-file=-

# Grant service account access
gcloud secrets add-iam-policy-binding mongo-url \
  --member serviceAccount:earlyapp-backend@earlyapp-production.iam.gserviceaccount.com \
  --role roles/secretmanager.secretAccessor
```

#### 2.3 Deploy Backend to Cloud Run
```bash
cd backend

gcloud run deploy earlyapp-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 3600 \
  --project earlyapp-production \
  --set-env-vars "ENVIRONMENT=production,DB_NAME=earlyapp" \
  --update-secrets "MONGO_URL=mongo-url:latest,JWT_SECRET=jwt-secret:latest"

# You'll see:
# Service [earlyapp-backend] revision [earlyapp-backend-00001-abc] has been deployed
# Service URL: https://earlyapp-backend-xxxxx.run.app
```

#### 2.4 Test Backend
```bash
# Get your service URL from the output above
curl https://earlyapp-backend-xxxxx.run.app/health

# Should return: {"status":"ok"}
```

#### 2.5 View Logs
```bash
# Stream logs in real-time
gcloud logging read "resource.service.name=earlyapp-backend" --stream --limit 50

# Or view in console
# https://console.cloud.google.com/run?project=earlyapp-production
```

---

### Phase 3: Firebase Hosting & Frontend Deployment (30 minutes)

#### 3.1 Create Firebase Project
```
1. Go to https://console.firebase.google.com
2. Click "Add Project"
3. Name: earlyapp-production
4. Enable Google Analytics (optional)
5. Select your Google Cloud project
6. Click "Create Project"
```

#### 3.2 Initialize Firebase in Frontend
```bash
cd frontend

# Install Firebase CLI (if not already)
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# When prompted:
# - Choose project: earlyapp-production
# - Public directory: build
# - Configure as SPA: Yes
# - Overwrite index.html: No
```

#### 3.3 Configure Frontend
Update `frontend/src/config/firebase.js`:
```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",  // From Firebase Console
  authDomain: "earlyapp-production.firebaseapp.com",
  projectId: "earlyapp-production",
  storageBucket: "earlyapp-production.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

Update `frontend/src/config/api.js` or `.env`:
```env
REACT_APP_API_URL=https://earlyapp-backend-xxxxx.run.app
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
REACT_APP_FIREBASE_PROJECT_ID=earlyapp-production
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
```

#### 3.4 Build Frontend
```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Creates optimized `build/` directory
# Size should be < 500KB (gzipped)
```

#### 3.5 Deploy Frontend to Firebase Hosting
```bash
cd frontend

# Deploy
firebase deploy --only hosting

# Output will show:
# ✔  Deploy complete!
# Project Console: https://console.firebase.google.com/project/earlyapp-production
# Hosting URL: https://earlyapp-production.web.app
```

#### 3.6 Test Frontend
Open browser: **https://earlyapp-production.web.app**

---

### Phase 4: Configure Backend for Frontend (10 minutes)

#### 4.1 Update CORS
Update `backend/server.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://earlyapp-production.web.app",
        "https://earlyapp-production.firebaseapp.com",
        "http://localhost:3000"  # for local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 4.2 Redeploy Backend with Updated CORS
```bash
cd backend

gcloud run deploy earlyapp-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --project earlyapp-production
```

---

## 🔒 Setting Up Firebase Cloud Messaging (FCM)

### Step 1: Get FCM Credentials
```
1. Go to Firebase Console → Project Settings
2. Go to "Cloud Messaging" tab
3. Copy "Server API Key"
4. Copy "Sender ID"
5. Generate "Web Push Certificate" if needed
```

### Step 2: Create Service Worker
Create `frontend/public/firebase-messaging-sw.js`:
```javascript
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  projectId: "earlyapp-production",
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

### Step 3: Request FCM Token in Frontend
```javascript
import { messaging } from '@/config/firebase';
import { getToken } from 'firebase/messaging';

export const getFCMToken = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_PUBLIC_KEY'
    });
    
    // Send to backend
    await fetch(`${API_URL}/api/fcm/save-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: userId, 
        token: token 
      })
    });
  } catch (error) {
    console.error('Failed to get FCM token:', error);
  }
};
```

---

## 📊 Monitoring Your Online App

### View Logs
```bash
# Backend logs
gcloud logging read "resource.service.name=earlyapp-backend" --stream

# All errors
gcloud logging read "severity:ERROR" --stream

# Specific time range
gcloud logging read --limit 100 --format json
```

### Check Performance
```
Google Cloud Console:
1. Cloud Run → earlyapp-backend
2. Metrics tab
3. View CPU, Memory, Requests, Latency

Firebase Console:
1. Hosting tab
2. View page views, traffic
3. Check build status
```

### View Database
```
MongoDB Atlas:
1. Dashboard → Clusters
2. Click "Collections"
3. View data in real-time

Or connect locally:
mongosh "mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp"
```

---

## 🔄 How to Update Your App Online

### Update Backend
```bash
cd backend

# Make code changes
# Update requirements.txt if needed

# Redeploy
gcloud run deploy earlyapp-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --project earlyapp-production

# Takes 2-3 minutes
```

### Update Frontend
```bash
cd frontend

# Make code changes
# Build
npm run build

# Redeploy
firebase deploy --only hosting

# Takes 30 seconds to 1 minute
```

### Push to GitHub (For Version Control)
```bash
git add .
git commit -m "Update: description of changes"
git push origin main

# Optional: Set up CI/CD to auto-deploy
# (See DEPLOYMENT_GUIDE_ONLINE.md)
```

---

## 💰 Monitoring Costs

### Google Cloud Run (Backend)
- First 2M requests/month: **FREE**
- Memory: 256MB free per month
- Typical app: **$0-20/month**

### Firebase Hosting (Frontend)
- Storage: 1GB free per month
- Bandwidth: 10GB free per month
- Typical app: **$0-5/month**

### MongoDB Atlas
- Free tier: 512MB storage, 100 connections
- Shared cluster: **$7-10/month**

### **Total**: $7-35/month for small-medium app

### View Your Costs
```
Google Cloud:
1. Billing → Cost Management
2. Set up budget alerts

Firebase:
1. Settings → Billing → Usage
2. View current month costs

MongoDB Atlas:
1. Billing → Manage Billing
2. View invoice history
```

---

## 🔗 Your Live URLs

After deployment, you'll have:

| Component | URL | Purpose |
|-----------|-----|---------|
| **Frontend** | https://earlyapp-production.web.app | Main app users access |
| **Backend API** | https://earlyapp-backend-xxxxx.run.app | API endpoints |
| **API Docs** | https://earlyapp-backend-xxxxx.run.app/docs | Swagger documentation |
| **Monitoring** | console.cloud.google.com | View logs & metrics |

---

## 🆘 Troubleshooting Online Deployment

### Backend Not Responding
```bash
# Check service status
gcloud run services list

# Check recent logs
gcloud logging read "resource.service.name=earlyapp-backend" --limit 50

# Check service is running
gcloud run services describe earlyapp-backend --platform managed --region us-central1

# Redeploy if needed
gcloud run deploy earlyapp-backend --source . --platform managed --region us-central1
```

### Frontend Not Loading
```bash
# Check hosting status
firebase hosting:list

# Check for build errors
firebase deploy --only hosting --debug

# View deployment history
firebase hosting:versions:list
```

### Database Connection Failed
```bash
# Test MongoDB connection
mongosh "mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp"

# Check IP whitelist
# MongoDB Atlas → Security → Network Access

# Check connection string
# Should have correct password and database name
```

### CORS Errors in Browser Console
```
Solution:
1. Update backend CORS config
2. Add your frontend URL to allow_origins
3. Redeploy backend
4. Clear browser cache (Ctrl+Shift+Delete)
5. Hard refresh (Ctrl+Shift+R)
```

### Slow Performance
```bash
# Check Cloud Run metrics
gcloud monitoring time-series list --filter 'metric.type="run.googleapis.com/request_latencies"'

# Increase memory if needed
gcloud run services update earlyapp-backend \
  --memory 2Gi \
  --region us-central1

# Check database query performance
# MongoDB Atlas → Performance → Query Analytics
```

---

## ✅ Verification Checklist

After deploying, verify:

- [ ] Frontend loads: https://earlyapp-production.web.app
- [ ] Backend API responds: curl https://earlyapp-backend-xxxxx.run.app/health
- [ ] Database connected: Check Cloud Run logs
- [ ] API communication works: Try logging in on frontend
- [ ] FCM notifications work: Send test notification
- [ ] Files upload/download works: Test file operations
- [ ] No CORS errors: Check browser console
- [ ] No database errors: Check Cloud Run logs
- [ ] Performance is acceptable: Load in < 3 seconds
- [ ] Mobile responsive: Test on phone

---

## 🎯 Next Steps

1. **Deploy**: Follow Phase 1-4 above (1-2 hours)
2. **Test**: Verify all features work
3. **Share URL**: Give frontend URL to users
4. **Monitor**: Check logs daily for first week
5. **Scale**: Increase resources if needed
6. **Add Domain**: Configure custom domain (optional)

---

## Quick Command Reference

```bash
# Google Cloud
gcloud config set project earlyapp-production
gcloud logging read "resource.service.name=earlyapp-backend" --stream
gcloud run deploy earlyapp-backend --source . --platform managed --region us-central1

# Firebase
firebase login
firebase init hosting
firebase deploy --only hosting
firebase open hosting:site

# MongoDB
mongosh "mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp"

# GitHub
git push origin main
```

---

**Your EARLYAPP is now running online! 🚀**

**Frontend**: https://earlyapp-production.web.app  
**Backend**: https://earlyapp-backend-xxxxx.run.app  
**Database**: MongoDB Atlas cloud

---
**Last Updated**: January 28, 2026
**Version**: 1.0 - Production Ready
