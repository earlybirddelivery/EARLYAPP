#!/bin/bash
# EARLYAPP Frontend Deployment Script
# Deploys frontend to Firebase Hosting

set -e

echo "======================================"
echo "EARLYAPP Frontend Deployment"
echo "======================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run from frontend directory.${NC}"
    exit 1
fi

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 2: Run tests (optional)
read -p "Run tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Running tests...${NC}"
    npm test -- --watchAll=false
    echo -e "${GREEN}✓ Tests passed${NC}"
fi

# Step 3: Build frontend
echo -e "${BLUE}Step 2: Building frontend...${NC}"
npm run build

# Check if build was successful
if [ -d "build" ]; then
    BUILD_SIZE=$(du -sh build | cut -f1)
    echo -e "${GREEN}✓ Build successful (size: $BUILD_SIZE)${NC}"
else
    echo -e "${RED}Build failed. Please check for errors above.${NC}"
    exit 1
fi

# Step 4: Check Firebase configuration
echo -e "${BLUE}Step 3: Checking Firebase configuration...${NC}"
if [ ! -f ".firebaserc" ]; then
    echo -e "${RED}Error: .firebaserc not found${NC}"
    exit 1
fi

FIREBASE_PROJECT=$(grep -o '"default": "[^"]*' .firebaserc | cut -d'"' -f4)
echo -e "${GREEN}✓ Firebase project: $FIREBASE_PROJECT${NC}"

# Step 5: Deploy to Firebase
echo -e "${BLUE}Step 4: Deploying to Firebase Hosting...${NC}"
echo "Deploying to: https://$FIREBASE_PROJECT.web.app"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

firebase deploy --only hosting

# Step 6: Success message
echo ""
echo -e "${GREEN}======================================"
echo "Deployment Successful! 🎉"
echo "======================================${NC}"
echo ""
echo "Your app is live at:"
echo "  📱 https://$FIREBASE_PROJECT.web.app"
echo "  📱 https://$FIREBASE_PROJECT.firebaseapp.com"
echo ""
echo "To view deployment details:"
echo "  firebase open hosting:site"
echo ""
