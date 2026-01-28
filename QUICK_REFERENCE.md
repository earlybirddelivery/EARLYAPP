# EARLYAPP Deployment - Quick Reference Card

## Current Status: Frontend Live ✅

**Frontend URL**: https://earlybird-delivery-ap.web.app

---

## Three Steps to Complete Deployment

### Step 1: MongoDB Atlas (15 min)
```
Go to: https://www.mongodb.com/cloud/atlas
1. Sign up (free account)
2. Create M0 cluster
3. Create user: earlyapp_user
4. Get connection string
5. Save: mongodb+srv://earlyapp_user:PASSWORD@cluster0-xxxxx.mongodb.net/earlyapp?retryWrites=true&w=majority
```

**See**: MONGODB_SETUP_GUIDE.md

---

### Step 2: Backend Deployment (20 min)

#### Windows Users:
```batch
cd scripts
deploy-backend-auto.bat
```
Then enter:
- GCP Project ID: earlyapp-backend
- MongoDB URI: (from Step 1)
- JWT Secret: (any 32+ char string)
- Firebase Project ID: earlybird-delivery-ap

#### Mac/Linux Users:
```bash
chmod +x scripts/deploy-backend-auto.sh
./scripts/deploy-backend-auto.sh
```

#### Manual (if scripts don't work):
```bash
gcloud run deploy earlyapp-backend \
  --source ./backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi
```

**Save the Backend URL**: https://earlyapp-backend-xxxxx.a.run.app

**See**: DEPLOYMENT_COMPLETE_GUIDE.md

---

### Step 3: Firebase Cloud Messaging (10 min)

1. Go to: https://console.firebase.google.com
2. Select: earlybird-delivery-ap
3. Click: Cloud Messaging tab
4. Copy: Server API Key
5. Copy: VAPID Key (generate if needed)
6. Add to backend `.env`:
   ```
   FCM_SERVER_API_KEY=AAAA...
   ```
7. Add to frontend `.env`:
   ```
   REACT_APP_FCM_VAPID_KEY=BCxxx...
   ```

**See**: FCM_SETUP_GUIDE.md

---

## Required Environment Variables

### Backend
```
MONGODB_URI=<from Step 1>
JWT_SECRET_KEY=<any 32+ chars>
FIREBASE_PROJECT_ID=earlybird-delivery-ap
FCM_SERVER_API_KEY=<from Step 3>
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=https://earlybird-delivery-ap.web.app
```

### Frontend
```
REACT_APP_API_URL=<Backend URL from Step 2>
REACT_APP_FIREBASE_PROJECT_ID=earlybird-delivery-ap
REACT_APP_FCM_VAPID_KEY=<from Step 3>
```

---

## Useful Commands

### Check Backend Logs
```bash
gcloud run logs read earlyapp-backend --limit 50
```

### Test Backend Health
```bash
curl https://earlyapp-backend-xxxxx.a.run.app/health
```

### Rebuild & Redeploy Frontend
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Check Frontend Build Status
```bash
cd frontend
ls -la build/
```

---

## Useful Links

- Firebase Console: https://console.firebase.google.com
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Google Cloud: https://console.cloud.google.com
- GitHub: https://github.com/earlybirddelivery/EARLYAPP
- Live App: https://earlybird-delivery-ap.web.app

---

## Firebase Project IDs

```
Firebase Project ID: earlybird-delivery-ap
Google Cloud Project: earlyapp-backend
```

---

## Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Backend won't deploy | Check: DEPLOYMENT_COMPLETE_GUIDE.md PART 2 |
| MongoDB won't connect | Check: MONGODB_SETUP_GUIDE.md Troubleshooting |
| FCM not working | Check: FCM_SETUP_GUIDE.md Troubleshooting |
| Frontend shows Site Not Found | Already live! https://earlybird-delivery-ap.web.app |
| API errors | Check: Cloud Run logs with `gcloud run logs read` |

---

## MongoDB Connection String Format

```
mongodb+srv://earlyapp_user:PASSWORD@cluster0-xxxxx.mongodb.net/earlyapp?retryWrites=true&w=majority
```

**Replace**:
- PASSWORD: Your actual password (no special chars without encoding)
- cluster0-xxxxx: Your cluster name from MongoDB

---

## Backend Deployment Options

1. **Automated Script** (Easiest)
   - Windows: `scripts/deploy-backend-auto.bat`
   - Mac/Linux: `scripts/deploy-backend-auto.sh`

2. **Manual gcloud** (More control)
   - `gcloud run deploy earlyapp-backend --source ./backend --platform managed --region us-central1 --allow-unauthenticated`

3. **Google Cloud Console** (Web UI)
   - https://console.cloud.google.com/run

---

## Estimated Timeline

| Task | Time | Status |
|------|------|--------|
| Frontend | ✅ Done | 30 min |
| MongoDB | ⏳ Next | 15 min |
| Backend | ⏳ After | 20 min |
| FCM | ⏳ Last | 10 min |
| Testing | ⏳ Final | 15 min |
| **Total** | | **~90 min** |

---

## Can't Use Command Line?

Use these web interfaces instead:

1. **MongoDB**: https://www.mongodb.com/cloud/atlas (web console)
2. **Backend**: https://console.cloud.google.com/run (Google Cloud console)
3. **FCM**: https://console.firebase.google.com (Firebase console)
4. **Frontend**: Already live! https://earlybird-delivery-ap.web.app

---

## Remember

✅ Keep passwords and API keys secret
✅ Use environment variables, not hardcoded values
✅ Don't commit `.env` files to GitHub
✅ Save connection strings in secure location
✅ Use strong passwords (16+ characters)

---

**All guides available in repository root directory**

Next: Start with MONGODB_SETUP_GUIDE.md
