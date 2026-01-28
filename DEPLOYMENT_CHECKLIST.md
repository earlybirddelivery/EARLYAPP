# Deployment Checklist for EARLYAPP Online

## Pre-Deployment (Before Going Live)

### Step 1: Accounts & Projects Created
- [ ] Google Cloud Project created (`earlyapp-production`)
- [ ] Firebase Project created (`earlyapp-production`)
- [ ] MongoDB Atlas account created
- [ ] MongoDB Cluster created and ready
- [ ] GitHub repository is public

### Step 2: Authentication & Access
- [ ] Google Cloud Service Account created
- [ ] Service Account JSON key downloaded and secured
- [ ] MongoDB database user created
- [ ] Firebase Admin SDK configured
- [ ] GitHub personal access token generated

### Step 3: Environment Configuration
- [ ] MongoDB connection string obtained
- [ ] Firebase config keys copied
- [ ] FCM VAPID key generated
- [ ] JWT secret key created
- [ ] API keys restricted to appropriate origins

### Step 4: Backend Preparation
- [ ] `backend/requirements.txt` updated
- [ ] `backend/Dockerfile` verified
- [ ] `backend/.dockerignore` created
- [ ] Database migration scripts tested locally
- [ ] Backend tested with MongoDB Atlas connection
- [ ] CORS configuration updated in `backend/server.py`

### Step 5: Frontend Preparation
- [ ] `frontend/src/config/firebase.js` updated with production config
- [ ] `.firebaserc` configured with production project
- [ ] `firebase.json` configured correctly
- [ ] `frontend/public/firebase-messaging-sw.js` created
- [ ] `frontend/src/utils/fcm.js` implemented
- [ ] API endpoint configuration pointing to Cloud Run service
- [ ] Build tested: `npm run build`
- [ ] PWA manifest updated with correct URLs

### Step 6: Google Cloud Configuration
- [ ] Cloud Run API enabled
- [ ] Cloud Build API enabled
- [ ] Container Registry enabled
- [ ] Storage API enabled
- [ ] Secret Manager enabled
- [ ] Secrets stored in Secret Manager:
  - [ ] `mongo-url`
  - [ ] `jwt-secret`
  - [ ] `fcm-server-key`

### Step 7: Deployment Scripts
- [ ] `Dockerfile` working locally
- [ ] Docker image builds successfully: `docker build -t earlyapp-backend .`
- [ ] Container runs locally: `docker run -p 8080:8080 earlyapp-backend`
- [ ] Cloud Build configuration prepared

### Step 8: Security Review
- [ ] No hardcoded secrets in code
- [ ] Environment variables properly sourced
- [ ] Firebase security rules configured
- [ ] Firestore rules configured (if using)
- [ ] Storage bucket rules configured
- [ ] API authentication enabled
- [ ] Rate limiting configured
- [ ] HTTPS enforced everywhere
- [ ] CORS origin list accurate
- [ ] Database access limited to app service account

### Step 9: Testing
- [ ] Backend builds and runs locally
- [ ] Backend connects to MongoDB Atlas
- [ ] Frontend builds successfully
- [ ] Frontend imports Firebase correctly
- [ ] API endpoints return expected responses
- [ ] Authentication flow works end-to-end
- [ ] FCM token requests work
- [ ] File uploads work (if applicable)
- [ ] Database queries perform well

### Step 10: Monitoring Setup
- [ ] Google Cloud Logging configured
- [ ] Cloud Monitoring alerts created
- [ ] Firebase Analytics enabled
- [ ] Error tracking configured
- [ ] Performance monitoring enabled

---

## Deployment Phase

### Backend Deployment
```bash
cd backend
gcloud run deploy earlyapp-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi
```

**Checklist**:
- [ ] Deployment command executed successfully
- [ ] Cloud Run service URL obtained
- [ ] Health check endpoint responds
- [ ] Logs show no critical errors
- [ ] Service is publicly accessible
- [ ] Database connection verified in logs

### Frontend Deployment
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

**Checklist**:
- [ ] Build completes without errors
- [ ] Build outputs correct files
- [ ] Deployment command succeeds
- [ ] Firebase Hosting URL works
- [ ] All pages load correctly
- [ ] API calls reach backend successfully

---

## Post-Deployment Verification

### Backend Verification
- [ ] Health check endpoint responds: `GET /health`
- [ ] Database operations work
- [ ] Authentication works
- [ ] All major endpoints tested
- [ ] Error handling works
- [ ] Logs are readable and useful
- [ ] Performance is acceptable
- [ ] Cold start time is reasonable

### Frontend Verification
- [ ] Home page loads
- [ ] Login page works
- [ ] API calls successful
- [ ] FCM notifications working
- [ ] File uploads functional
- [ ] PWA works offline (if applicable)
- [ ] Mobile responsive
- [ ] All forms submit correctly
- [ ] No console errors

### Integration Tests
- [ ] User registration works end-to-end
- [ ] Login and authentication flows
- [ ] Data persistence across refreshes
- [ ] Notifications sent and received
- [ ] File operations work
- [ ] Search functionality operational
- [ ] Payments (if applicable)

### Security Verification
- [ ] No sensitive data exposed in logs
- [ ] API authentication enforced
- [ ] CORS headers correct
- [ ] SSL/TLS certificates valid
- [ ] Database credentials not exposed
- [ ] API keys restricted correctly

---

## Performance & Optimization

### Backend
- [ ] Cold start time < 10 seconds
- [ ] Average response time < 500ms
- [ ] Database query times optimized
- [ ] Connection pooling configured
- [ ] Caching implemented where appropriate
- [ ] Memory usage stable

### Frontend
- [ ] Bundle size < 500KB (gzipped)
- [ ] Core Web Vitals metrics:
  - [ ] LCP (Largest Contentful Paint) < 2.5s
  - [ ] FID (First Input Delay) < 100ms
  - [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] Images optimized
- [ ] Unused code removed
- [ ] Code splitting implemented

### Database
- [ ] Indexes created on frequently queried fields
- [ ] Query performance monitored
- [ ] Connection pooling configured
- [ ] Backups automated

---

## Documentation

### Created Documentation
- [ ] Deployment guide updated
- [ ] Environment setup documented
- [ ] API documentation generated
- [ ] Troubleshooting guide created
- [ ] Runbook for common issues
- [ ] Architecture diagram updated

### Team Communication
- [ ] Team notified of deployment
- [ ] Access credentials shared securely
- [ ] Deployment notes documented
- [ ] Post-mortem items tracked

---

## Ongoing Monitoring

### Daily Checks
- [ ] System status dashboard monitored
- [ ] Error rates normal
- [ ] Performance metrics normal
- [ ] Logs reviewed for issues

### Weekly Reviews
- [ ] Cost analysis reviewed
- [ ] Performance trends examined
- [ ] User feedback addressed
- [ ] Security updates applied

### Monthly Reviews
- [ ] Infrastructure scaling needs assessed
- [ ] Database optimization opportunities
- [ ] New feature deployment planning
- [ ] Disaster recovery procedures tested

---

## Rollback Procedures Ready

### Backend Rollback
- [ ] Previous Cloud Run revision documented
- [ ] Rollback command tested
- [ ] Database migration reversals prepared
- [ ] Team trained on rollback procedure

### Frontend Rollback
- [ ] Previous Firebase Hosting deploy available
- [ ] Rollback command tested
- [ ] Cache invalidation strategy known
- [ ] CDN purge procedure ready

---

## Sign-Off

**Date**: _______________
**Deployed By**: _______________
**Reviewed By**: _______________
**Status**: [ ] Production Ready  [ ] Issues Found

**Notes**:
________________________________
________________________________
________________________________

---

**Keep this checklist for reference!**
Update it with lessons learned from the deployment.
