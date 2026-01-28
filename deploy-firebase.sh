#!/bin/bash
# Direct Firebase Deploy Script

cd frontend

# Try with npx (no global install)
echo "Attempting Firebase deployment..."

npx firebase --version

npx firebase deploy --only hosting --token $FIREBASE_TOKEN
