#!/bin/bash

# EARLYAPP - Complete Backend Deployment Script
# This script deploys backend to Google Cloud Run automatically

set -e  # Exit on any error

echo "================================"
echo "EARLYAPP Backend Deployment"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo -e "${YELLOW}Step 1: Authenticating with Google Cloud...${NC}"
gcloud auth login || exit 1
echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Get project ID
read -p "Enter your Google Cloud Project ID (e.g., earlyapp-backend): " PROJECT_ID
gcloud config set project $PROJECT_ID || exit 1
echo -e "${GREEN}✓ Project set to: $PROJECT_ID${NC}"
echo ""

echo -e "${YELLOW}Step 2: Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com || exit 1
gcloud services enable cloudbuild.googleapis.com || exit 1
echo -e "${GREEN}✓ APIs enabled${NC}"
echo ""

echo -e "${YELLOW}Step 3: Setting up environment variables...${NC}"
read -p "Enter MongoDB URI: " MONGODB_URI
read -p "Enter JWT Secret Key (min 32 chars): " JWT_SECRET
read -p "Enter Firebase Project ID: " FIREBASE_PROJECT
echo ""

echo -e "${YELLOW}Step 4: Building and deploying to Cloud Run...${NC}"
echo "This may take 5-10 minutes on first deploy..."
echo ""

gcloud run deploy earlyapp-backend \
  --source ./backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --set-env-vars \
    MONGODB_URI="$MONGODB_URI",\
    JWT_SECRET_KEY="$JWT_SECRET",\
    FIREBASE_PROJECT_ID="$FIREBASE_PROJECT",\
    ENVIRONMENT="production",\
    DEBUG="False" \
  || exit 1

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Backend deployed successfully!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe earlyapp-backend --region us-central1 --format='value(status.url)')
echo -e "${YELLOW}Backend URL:${NC} $SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Update frontend config with backend URL"
echo "2. Set up MongoDB Atlas"
echo "3. Configure Firebase Cloud Messaging"
echo ""
echo "See DEPLOYMENT_COMPLETE_GUIDE.md for full instructions"
