from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uuid
import calendar
import io
import base64
from urllib.parse import quote
from models_phase0_updated import (
    PaymentTransaction, PaymentTransactionCreate,
    MonthlyBillSummary, SystemSettings, SystemSettingsUpdate,
    MonthlyBillingFilters, DayQuantityUpdate, WhatsAppMessageData
)
from database import db
from auth import get_current_user
from subscription_engine_v2 import subscription_engine

router = APIRouter(prefix="/billing", tags=["Monthly Billing"])

# ==================== HELPER FUNCTIONS ====================

def get_week_number(day: int) -> str:
    """
    Calculate week number for a given day in month
    Week 1: days 1-7, Week 2: days 8-14, Week 3: days 15-21, Week 4: days 22-28, Residuary: 29-31
    """
    if 1 <= day <= 7:
        return "Week 1"
    elif 8 <= day <= 14:
        return "Week 2"
    elif 15 <= day <= 21:
        return "Week 3"
    elif 22 <= day <= 28:
        return "Week 4"
    else:
        return "Residuary Week"

def calculate_price_for_customer_product(customer: Dict, product: Dict) -> float:
    """
    Get price for a customer-product combination
    Priority: customer.custom_product_prices[product_id] > product.default_price
    """
    custom_prices = customer.get("custom_product_prices", {})
    if product["id"] in custom_prices:
        return float(custom_prices[product["id"]])
    return float(product.get("default_price", 0))

# ==================== SYSTEM SETTINGS ====================

@router.get("/settings", response_model=SystemSettings)
async def get_system_settings(current_user: dict = Depends(get_current_user)):
    """Get system settings (QR code, UPI ID, etc.)"""
    settings = await db.system_settings.find_one({}, {"_id": 0})
    
    if not settings:
        # Create default settings
        settings = {
            "id": str(uuid.uuid4()),
            "qr_code_url": None,
            "upi_id": "BHARATPE09905869536@yesbankltd",
            "business_name": "Earlybird Delivery Services",
            "business_phone": None,
            "whatsapp_template_telugu": None,
            "whatsapp_template_english": None
        }
        await db.system_settings.insert_one(settings)
    
    return settings

@router.put("/settings")
async def update_system_settings(
    updates: SystemSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update system settings (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get existing settings
    settings = await db.system_settings.find_one({})
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    if settings:
        await db.system_settings.update_one({"id": settings["id"]}, {"$set": update_data})
    else:
        # Create new settings
        new_settings = {
            "id": str(uuid.uuid4()),
            **update_data
        }
        await db.system_settings.insert_one(new_settings)
    
    return {"message": "Settings updated successfully"}

@router.post("/settings/qr-upload")
async def upload_qr_code(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload QR code image (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Read file content
    contents = await file.read()
    
    # Convert to base64 for storage
    encoded = base64.b64encode(contents).decode('utf-8')
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    qr_url = f"data:image/{file_ext};base64,{encoded}"
    
    # Update settings
    settings = await db.system_settings.find_one({})
    if settings:
        await db.system_settings.update_one(
            {"id": settings["id"]},
            {"$set": {"qr_code_url": qr_url}}
        )
    else:
        await db.system_settings.insert_one({
            "id": str(uuid.uuid4()),
            "qr_code_url": qr_url,
            "upi_id": "BHARATPE09905869536@yesbankltd",
            "business_name": "Earlybird Delivery Services"
        })
    
    return {"message": "QR code uploaded successfully", "qr_url": qr_url}

# ==================== MONTHLY VIEW ====================

@router.post("/monthly-view")
async def get_monthly_billing_view(
    filters: MonthlyBillingFilters,
    current_user: dict = Depends(get_current_user)
):
    """
    Get monthly billing data in Excel-like format
    Returns: List of customers with daily quantities for all products
    """
    try:
        # Parse month
        year, month_num = map(int, filters.month.split('-'))
        num_days = calendar.monthrange(year, month_num)[1]
        
        # Generate date list for the month
        date_list = []
        for day in range(1, num_days + 1):
            date_list.append(f"{year}-{month_num:02d}-{day:02d}")
        
        # Get customers based on role and filters
        query = {}
        if current_user.get("role") == "marketing_staff":
            query["marketing_boy_id"] = current_user.get("id")
        
        # Apply filters
        if filters.areas:
            query["area"] = {"$in": filters.areas}
        if filters.marketing_boy_ids:
            query["marketing_boy_id"] = {"$in": filters.marketing_boy_ids}
        if filters.delivery_boy_ids:
            query["delivery_boy_id"] = {"$in": filters.delivery_boy_ids}
        
        query["status"] = {"$in": ["active", "trial"]}
        
        customers = await db.customers_v2.find(query, {"_id": 0}).to_list(1000)
        
        # Get all products
        products = await db.products.find({}, {"_id": 0}).to_list(100)
        
        # Filter products if specified
        if filters.product_ids:
            products = [p for p in products if p["id"] in filters.product_ids]
        
        # Get all subscriptions for these customers
        customer_ids = [c["id"] for c in customers]
        subscriptions = await db.subscriptions_v2.find({
            "$or": [
                {"customerId": {"$in": customer_ids}},
                {"customer_id": {"$in": customer_ids}}
            ],
            "status": "active"
        }, {"_id": 0}).to_list(5000)
        
        # STEP 23: Also get ONE-TIME ORDERS for billing (CRITICAL FIX)
        # Query orders that have been DELIVERED but not yet billed
        one_time_orders = await db.orders.find({
            "status": "DELIVERED",
            "delivery_confirmed": True,
            "billed": {"$ne": True},  # Not yet billed
            "customer_id": {"$in": customer_ids}
        }, {"_id": 0}).to_list(5000)
        
        # Build subscription map by customer
        subscription_map = {}
        for sub in subscriptions:
            cid = sub.get("customerId") or sub.get("customer_id")
            if cid not in subscription_map:
                subscription_map[cid] = []
            subscription_map[cid].append(sub)
        
        # STEP 23: Build one-time orders map by customer (NEW)
        orders_map = {}
        for order in one_time_orders:
            cid = order.get("customer_id")
            if cid not in orders_map:
                orders_map[cid] = []
            orders_map[cid].append(order)
        
        # Get payment data for the month
        payments = await db.payment_transactions.find({
            "month": filters.month
        }, {"_id": 0}).to_list(1000)
        
        # Build payment map by customer
        payment_map = {}
        for payment in payments:
            cid = payment["customer_id"]
            if cid not in payment_map:
                payment_map[cid] = []
            payment_map[cid].append(payment)
        
        # Build result data
        result_data = []
        
        for customer in customers:
            customer_subs = subscription_map.get(customer["id"], [])
            customer_payments = payment_map.get(customer["id"], [])
            
            # Calculate products data
            products_data = {}
            
            for product in products:
                # Find subscriptions for this product
                product_subs = [s for s in customer_subs if s.get("product_id") == product["id"]]
                
                if not product_subs:
                    continue
                
                # Calculate daily quantities
                daily_quantities = {}
                week_totals = {"Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0, "Residuary Week": 0}
                
                for date_str in date_list:
                    day = int(date_str.split('-')[2])
                    week = get_week_number(day)
                    
                    # Sum quantities from all subscriptions for this product
                    total_qty = 0
                    for sub in product_subs:
                        qty = subscription_engine.compute_qty(date_str, sub)
                        total_qty += qty
                    
                    daily_quantities[date_str] = total_qty
                    week_totals[week] += total_qty
                
                # Calculate total and amount
                total_qty = sum(daily_quantities.values())
                price = calculate_price_for_customer_product(customer, product)
                total_amount = total_qty * price
                
                products_data[product["id"]] = {
                    "product_name": product["name"],
                    "product_unit": product.get("unit", "L"),
                    "price_per_unit": price,
                    "daily_quantities": daily_quantities,
                    "week_totals": week_totals,
                    "total_qty": total_qty,
                    "total_amount": total_amount
                }
            
            # Calculate billing summary
            total_bill = sum([p["total_amount"] for p in products_data.values()])
            
            # STEP 23: Add one-time order amounts to billing (CRITICAL)
            customer_orders = orders_map.get(customer["id"], [])
            one_time_order_total = 0
            for order in customer_orders:
                # Calculate order total from items
                order_items = order.get("items", [])
                for item in order_items:
                    item_total = item.get("quantity", 0) * item.get("price", 0)
                    one_time_order_total += item_total
            
            # Include one-time orders in total bill (MAJOR FIX)
            total_bill += one_time_order_total
            
            amount_paid = sum([p["amount"] for p in customer_payments])
            previous_balance = customer.get("previous_balance", 0)
            current_balance = total_bill + previous_balance - amount_paid
            
            # Determine payment status
            if current_balance <= 0:
                payment_status = "Paid"
            elif amount_paid > 0:
                payment_status = "Partial"
            else:
                payment_status = "Unpaid"
            
            # Apply payment status filter
            if filters.payment_status and filters.payment_status != "All":
                if payment_status != filters.payment_status:
                    continue
            
            result_data.append({
                "customer_id": customer["id"],
                "customer_name": customer["name"],
                "phone": customer["phone"],
                "area": customer.get("area", ""),
                "sub_area": customer.get("sub_area", ""),
                "delivery_boy": customer.get("delivery_boy_id", ""),
                "marketing_boy": customer.get("marketing_boy", ""),
                "products_data": products_data,
                "total_bill_amount": round(total_bill, 2),
                "amount_paid": round(amount_paid, 2),
                "previous_balance": round(previous_balance, 2),
                "current_balance": round(current_balance, 2),
                "payment_status": payment_status,
                "payments": customer_payments
            })
        
        # STEP 23: Mark one-time orders as billed to prevent duplicate billing (NEW)
        for order in one_time_orders:
            await db.orders.update_one(
                {"id": order["id"]},
                {"$set": {
                    "billed": True,
                    "billed_at": datetime.now().isoformat(),
                    "billed_month": filters.month
                }}
            )
        
        return {
            "success": True,
            "month": filters.month,
            "date_list": date_list,
            "products": products,
            "customers": result_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating monthly view: {str(e)}")

# ==================== UPDATE QUANTITY ====================

@router.post("/monthly-view/update")
async def update_monthly_quantity(
    update: DayQuantityUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update quantity for a specific date (two-way sync with subscriptions)
    This creates/updates day_override in the subscription
    """
    try:
        # Find subscription for this customer + product
        subscription = await db.subscriptions_v2.find_one({
            "customer_id": update.customer_id,
            "product_id": update.product_id,
            "status": "active"
        }, {"_id": 0})
        
        if not subscription:
            raise HTTPException(status_code=404, detail="No active subscription found for this customer and product")
        
        # Update day_override
        day_overrides = subscription.get("day_overrides", [])
        
        # Remove existing override for this date
        day_overrides = [d for d in day_overrides if d.get("date") != update.date]
        
        # Add new override (only if quantity > 0)
        if update.quantity > 0:
            day_overrides.append({
                "date": update.date,
                "quantity": float(update.quantity),
                "shift": update.shift
            })
        
        # Update subscription
        await db.subscriptions_v2.update_one(
            {"id": subscription["id"]},
            {"$set": {
                "day_overrides": day_overrides,
                "updated_at": datetime.now().isoformat()
            }}
        )
        
        # Log audit
        await db.subscription_audit.insert_one({
            "subscription_id": subscription["id"],
            "user_id": current_user.get("id"),
            "action": "quantity_updated_from_monthly_billing",
            "date": update.date,
            "new_quantity": update.quantity,
            "timestamp": datetime.now().isoformat()
        })
        
        return {"message": "Quantity updated successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating quantity: {str(e)}")

# ==================== PAYMENT MANAGEMENT ====================

@router.post("/payment", response_model=PaymentTransaction)
async def record_payment(
    payment: PaymentTransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Record a payment for a customer"""
    try:
        # Verify customer exists
        customer = await db.customers_v2.find_one({"id": payment.customer_id}, {"_id": 0})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Create payment transaction
        payment_doc = {
            "id": str(uuid.uuid4()),
            "customer_id": payment.customer_id,
            "month": payment.month,
            "amount": payment.amount,
            "payment_date": payment.payment_date,
            "payment_method": payment.payment_method,
            "notes": payment.notes,
            "created_at": datetime.now().isoformat(),
            "created_by": current_user.get("id")
        }
        
        await db.payment_transactions.insert_one(payment_doc)
        
        return payment_doc
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recording payment: {str(e)}")

@router.get("/payments/{customer_id}")
async def get_customer_payments(
    customer_id: str,
    month: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all payments for a customer (optionally filtered by month)"""
    query = {"customer_id": customer_id}
    if month:
        query["month"] = month
    
    payments = await db.payment_transactions.find(query, {"_id": 0}).to_list(1000)
    return payments

@router.delete("/payment/{payment_id}")
async def delete_payment(
    payment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a payment transaction"""
    result = await db.payment_transactions.delete_one({"id": payment_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {"message": "Payment deleted successfully"}

# ==================== WHATSAPP MESSAGE GENERATION ====================

@router.get("/whatsapp-message/{customer_id}")
async def generate_whatsapp_message(
    customer_id: str,
    month: str,  # YYYY-MM format
    current_user: dict = Depends(get_current_user)
):
    """Generate WhatsApp message for a customer (Telugu + English)"""
    try:
        # Get customer
        customer = await db.customers_v2.find_one({"id": customer_id}, {"_id": 0})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Get system settings for QR and UPI
        settings = await db.system_settings.find_one({}, {"_id": 0})
        qr_url = settings.get("qr_code_url") if settings else None
        upi_id = settings.get("upi_id", "BHARATPE09905869536@yesbankltd") if settings else "BHARATPE09905869536@yesbankltd"
        
        # Calculate billing data for the month
        year, month_num = map(int, month.split('-'))
        num_days = calendar.monthrange(year, month_num)[1]
        date_list = [f"{year}-{month_num:02d}-{day:02d}" for day in range(1, num_days + 1)]
        
        # Get subscriptions
        subscriptions = await db.subscriptions_v2.find({
            "customer_id": customer_id,
            "status": "active"
        }, {"_id": 0}).to_list(100)
        
        # Get products
        products = await db.products.find({}, {"_id": 0}).to_list(100)
        product_map = {p["id"]: p for p in products}
        
        # Calculate total liters and bill
        total_liters = 0
        total_bill = 0
        
        for sub in subscriptions:
            product = product_map.get(sub.get("product_id"))
            if not product:
                continue
            
            for date_str in date_list:
                qty = subscription_engine.compute_qty(date_str, sub)
                total_liters += qty
            
            # Calculate price
            price = calculate_price_for_customer_product(customer, product)
            sub_total = sum([subscription_engine.compute_qty(d, sub) for d in date_list])
            total_bill += sub_total * price
        
        # Get payments
        payments = await db.payment_transactions.find({
            "customer_id": customer_id,
            "month": month
        }, {"_id": 0}).to_list(100)
        
        amount_paid = sum([p["amount"] for p in payments])
        previous_balance = customer.get("previous_balance", 0)
        current_balance = total_bill + previous_balance - amount_paid
        
        # Generate Telugu message
        telugu_message = f"""ప్రియమైన {customer['name']} గారు,

దయచేసి కేవలం మీకు ఇచ్చిన QR కోడ్ స్కాన్ చేసి మాత్రమే చెల్లించగలరు. ఇతర మార్గాల్లో డబ్బు పంపవద్దు. డెలివరీ సిబ్బంది లేదా మార్కెటింగ్ సిబ్బందికి నగదు ఇవ్వవద్దు.
QR కోడ్ స్కాన్ చేయడంలో ఎలాంటి సమస్య ఉంటే, ఈ UPI ID కి కూడా చెల్లించవచ్చు: {upi_id}

మీరు ఈ నెలలో పాల మరియు పాల ఉత్పత్తుల వినియోగానికి బిల్లు మొత్తం ₹{total_bill:.2f}
మీరు ముందుగా చెల్లించిన మొత్తం ₹{amount_paid:.2f}
మునుపటి బకాయిలు: ₹{previous_balance:.2f}
ఈ నెలలో సరఫరా చేసిన మొత్తం లీటర్లు: {total_liters:.2f} లీటర్లు
దయచేసి మొత్తం ₹{current_balance:.2f} రూపాయలను కింద ఇచ్చిన QR కోడ్ స్కాన్ చేసి చెల్లించగలరు.
చెల్లింపు పూర్తయ్యాక స్క్రీన్‌షాట్ లేదా చెల్లింపు సందేశం మాకు షేర్ చేయమని మనవి.
మా పాలు మీకు నచ్చినట్టయితే మాకు చాలా ఆనందం 😊
ఏవైనా సందేహాల కోసం మమ్మల్ని సంప్రదించండి."""
        
        # Generate English message
        english_message = f"""Hello {customer['name']} Garu,

Kindly make payment *only by scanning the attached QR code*. Please do not transfer money in any other way and do not hand over cash to delivery staff or marketing staff.
If you face any issue scanning the QR, you may also pay to this UPI ID: {upi_id}

Bill for the consumption of milk and milk products is ₹{total_bill:.2f}
Paid during the month was ₹{amount_paid:.2f}
Previous Balance Payable: ₹{previous_balance:.2f}
Total Liters Delivered (this month): {total_liters:.2f} Ltrs
Kindly pay the balance amount of ₹{current_balance:.2f} by scanning the attached QR code.
After payment, please share the screenshot or confirmation message for record.
Hope you like the milk 😊
For any queries, please contact us.

Thanks & Regards,
Earlybird Delivery Services"""
        
        # Combine messages
        combined_message = telugu_message + "\n\n" + english_message
        
        # Generate WhatsApp URL
        phone = customer.get("phone", "").replace("+", "").replace("-", "").replace(" ", "")
        if not phone.startswith("91"):
            phone = "91" + phone
        
        whatsapp_url = f"https://wa.me/{phone}?text={quote(combined_message)}"
        
        return {
            "message": combined_message,
            "telugu_message": telugu_message,
            "english_message": english_message,
            "whatsapp_url": whatsapp_url,
            "qr_url": qr_url,
            "billing_data": {
                "total_bill": round(total_bill, 2),
                "amount_paid": round(amount_paid, 2),
                "previous_balance": round(previous_balance, 2),
                "current_balance": round(current_balance, 2),
                "total_liters": round(total_liters, 2)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating message: {str(e)}")

# ==================== DASHBOARD: ARREAR STATS ====================

@router.get("/arrears-by-area")
async def get_arrears_by_area(
    month: str,  # YYYY-MM format
    current_user: dict = Depends(get_current_user)
):
    """Get arrear payable grouped by area"""
    try:
        # Get all customers
        query = {}
        if current_user.get("role") == "marketing_staff":
            query["marketing_boy_id"] = current_user.get("id")
        
        query["status"] = {"$in": ["active", "trial"]}
        customers = await db.customers_v2.find(query, {"_id": 0}).to_list(1000)
        
        # Get payments for the month
        payments = await db.payment_transactions.find({"month": month}, {"_id": 0}).to_list(1000)
        payment_map = {}
        for payment in payments:
            cid = payment["customer_id"]
            if cid not in payment_map:
                payment_map[cid] = 0
            payment_map[cid] += payment["amount"]
        
        # Get subscriptions
        customer_ids = [c["id"] for c in customers]
        subscriptions = await db.subscriptions_v2.find({
            "customer_id": {"$in": customer_ids},
            "status": "active"
        }, {"_id": 0}).to_list(5000)
        
        subscription_map = {}
        for sub in subscriptions:
            cid = sub["customer_id"]
            if cid not in subscription_map:
                subscription_map[cid] = []
            subscription_map[cid].append(sub)
        
        # Get products
        products = await db.products.find({}, {"_id": 0}).to_list(100)
        product_map = {p["id"]: p for p in products}
        
        # Calculate month dates
        year, month_num = map(int, month.split('-'))
        num_days = calendar.monthrange(year, month_num)[1]
        date_list = [f"{year}-{month_num:02d}-{day:02d}" for day in range(1, num_days + 1)]
        
        # Calculate arrears by area
        arrears_by_area = {}
        
        for customer in customers:
            area = customer.get("area", "Unknown")
            customer_subs = subscription_map.get(customer["id"], [])
            
            # Calculate bill
            total_bill = 0
            for sub in customer_subs:
                product = product_map.get(sub.get("product_id"))
                if not product:
                    continue
                
                price = calculate_price_for_customer_product(customer, product)
                sub_total = sum([subscription_engine.compute_qty(d, sub) for d in date_list])
                total_bill += sub_total * price
            
            # Calculate balance
            amount_paid = payment_map.get(customer["id"], 0)
            previous_balance = customer.get("previous_balance", 0)
            current_balance = total_bill + previous_balance - amount_paid
            
            # Add to area total (only if balance > 0)
            if current_balance > 0:
                if area not in arrears_by_area:
                    arrears_by_area[area] = 0
                arrears_by_area[area] += current_balance
        
        return {
            "month": month,
            "arrears_by_area": {k: round(v, 2) for k, v in arrears_by_area.items()}
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating arrears: {str(e)}")


# ==================== WALLET MANAGEMENT ====================

@router.post("/wallet/topup")
async def topup_wallet(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Generate payment link for wallet top-up"""
    try:
        customer_id = data.get("customer_id")
        amount = float(data.get("amount", 0))
        
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")
        
        # Create top-up transaction
        topup_id = str(uuid.uuid4())
        topup_tx = {
            "id": topup_id,
            "customer_id": customer_id,
            "amount": amount,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "payment_method": "online"
        }
        
        await db.wallet_topups.insert_one(topup_tx)
        
        # Generate payment link (mock - use actual gateway)
        payment_link = f"https://razorpay.com/pay?topup_id={topup_id}&amount={int(amount*100)}"
        
        return {
            "topup_id": topup_id,
            "amount": amount,
            "payment_link": payment_link,
            "status": "initiated"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error initiating top-up: {str(e)}")


@router.get("/wallet/balance/{customer_id}")
async def get_wallet_balance(
    customer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get current wallet balance for a customer"""
    try:
        wallet = await db.wallets.find_one({"customer_id": customer_id})
        
        if not wallet:
            # Create wallet if doesn't exist
            wallet = {
                "customer_id": customer_id,
                "balance": 0,
                "created_at": datetime.now().isoformat()
            }
            await db.wallets.insert_one(wallet)
        
        return {
            "customer_id": customer_id,
            "balance": float(wallet.get("balance", 0)),
            "currency": "INR"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching wallet: {str(e)}")


@router.post("/wallet/deduct")
async def deduct_from_wallet(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Deduct amount from wallet (used for payments)"""
    try:
        customer_id = data.get("customer_id")
        amount = float(data.get("amount", 0))
        reason = data.get("reason", "payment")
        
        wallet = await db.wallets.find_one({"customer_id": customer_id})
        
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        current_balance = float(wallet.get("balance", 0))
        
        if current_balance < amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Deduct amount
        new_balance = current_balance - amount
        await db.wallets.update_one(
            {"customer_id": customer_id},
            {"$set": {"balance": new_balance, "updated_at": datetime.now().isoformat()}}
        )
        
        # Record transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "customer_id": customer_id,
            "type": "debit",
            "amount": amount,
            "reason": reason,
            "timestamp": datetime.now().isoformat(),
            "balance_after": new_balance
        }
        await db.wallet_transactions.insert_one(transaction)
        
        return {
            "status": "success",
            "balance": new_balance,
            "amount_deducted": amount
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deducting from wallet: {str(e)}")
