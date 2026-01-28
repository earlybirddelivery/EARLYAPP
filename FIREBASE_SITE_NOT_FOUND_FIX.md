# Firebase "Site Not Found" - Troubleshooting Guide

**Error**: "Site Not Found" on https://earlyapp-production.web.app

---

## 🔍 Quick Diagnosis (5 minutes)

### Step 1: Check if Deployment Happened
```bash
cd frontend

# List all deployments
firebase hosting:versions:list

# Should show recent deployments with dates
# If empty → deployment failed
```

### Step 2: Check Build Directory
```bash
cd frontend

# Does the build folder exist?
ls build/
# or on Windows:
dir build/

# Should show:
# index.html
# static/
# Other files

# If NOT showing → build didn't happen
```

### Step 3: Check firebase.json Configuration
```bash
cat firebase.json

# Should look like:
# {
#   "hosting": {
#     "public": "build",
#     "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
#     "rewrites": [
#       {
#         "source": "**",
#         "destination": "/index.html"
#       }
#     ]
#   }
# }
```

---

## ✅ Fix: Step-by-Step Deployment

### Step 1: Clean Install
```bash
cd frontend

# Remove old builds
rm -rf build/
rm -rf node_modules/
rm -rf .firebase/

# Clear npm cache
npm cache clean --force

# Reinstall everything
npm install

# This takes 2-3 minutes
```

### Step 2: Build for Production
```bash
cd frontend

# Build optimized version
npm run build

# Should output:
# > react-scripts build
# Compiled successfully!
# The build folder is ready to be deployed.

# Verify build exists
ls build/
# or on Windows:
dir build/
```

### Step 3: Verify Firebase Configuration
Create/Update `frontend/firebase.json`:
```json
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/static/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Step 4: Verify .firebaserc
```bash
cat .firebaserc

# Should contain:
# {
#   "projects": {
#     "default": "earlyapp-production"
#   }
# }
```

Update if wrong:
```bash
firebase use earlyapp-production
```

### Step 5: Login to Firebase
```bash
# Check if logged in
firebase login:list

# If not logged in:
firebase login

# When browser opens, sign in with your Google account
```

### Step 6: Deploy
```bash
cd frontend

# Full verbose deploy
firebase deploy --only hosting --debug

# Watch the output carefully for errors

# Should end with:
# ✔ Deploy complete!
# Project Console: https://console.firebase.google.com/project/earlyapp-production
# Hosting URL: https://earlyapp-production.web.app
```

---

## 🔧 If Deploy Still Fails

### Error: "Could not find the default App"
```bash
# Solution: Initialize Firebase
firebase init hosting

# When prompted:
# - Use existing project: earlyapp-production
# - Public directory: build
# - Configure as SPA: Yes
# - Overwrite: No
```

### Error: "Permission denied"
```bash
# Check if you're logged in
firebase login

# Check project access
firebase projects:list

# Make sure earlyapp-production is listed
```

### Error: "Cannot find module"
```bash
# Reinstall dependencies
npm cache clean --force
rm package-lock.json
npm install
npm run build
```

### Error: "build folder not found"
```bash
# Check if build was created
npm run build

# Verify it exists
ls -la build/
# or on Windows:
dir build/

# If still empty, check for build errors
npm run build 2>&1 | tail -50
```

---

## 📋 Complete Deployment Checklist

Before deploying, verify ALL of these:

- [ ] You're in `frontend/` directory
- [ ] You have `.firebaserc` file
- [ ] `.firebaserc` has correct project ID: earlyapp-production
- [ ] You have `firebase.json` file
- [ ] `firebase.json` has `"public": "build"`
- [ ] `npm install` completed successfully
- [ ] `npm run build` completed without errors
- [ ] `build/` folder exists and contains `index.html`
- [ ] You're logged in: `firebase login:list` shows your email
- [ ] Backend API URL is configured in React app
- [ ] No CORS errors in browser console (F12)

---

## 🚀 Quick Deploy Command

If everything above is set up:
```bash
cd frontend && npm install && npm run build && firebase deploy --only hosting
```

This runs all steps in sequence.

---

## 🔗 Verify Deployment Worked

### 1. Check Hosting Console
```
1. Go to Firebase Console: https://console.firebase.google.com
2. Select project: earlyapp-production
3. Go to Hosting
4. Look for recent deployment (green checkmark means success)
5. Click on deployment to see details
```

### 2. Check Live URL
```bash
# Open in browser
firebase open hosting:site

# Or manually visit
https://earlyapp-production.web.app
```

### 3. Check Website Loads
- Page should load (not 404 error)
- Check browser console (F12 → Console tab)
- Look for any red errors

### 4. Verify API Connection
In browser console, test:
```javascript
fetch('https://earlyapp-backend-xxxxx.run.app/health')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error('API Error:', e))
```

Should see: `{status: 'ok'}`

If CORS error appears:
```
❌ Problem: Backend doesn't allow your frontend URL
✅ Solution: Update backend CORS and redeploy backend
```

---

## 📊 Status Verification

### Check Deployment Status
```bash
firebase hosting:list

# Shows all sites and status
```

### View Recent Deployments
```bash
firebase hosting:versions:list

# Shows history with timestamps
```

### View Logs
```bash
firebase hosting:log

# Shows activity log
```

---

## 🆘 If Still Not Working

### Option 1: Clear Everything and Restart
```bash
cd frontend

# Remove everything
rm -rf build node_modules .firebase

# Start fresh
npm install
npm run build
firebase deploy --only hosting --debug

# Watch the output for errors
```

### Option 2: Use Alternative Deployment
```bash
# Deploy directly without build
firebase deploy --only hosting --force

# Or clear hosting and redeploy
firebase hosting:disable
# Wait 5 minutes
firebase deploy --only hosting
```

### Option 3: Check Detailed Logs
```bash
# See what went wrong
firebase deploy --only hosting --debug 2>&1 | grep -i error

# or on Windows PowerShell
firebase deploy --only hosting --debug 2>&1 | Select-String -Pattern "error"
```

---

## 📝 Complete Fresh Deployment

If nothing works, do a complete fresh deployment:

### Step 1: Backup Current Code
```bash
# Make sure your code is safe
git status
git add .
git commit -m "backup before fresh deployment"
git push origin main
```

### Step 2: Complete Fresh Build
```bash
cd frontend

# Remove everything
rm -rf build node_modules package-lock.json .firebase

# Reinstall
npm install

# Build
npm run build

# Verify
ls build/index.html
```

### Step 3: Fresh Firebase Init
```bash
cd frontend

# Remove old config
rm .firebaserc

# Reinitialize
firebase init hosting

# When asked:
# - Use existing project? → Yes: earlyapp-production
# - What's your public directory? → build
# - Configure as single-page app? → Yes
# - Set up automatic builds? → No (we'll do it manually)
# - Overwrite index.html? → No
```

### Step 4: Deploy
```bash
firebase deploy --only hosting

# Watch for success message
```

---

## ✅ Success Indicators

You've succeeded when you see:

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/earlyapp-production
Hosting URL: https://earlyapp-production.web.app
```

And when you visit the URL:
- ✅ Page loads (not blank)
- ✅ No "Site Not Found" error
- ✅ No console errors (F12)
- ✅ App is interactive

---

## 🎯 Common Mistakes to Avoid

❌ **Mistake**: Deploy from wrong directory
✅ **Fix**: Always `cd frontend` before deploying

❌ **Mistake**: Forget to run `npm run build`
✅ **Fix**: Always build before deploy: `npm run build && firebase deploy`

❌ **Mistake**: Deploy empty build directory
✅ **Fix**: Verify `build/index.html` exists

❌ **Mistake**: Wrong Firebase project
✅ **Fix**: Check `.firebaserc` has `earlyapp-production`

❌ **Mistake**: Not logged in to Firebase
✅ **Fix**: Run `firebase login`

---

## 🔗 Useful Commands

```bash
# Check what's happening
firebase hosting:versions:list     # See deployments
firebase open hosting:site         # Open in browser
firebase hosting:log              # See logs
firebase use                       # Check current project

# Deploy commands
firebase deploy --only hosting                    # Normal deploy
firebase deploy --only hosting --debug            # Verbose
firebase deploy --only hosting --force            # Force overwrite

# Help
firebase help deploy              # Get help
firebase deploy --help            # See options
```

---

## 📞 Quick Support

**If you see "Site Not Found":**

1. Run: `firebase hosting:versions:list`
2. If no recent deployments → run: `firebase deploy --only hosting`
3. If still fails → run: `firebase deploy --only hosting --debug` and send output
4. Check browser console (F12) for errors
5. Try: `rm -rf build && npm run build && firebase deploy`

---

## ✨ Next Steps

1. Follow the **"Fix: Step-by-Step Deployment"** section above
2. Verify using **"Status Verification"** section
3. Test using **"Success Indicators"** section
4. You should see your app live!

---

**Your app will be live soon! 🚀**

---
**Last Updated**: January 28, 2026
