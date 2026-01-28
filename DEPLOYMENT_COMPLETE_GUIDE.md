# Complete Deployment Guide - MongoDB, Backend, FCM

## Current Status
✅ **Frontend**: Live on Firebase Hosting
- URL: https://earlybird-delivery-ap.web.app
- Build deployed successfully

⏳ **Database**: MongoDB Atlas (Need to set up)
⏳ **Backend**: Google Cloud Run (Ready to deploy)
⏳ **Notifications**: Firebase Cloud Messaging (Ready to configure)

---

## PART 1: MONGODB ATLAS SETUP (15 minutes)

### Step 1: Create MongoDB Atlas Account
1. Go to: https://www.mongodb.com/cloud/atlas
2. Click **Try Free**
3. Sign up with Google or email
4. Verify email

### Step 2: Create a Cluster
1. Click **Create** cluster
2. Select **M0 FREE** tier (good for testing)
3. Choose **AWS** provider and closest region
4. Click **Create Cluster** (takes ~5 minutes)

### Step 3: Set Up Database Access
1. Go to **Database Access** tab
2. Click **Add New Database User**
3. Create username: `earlyapp_user`
4. Set password: (save this securely!)
5. Select role: **Read and write to any database**
6. Click **Add User**

### Step 4: Set Up Network Access
1. Go to **Network Access** tab
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere**
   - CIDR Block: `0.0.0.0/0` (for testing only)
   - Note: For production, restrict to your backend's IP
4. Click **Confirm**

### Step 5: Get Connection String
1. Go to **Databases** tab
2. Click **Connect** on your cluster
3. Click **Drivers**
4. Select **Node.js** and version **5.x**
5. Copy the connection string
6. Replace:
   - `<username>` → `earlyapp_user`
   - `<password>` → Your password (from Step 3)
   - `<database>` → `earlyapp`

**Your connection string will look like:**
```
mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp?retryWrites=true&w=majority
```

**Save this! You'll need it for backend deployment.**

---

## PART 2: BACKEND DEPLOYMENT TO GOOGLE CLOUD RUN (20 minutes)

### Prerequisites
- Google Cloud Account with billing enabled
- `gcloud` CLI installed
- Backend code in `backend/` folder ✅

### Step 1: Create Google Cloud Project
1. Go to: https://console.cloud.google.com
2. Click **Select a Project** → **New Project**
3. Project name: `earlyapp-backend`
4. Click **Create**
5. Wait for project to be created
6. Select the new project

### Step 2: Enable Required APIs
1. Search for **Cloud Run**
2. Click **Enable**
3. Wait for API to enable
4. Search for **Cloud Build**
5. Click **Enable**
6. Search for **Container Registry**
7. Click **Enable**

### Step 3: Set Up Service Account
1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Service account name: `earlyapp-sa`
4. Click **Create and Continue**
5. Grant role: **Editor** (for development)
6. Click **Continue** → **Done**

### Step 4: Create Service Account Key
1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON**
5. Click **Create**
6. Save the JSON file securely (this is your credentials)

### Step 5: Set Environment Variables

Create `.env.gcp` file in your backend folder:
```bash
# MongoDB
MONGODB_URI=mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp?retryWrites=true&w=majority

# JWT
JWT_SECRET_KEY=your-secret-key-min-32-characters-long-here

# Firebase
FIREBASE_PROJECT_ID=earlybird-delivery-ap
FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN=earlybird-delivery-ap.firebaseapp.com

# Google Cloud
GCP_PROJECT_ID=earlyapp-backend

# Environment
ENVIRONMENT=production
DEBUG=False
```

### Step 6: Deploy Backend to Cloud Run

**Using gcloud CLI:**
```bash
cd backend

# Authenticate with gcloud
gcloud auth login

# Set project
gcloud config set project earlyapp-backend

# Build and deploy to Cloud Run
gcloud run deploy earlyapp-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --set-env-vars MONGODB_URI=$MONGODB_URI,JWT_SECRET_KEY=$JWT_SECRET_KEY,FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
```

**Expected output:**
```
Service [earlyapp-backend] deployed successfully.
Service URL: https://earlyapp-backend-xxxxx.a.run.app
```

**Save your backend URL!** (You'll need it in frontend)

### Step 7: Update Frontend with Backend URL

Edit `frontend/src/config/api.js`:
```javascript
const API_BASE_URL = 'https://earlyapp-backend-xxxxx.a.run.app';
```

Then rebuild and redeploy frontend:
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## PART 3: FIREBASE CLOUD MESSAGING (FCM) SETUP (10 minutes)

### Step 1: Get FCM Credentials
1. Go to: https://console.firebase.google.com
2. Select **earlybird-delivery-ap** project
3. Go to **Project Settings** (gear icon)
4. Click **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file securely
7. Copy **Server API Key** from top of page

### Step 2: Configure FCM in Backend

Add to `.env.gcp`:
```
FCM_SERVER_API_KEY=your-server-api-key-from-step-1
```

### Step 3: Enable Cloud Messaging
1. In Firebase Console, go to **Cloud Messaging** tab
2. Click **Enable** if not already enabled
3. Note your **Sender ID** (you'll need this in app)

### Step 4: Configure Frontend for FCM

Edit `frontend/src/config/firebase.js`:
```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "earlybird-delivery-ap.firebaseapp.com",
  projectId: "earlybird-delivery-ap",
  storageBucket: "earlybird-delivery-ap.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const FCM_VAPID_KEY = "YOUR_VAPID_KEY";
```

**Get these values from Firebase Console > Project Settings > General tab**

---

## PART 4: ENVIRONMENT VARIABLES SUMMARY

### Frontend `.env` (if using env files)
```
REACT_APP_API_URL=https://earlyapp-backend-xxxxx.a.run.app
REACT_APP_FIREBASE_PROJECT_ID=earlybird-delivery-ap
REACT_APP_FCM_VAPID_KEY=YOUR_VAPID_KEY
```

### Backend `.env`
```
MONGODB_URI=mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp?retryWrites=true&w=majority
JWT_SECRET_KEY=min-32-character-random-string-here
FIREBASE_PROJECT_ID=earlybird-delivery-ap
FIREBASE_API_KEY=YOUR_API_KEY
FIREBASE_AUTH_DOMAIN=earlybird-delivery-ap.firebaseapp.com
FCM_SERVER_API_KEY=YOUR_SERVER_API_KEY
GCP_PROJECT_ID=earlyapp-backend
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=https://earlybird-delivery-ap.web.app
```

---

## PART 5: DEPLOYMENT VERIFICATION CHECKLIST

After all deployments:

- [ ] Frontend loads at https://earlybird-delivery-ap.web.app
- [ ] Backend is responding at https://earlyapp-backend-xxxxx.a.run.app/health
- [ ] MongoDB connection works (check backend logs)
- [ ] Firebase Auth is enabled in console
- [ ] FCM is configured and enabled
- [ ] Environment variables are set in all services
- [ ] CORS is configured in backend for frontend domain
- [ ] API routes are accessible from frontend
- [ ] Push notifications can be sent (test from console)

---

## PART 6: TROUBLESHOOTING

### Backend deployment fails
```bash
# Check logs
gcloud run logs read earlyapp-backend

# Check service account permissions
gcloud projects get-iam-policy earlyapp-backend
```

### MongoDB connection fails
- Verify credentials in `.env`
- Check IP whitelist includes Cloud Run IPs
- Test connection string locally first

### FCM not working
- Verify VAPID key in frontend
- Check Server API Key in backend
- Ensure service worker is registered
- Check browser console for errors (F12)

### Frontend can't reach backend
- Verify backend URL in frontend config
- Check CORS headers in backend
- Verify backend is public (not private)
- Check Cloud Run service has `--allow-unauthenticated`

---

## NEXT STEPS

1. Set up MongoDB Atlas (15 min)
2. Deploy backend to Cloud Run (20 min)
3. Configure FCM (10 min)
4. Test end-to-end integration (15 min)

**Total estimated time: ~60 minutes**

All steps are designed to work without network interruptions. If errors occur, refer to troubleshooting section.
