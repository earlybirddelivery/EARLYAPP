#!/bin/bash

echo "=========================================="
echo "EarlyBird - Production Readiness Checker"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

echo "Checking required API keys..."
echo ""

# Check backend .env
if [ ! -f "/app/backend/.env" ]; then
    echo "❌ ERROR: /app/backend/.env not found"
    ERRORS=$((ERRORS + 1))
else
    echo "✓ Found backend .env file"
fi

# Check USE_MOCK_SERVICES
if grep -q "USE_MOCK_SERVICES=true" /app/backend/.env 2>/dev/null; then
    echo "⚠️  WARNING: USE_MOCK_SERVICES=true (still in mock mode)"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✓ USE_MOCK_SERVICES is false (production mode)"
fi

echo ""
echo "Checking optional production API keys:"
echo ""

# Maps API
if grep -q "^GOOGLE_MAPS_API_KEY=.*[^=]$" /app/backend/.env 2>/dev/null; then
    echo "✓ Google Maps API key configured"
else
    echo "⚠️  Maps: Using mock service (configure GOOGLE_MAPS_API_KEY for production)"
    WARNINGS=$((WARNINGS + 1))
fi

# SMS/OTP
if grep -q "^TWILIO_ACCOUNT_SID=.*[^=]$" /app/backend/.env 2>/dev/null; then
    echo "✓ Twilio SMS configured"
elif grep -q "^MSG91_API_KEY=.*[^=]$" /app/backend/.env 2>/dev/null; then
    echo "✓ MSG91 SMS configured"
else
    echo "⚠️  SMS/OTP: Using mock service (configure Twilio or MSG91 for production)"
    WARNINGS=$((WARNINGS + 1))
fi

# Payment Gateway
if grep -q "^STRIPE_SECRET_KEY=.*[^=]$" /app/backend/.env 2>/dev/null; then
    echo "✓ Stripe configured"
elif grep -q "^RAZORPAY_KEY_ID=.*[^=]$" /app/backend/.env 2>/dev/null; then
    echo "✓ Razorpay configured"
else
    echo "⚠️  Payments: Using mock service (configure Stripe or Razorpay for production)"
    WARNINGS=$((WARNINGS + 1))
fi

# Email
if grep -q "^SENDGRID_API_KEY=.*[^=]$" /app/backend/.env 2>/dev/null; then
    echo "✓ SendGrid configured"
elif grep -q "^SMTP_HOST=.*[^=]$" /app/backend/.env 2>/dev/null; then
    echo "✓ SMTP configured"
else
    echo "⚠️  Email: Using mock service (logs only)"
    WARNINGS=$((WARNINGS + 1))
fi

# Storage
if grep -q "^AWS_ACCESS_KEY_ID=.*[^=]$" /app/backend/.env 2>/dev/null; then
    echo "✓ AWS S3 configured"
else
    echo "⚠️  Storage: Using mock URLs"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "Database check:"
if grep -q "^MONGO_URL=.*[^=]$" /app/backend/.env 2>/dev/null; then
    echo "✓ MongoDB URL configured"
else
    echo "❌ ERROR: MONGO_URL not configured"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Security check:"
if grep -q "^JWT_SECRET=your-jwt-secret-key-change-in-production" /app/backend/.env 2>/dev/null; then
    echo "❌ ERROR: JWT_SECRET is still default value! Change it for production."
    ERRORS=$((ERRORS + 1))
else
    echo "✓ JWT_SECRET has been changed"
fi

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo "❌ PRODUCTION NOT READY - Fix errors above"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️  PARTIAL PRODUCTION - Some services will use mocks"
    echo "    You can proceed but some features will be limited."
    exit 0
else
    echo "✓ PRODUCTION READY - All checks passed"
    echo "    Remember to:"
    echo "    1. Set USE_MOCK_SERVICES=false"
    echo "    2. Use production MongoDB"
    echo "    3. Enable HTTPS"
    echo "    4. Set up monitoring"
    echo "    5. Configure backups"
    exit 0
fi
