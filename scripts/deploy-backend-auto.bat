@echo off
REM EARLYAPP - Backend Deployment for Windows
REM This script deploys backend to Google Cloud Run

setlocal enabledelayedexpansion

echo.
echo ================================
echo EARLYAPP Backend Deployment
echo ================================
echo.

REM Check if gcloud is installed
gcloud --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: gcloud CLI is not installed
    echo Install from: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

echo Step 1: Authenticating with Google Cloud...
gcloud auth login
if %errorlevel% neq 0 exit /b 1
echo [OK] Authenticated
echo.

set /p PROJECT_ID="Enter Google Cloud Project ID (e.g., earlyapp-backend): "
gcloud config set project %PROJECT_ID%
if %errorlevel% neq 0 exit /b 1
echo [OK] Project set to: %PROJECT_ID%
echo.

echo Step 2: Enabling required APIs...
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
echo [OK] APIs enabled
echo.

echo Step 3: Setting up environment variables...
set /p MONGODB_URI="Enter MongoDB URI: "
set /p JWT_SECRET="Enter JWT Secret Key (min 32 chars): "
set /p FIREBASE_PROJECT="Enter Firebase Project ID: "
echo.

echo Step 4: Building and deploying to Cloud Run...
echo This may take 5-10 minutes on first deploy...
echo.

REM Deploy to Cloud Run
cd /d "%~dp0..\backend"
gcloud run deploy earlyapp-backend ^
  --source . ^
  --platform managed ^
  --region us-central1 ^
  --allow-unauthenticated ^
  --memory 512Mi ^
  --cpu 1 ^
  --timeout 3600 ^
  --set-env-vars MONGODB_URI="%MONGODB_URI%",JWT_SECRET_KEY="%JWT_SECRET%",FIREBASE_PROJECT_ID="%FIREBASE_PROJECT%",ENVIRONMENT="production",DEBUG="False"

if %errorlevel% neq 0 exit /b 1

echo.
echo ================================
echo [OK] Backend deployed successfully!
echo ================================
echo.

REM Get the service URL
for /f "delims=" %%i in ('gcloud run services describe earlyapp-backend --region us-central1 --format="value(status.url)"') do set SERVICE_URL=%%i

echo Backend URL: %SERVICE_URL%
echo.
echo Next steps:
echo 1. Update frontend config with backend URL
echo 2. Set up MongoDB Atlas
echo 3. Configure Firebase Cloud Messaging
echo.
echo See DEPLOYMENT_COMPLETE_GUIDE.md for full instructions
echo.
pause
