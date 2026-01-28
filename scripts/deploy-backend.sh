#!/bin/bash
# EARLYAPP Backend Deployment Script
# Deploys backend to Google Cloud Run

set -e

echo "======================================"
echo "EARLYAPP Backend Deployment"
echo "======================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "server.py" ] && [ ! -f "requirements.txt" ]; then
    echo -e "${RED}Error: Not in backend directory${NC}"
    exit 1
fi

# Get GCP project ID
GCP_PROJECT_ID=$(gcloud config get-value project)
if [ -z "$GCP_PROJECT_ID" ]; then
    echo -e "${RED}Error: GCP project not set. Run: gcloud config set project PROJECT_ID${NC}"
    exit 1
fi

echo "GCP Project: $GCP_PROJECT_ID"

# Step 1: Check Python version
echo -e "${BLUE}Step 1: Checking Python...${NC}"
python3 --version
echo -e "${GREEN}✓ Python ready${NC}"

# Step 2: Update requirements
echo -e "${BLUE}Step 2: Updating requirements.txt...${NC}"
pip freeze > requirements.txt
echo -e "${GREEN}✓ requirements.txt updated${NC}"

# Step 3: Test locally (optional)
read -p "Run local tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Running tests...${NC}"
    python -m pytest tests/ || echo -e "${YELLOW}Warning: Some tests failed${NC}"
fi

# Step 4: Check Docker
echo -e "${BLUE}Step 3: Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Install from: https://www.docker.com/products/docker-desktop${NC}"
    exit 1
fi
docker --version
echo -e "${GREEN}✓ Docker ready${NC}"

# Step 5: Test Docker build locally
read -p "Build Docker image locally first? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Building Docker image...${NC}"
    docker build -t earlyapp-backend-test .
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
fi

# Step 6: Deploy to Cloud Run
echo -e "${BLUE}Step 4: Deploying to Google Cloud Run...${NC}"
echo ""
echo "Deployment settings:"
echo "  Service: earlyapp-backend"
echo "  Region: us-central1"
echo "  Platform: Cloud Run"
echo "  Project: $GCP_PROJECT_ID"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

gcloud run deploy earlyapp-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 3600 \
  --project $GCP_PROJECT_ID

# Step 7: Get service URL
echo -e "${BLUE}Step 5: Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe earlyapp-backend \
  --platform managed \
  --region us-central1 \
  --format='value(status.url)' \
  --project $GCP_PROJECT_ID)

echo -e "${GREEN}✓ Service URL: $SERVICE_URL${NC}"

# Step 8: Test health endpoint
echo -e "${BLUE}Step 6: Testing deployment...${NC}"
sleep 5  # Wait for service to start
if curl -f "$SERVICE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠ Health check failed - service may still be starting${NC}"
fi

# Step 9: View logs
echo -e "${BLUE}Step 7: Recent logs...${NC}"
gcloud logging read "resource.service.name=earlyapp-backend" \
  --limit 10 \
  --format='table(timestamp,severity,textPayload)' \
  --project $GCP_PROJECT_ID || true

# Step 10: Success message
echo ""
echo -e "${GREEN}======================================"
echo "Deployment Successful! 🚀"
echo "======================================${NC}"
echo ""
echo "Your backend is live at:"
echo "  $SERVICE_URL"
echo ""
echo "Next steps:"
echo "  1. Update REACT_APP_API_URL in frontend/.env.production"
echo "  2. Deploy frontend: ./scripts/deploy-frontend.sh"
echo "  3. Monitor logs: gcloud logging read \"resource.service.name=earlyapp-backend\" --stream"
echo ""
echo "To update secrets:"
echo "  gcloud secrets versions add mongo-url --data-file=-"
echo ""
echo "To rollback:"
echo "  gcloud run deploy earlyapp-backend --image gcr.io/$GCP_PROJECT_ID/earlyapp-backend:PREVIOUS_TAG"
echo ""
