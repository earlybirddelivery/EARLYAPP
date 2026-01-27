#!/bin/bash

echo "=========================================="
echo "EarlyBird - API Cost Estimator"
echo "=========================================="
echo ""
echo "This tool estimates monthly API costs for production deployment."
echo ""

# Get scenario input
echo "Select usage scenario:"
echo "1. Small (100 deliveries/day, 10 customers)"
echo "2. Medium (1000 deliveries/day, 100 customers)"
echo "3. Large (10000 deliveries/day, 1000 customers)"
echo "4. Custom"
echo ""
read -p "Enter choice [1-4]: " CHOICE

case $CHOICE in
    1)
        DELIVERIES=100
        CUSTOMERS=10
        ;;
    2)
        DELIVERIES=1000
        CUSTOMERS=100
        ;;
    3)
        DELIVERIES=10000
        CUSTOMERS=1000
        ;;
    4)
        read -p "Daily deliveries: " DELIVERIES
        read -p "Active customers: " CUSTOMERS
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Calculating costs for:"
echo "  - Daily deliveries: $DELIVERIES"
echo "  - Active customers: $CUSTOMERS"
echo "  - Monthly days: 30"
echo ""

# Calculations
MONTHLY_DELIVERIES=$((DELIVERIES * 30))

echo "=========================================="
echo "ESTIMATED MONTHLY COSTS"
echo "=========================================="
echo ""

echo "1. Google Maps Platform"
echo "   -------------------"
GEOCODING_CALLS=$((CUSTOMERS * 2))  # 2 addresses per customer
DISTANCE_CALLS=$MONTHLY_DELIVERIES  # 1 per delivery
DIRECTIONS_CALLS=$((DELIVERIES * 30))  # 1 per day for routing

Maps_COST=$(echo "scale=2; ($GEOCODING_CALLS * 0.005) + ($DISTANCE_CALLS * 0.005) + ($DIRECTIONS_CALLS * 0.005)" | bc)

echo "   Geocoding: $GEOCODING_CALLS calls x \$0.005 = \$$(echo "scale=2; $GEOCODING_CALLS * 0.005" | bc)"
echo "   Distance Matrix: $DISTANCE_CALLS calls x \$0.005 = \$$(echo "scale=2; $DISTANCE_CALLS * 0.005" | bc)"
echo "   Directions: $DIRECTIONS_CALLS calls x \$0.005 = \$$(echo "scale=2; $DIRECTIONS_CALLS * 0.005" | bc)"
echo "   TOTAL: ~\$$MAPS_COST/month"
echo "   (First \$200/month is free with Google Maps Platform)"
echo ""

echo "2. Twilio SMS (OTP)"
echo "   -------------------"
OTP_MESSAGES=$((CUSTOMERS * 4))  # Assume 4 logins per month per customer
SMS_COST=$(echo "scale=2; $OTP_MESSAGES * 0.0075" | bc)

echo "   Messages: $OTP_MESSAGES x \$0.0075 = \$$SMS_COST/month"
echo "   (India SMS pricing)"
echo ""

echo "3. Stripe Payment Processing"
echo "   -------------------"
AVG_ORDER_VALUE=200  # Rs 200 average
TRANSACTIONS=$((DELIVERIES * 10))  # Assume 10 paid orders per delivery route
STRIPE_PERCENT=$(echo "scale=2; ($TRANSACTIONS * $AVG_ORDER_VALUE * 0.029)" | bc)
STRIPE_FIXED=$(echo "scale=2; $TRANSACTIONS * 0.30" | bc)
STRIPE_TOTAL=$(echo "scale=2; $STRIPE_PERCENT + $STRIPE_FIXED" | bc)

echo "   Transactions: $TRANSACTIONS"
echo "   Average value: ₹$AVG_ORDER_VALUE"
echo "   Fees: 2.9% + \$0.30 per transaction"
echo "   TOTAL: ~\$$STRIPE_TOTAL/month"
echo ""

echo "4. AI Recommendations (OpenAI GPT-4o-mini)"
echo "   -------------------"
AI_REQUESTS=$((CUSTOMERS * 4))  # 4 recommendations per customer per month
TOKENS_PER_REQUEST=500  # Average tokens
TOTAL_TOKENS=$((AI_REQUESTS * TOKENS_PER_REQUEST))
AI_COST=$(echo "scale=2; $TOTAL_TOKENS * 0.00015 / 1000" | bc)  # $0.150 per 1M tokens

echo "   Requests: $AI_REQUESTS"
echo "   Avg tokens: $TOKENS_PER_REQUEST per request"
echo "   Total tokens: $TOTAL_TOKENS"
echo "   TOTAL: ~\$$AI_COST/month"
echo "   (Using Emergent LLM key will deduct from your balance)"
echo ""

echo "5. SendGrid Email"
echo "   -------------------"
EMAIL_COUNT=$((DELIVERIES * 30 * 2))  # 2 emails per delivery (confirmation + receipt)
if [ $EMAIL_COUNT -lt 40000 ]; then
    EMAIL_COST=0
    echo "   Emails: $EMAIL_COUNT (within free tier)"
    echo "   TOTAL: \$0/month (Free up to 40k emails)"
else
    PAID_EMAILS=$((EMAIL_COUNT - 40000))
    EMAIL_COST=$(echo "scale=2; $PAID_EMAILS * 0.00085" | bc)
    echo "   Emails: $EMAIL_COUNT"
    echo "   Paid emails: $PAID_EMAILS x \$0.00085"
    echo "   TOTAL: ~\$$EMAIL_COST/month"
fi
echo ""

echo "6. AWS S3 Storage"
echo "   -------------------"
STORAGE_GB=10  # Assume 10GB for product images
REQUESTS=$((CUSTOMERS * 100))  # 100 image views per customer
S3_STORAGE=$(echo "scale=2; $STORAGE_GB * 0.023" | bc)
S3_REQUESTS=$(echo "scale=2; $REQUESTS * 0.0004 / 1000" | bc)
S3_TOTAL=$(echo "scale=2; $S3_STORAGE + $S3_REQUESTS" | bc)

echo "   Storage: ${STORAGE_GB}GB x \$0.023 = \$$S3_STORAGE"
echo "   Requests: $REQUESTS x \$0.0004/1000 = \$$S3_REQUESTS"
echo "   TOTAL: ~\$$S3_TOTAL/month"
echo ""

echo "=========================================="
echo "TOTAL ESTIMATED COSTS"
echo "=========================================="

TOTAL=$(echo "scale=2; $MAPS_COST + $SMS_COST + $STRIPE_TOTAL + $AI_COST + $EMAIL_COST + $S3_TOTAL" | bc)

echo "Maps API:        \$$MAPS_COST"
echo "SMS (OTP):       \$$SMS_COST"
echo "Payments:        \$$STRIPE_TOTAL"
echo "AI (GPT):        \$$AI_COST"
echo "Email:           \$$EMAIL_COST"
echo "Storage (S3):    \$$S3_TOTAL"
echo "-----------------------------------"
echo "TOTAL:           \$$TOTAL/month"
echo ""
echo "NOTE: These are ESTIMATES based on average usage."
echo "      Actual costs may vary."
echo ""
echo "      Most services have free tiers:"
echo "      - Google Maps: \$200/month free credit"
echo "      - SendGrid: 40,000 emails/month free"
echo "      - AWS S3: 5GB storage free (first year)"
echo ""
echo "      With free tiers, small deployments may cost:"
echo "      \$10-50/month for 100 deliveries/day"
echo ""

echo "Cost breakdown saved to: /app/artifacts/cost_estimate.txt"

# Save to file
cat > /app/artifacts/cost_estimate.txt << EOF
EarlyBird Delivery Services - Cost Estimate
==========================================
Generated: $(date)
Scenario: $DELIVERIES deliveries/day, $CUSTOMERS customers

Monthly API Costs:
- Google Maps: \$$MAPS_COST
- Twilio SMS: \$$SMS_COST  
- Stripe Processing: \$$STRIPE_TOTAL
- AI Recommendations: \$$AI_COST
- SendGrid Email: \$$EMAIL_COST
- AWS S3 Storage: \$$S3_TOTAL

TOTAL: \$$TOTAL/month

Free Tiers:
- Google Maps: First \$200/month free
- SendGrid: 40,000 emails/month free  
- AWS S3: 5GB storage free (first year)

Recommendation:
- Small scale (< 100 deliveries/day): \$10-50/month
- Medium scale (1000 deliveries/day): \$100-300/month
- Large scale (10000+ deliveries/day): \$1000+/month
EOF

echo "✓ Done!"
