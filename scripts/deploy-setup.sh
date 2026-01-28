#!/bin/bash
# EARLYAPP Deployment Setup Script
# Run this script to automate Google Cloud and MongoDB setup

set -e

echo "======================================"
echo "EARLYAPP Online Deployment Setup"
echo "======================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}gcloud CLI not found. Please install from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}Firebase CLI not found. Installing...${NC}"
    npm install -g firebase-tools
fi

echo -e "${GREEN}✓ Prerequisites installed${NC}"

# Step 2: Google Cloud Setup
echo -e "${BLUE}Step 2: Setting up Google Cloud...${NC}"

read -p "Enter your GCP Project ID (e.g., earlyapp-production): " GCP_PROJECT_ID
read -p "Enter desired region (e.g., us-central1): " GCP_REGION

gcloud config set project $GCP_PROJECT_ID

echo "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  storage-api.googleapis.com \
  secretmanager.googleapis.com

echo -e "${GREEN}✓ Google Cloud APIs enabled${NC}"

# Step 3: Create service account
echo -e "${BLUE}Step 3: Creating service account...${NC}"

gcloud iam service-accounts create earlyapp-backend \
  --display-name="EARLYAPP Backend Service Account" || true

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member=serviceAccount:earlyapp-backend@${GCP_PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/run.admin

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member=serviceAccount:earlyapp-backend@${GCP_PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/storage.admin

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member=serviceAccount:earlyapp-backend@${GCP_PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/secretmanager.admin

echo -e "${GREEN}✓ Service account created with permissions${NC}"

# Step 4: MongoDB Setup Instructions
echo -e "${BLUE}Step 4: MongoDB Atlas Setup (Manual Steps)${NC}"
echo ""
echo "Please complete these steps manually:"
echo "1. Go to https://www.mongodb.com/cloud/atlas"
echo "2. Create a new cluster in region: $GCP_REGION"
echo "3. Create database user: earlyapp_user"
echo "4. Get connection string (mongodb+srv://...)"
echo "5. Add IP whitelist: 0.0.0.0/0 (or specific IPs)"
echo ""
read -p "Press Enter once MongoDB cluster is ready and you have the connection string..."

# Step 5: Store secrets
echo -e "${BLUE}Step 5: Storing secrets in Google Secret Manager...${NC}"

read -s -p "Enter MongoDB Connection URL: " MONGO_URL
echo
gcloud secrets create mongo-url --data-file=- <<< "$MONGO_URL"

read -s -p "Enter JWT Secret: " JWT_SECRET
echo
gcloud secrets create jwt-secret --data-file=- <<< "$JWT_SECRET"

read -s -p "Enter FCM Server Key (optional, press Enter to skip): " FCM_KEY
if [ ! -z "$FCM_KEY" ]; then
  echo
  gcloud secrets create fcm-server-key --data-file=- <<< "$FCM_KEY"
fi

echo -e "${GREEN}✓ Secrets stored in Google Secret Manager${NC}"

# Step 6: Firebase Setup
echo -e "${BLUE}Step 6: Setting up Firebase...${NC}"

read -p "Enter Firebase Project ID: " FIREBASE_PROJECT_ID

firebase use $FIREBASE_PROJECT_ID

echo -e "${GREEN}✓ Firebase project configured${NC}"

# Step 7: Create environment files
echo -e "${BLUE}Step 7: Creating environment configuration files...${NC}"

cat > backend/.env.production <<EOF
MONGO_URL=$MONGO_URL
DB_NAME=earlyapp
JWT_SECRET=$JWT_SECRET
ENVIRONMENT=production
GCP_PROJECT_ID=$GCP_PROJECT_ID
REGION=$GCP_REGION
EOF

cat > frontend/.env.production <<EOF
REACT_APP_API_URL=https://earlyapp-backend-${GCP_PROJECT_ID}.run.app
REACT_APP_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
REACT_APP_ENVIRONMENT=production
EOF

echo -e "${GREEN}✓ Environment files created${NC}"

# Step 8: Summary
echo ""
echo -e "${BLUE}======================================"
echo "Deployment Setup Complete!"
echo "======================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update Firebase config in frontend/src/config/firebase.js"
echo "2. Deploy backend: cd backend && gcloud run deploy earlyapp-backend --source ."
echo "3. Build frontend: cd frontend && npm run build"
echo "4. Deploy frontend: firebase deploy --only hosting"
echo ""
echo "GCP Project: $GCP_PROJECT_ID"
echo "Firebase Project: $FIREBASE_PROJECT_ID"
echo "Region: $GCP_REGION"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
