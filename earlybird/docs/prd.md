

## EARLYBIRD: COMPLETE UNIFIED PRD
Calendar-Centric Ecosystem for Dairy & Grocery Delivery
Version: 3.0 Final Consolidated with Advanced Features
## Date: January 20, 2026
Status: Developer-Ready Specification
##  CRITICAL ARCHITECTURAL PRINCIPLE
If you build dashboards first and calendar later, you have fundamentally misunderstood this
product.
CALENDAR IS THE SPINE. Everything else hangs off dates.
## EXECUTIVE SUMMARY
## Vision Statement
EarlyBird is a WhatsApp-first, app-optional, calendar-centric household supply system that manages
milk, groceries, water tins, subscriptions, recommendations, staff commissions, and logistics. Customers
are not forced to use an app. Everything can be operated on behalf of the customer by staff, while
remaining transparent and auditable.
## Key Differentiator
Unlike traditional e-commerce platforms that require customer self-service, EarlyBird treats the calendar
as the primary interface across all user roles (Admin, Support Buddies, Delivery Buddies, Suppliers,
and Customers). The system empowers field staff to operate on behalf of customers while maintaining
full transparency and system integrity.
Why Calendar-First Architecture
The dairy and grocery business operates on daily cycles. Every meaningful business event is date-bound:
Milk subscriptions deliver every day at specific times (AM/PM)
Grocery orders are placed on specific dates and delivered on specific dates
Payments are made on specific dates
Customer trust is built on historical accuracy of dated records
Supplier orders are generated based on calendar demand forecasts
Traditional dashboards show aggregated metrics but obscure daily operational reality. Calendars
don't lie—they show exactly what happened when.
## 0. CORE DESIGN PRINCIPLES (NON-NEGOTIABLE)
These principles form the foundation of the EarlyBird system. Any feature that violates these must be
rejected:
Principle 1: Calendar as Primary Navigation
The calendar is not a feature—it is the foundation. Every screen in the system either shows a calendar or
is accessed through a calendar date.
Admin sees consolidated calendar across all operations
Support sees calendar filtered to their assigned customers

Delivery sees calendar focused on today and their routes
Suppliers see calendar of expected orders and delivery dates
Customers see their personal delivery/payment calendar
Principle 2: Every Business Event is Date-Bound
No event exists without a date. This is not optional metadata—it's the primary organizational principle.
Subscription delivery scheduled → tied to specific date and time (AM/PM)
Grocery order created → order date stored
Delivery completed → exact delivery timestamp
Bill generated → bill date
Payment received → payment date
Supplier order placed → order date and expected delivery date
Wallet transactions → transaction date and time
Principle 3: Customer is Not Required to Install or Use the App
The system must function perfectly even if the customer never installs the mobile application.
Principle 4: WhatsApp is the Primary Communication Layer
All critical communications, confirmations, and transactional messages flow through WhatsApp.
Principle 5: App is the System of Record (Single Source of Truth)
All data, regardless of entry method, is stored centrally in the application backend.
Principle 6: Every Action is Attributable to a Role (Audit Trail)
Complete audit logging of who (customer, staff member, admin, supplier) performed what action and
when.
## Principle 7: Speed > Beauty > Complexity
User interfaces must prioritize operational efficiency over aesthetic design. Staff should be able to
complete tasks in minimal time.
## Principle 8: Indian Household Behavior > Western App Patterns
Design decisions must reflect actual Indian household purchasing patterns, not Silicon Valley e-commerce
assumptions.
Principle 9: Wallet-Based Financial System
All users (customers, staff, suppliers) have digital wallets for seamless, traceable transactions.
## 1. USER ROLES & APP NAMES
The EarlyBird ecosystem consists of five distinct applications, each serving a specific user role:
1.1 EarlyBird Gods App — CUSTOMER (OPTIONAL USE)
Naming Rationale: 'Gods' because the system exists to serve them.
## User Access Model:
Customer may never install the app
Customer may install it themselves
Family members may use the app on customer's behalf
All access maps to the same customer account with unified data

## Primary Calendar View:
Personal delivery/payment calendar
Subscription schedule visibility
Order history by date
Payment timeline
Wallet balance and transaction history
## Customer Wallet Features:
View current wallet balance
Top-up wallet via UPI/cards
All payments deducted from wallet first, then alternative methods
Transaction history with date-based filtering
Advance payment credit stored in wallet
1.2 EarlyBird Savior App — ADMIN / SUPER ADMIN
Control tower with absolute authority over the system.
## Primary Users:
Business owner
Operations team
Accounts team
System administrators
## Primary Calendar View:
Consolidated calendar across all operations
All customer deliveries aggregated by date
Staff activity timeline
Revenue and payment tracking by date
Supplier order schedule
Wallet transaction monitoring across all users
## Admin Wallet Management:
View all customer wallet balances
View all staff wallet balances (commission payments)
Process wallet refunds/adjustments
Generate wallet reconciliation reports by date
Supplier payment tracking
1.3 EarlyBird Support Buddies App — MARKETING / FIELD STAFF
Human interface for non-technical customers. Critical enabler of customer onboarding and retention.
## Key Responsibilities:
Onboard new customers
Create and manage customer grocery lists via voice, text, or handwritten image upload
Send WhatsApp confirmations
Manage customer subscriptions
Earn commissions deposited to wallet

## Primary Calendar View:
Calendar filtered to their assigned customers only
Upcoming order dates
Payment due dates
Customer interaction timeline
Commission earnings by date
## Support Buddy Wallet:
Real-time commission balance
Withdrawal to bank account
Earnings breakdown by customer and date
Performance-based bonus tracking
1.4 EarlyBird Delivery Buddies App — DELIVERY EXECUTIVES
Last-mile execution combined with field intelligence gathering.
## Key Capabilities:
Execute AM/PM deliveries
Capture instant orders during delivery
Can act as Support Buddy (if enabled by admin)
Earn delivery and sales commissions deposited to wallet
Provide field feedback to operations
## Primary Calendar View:
Calendar focused on today and their routes
Today's delivery schedule (AM/PM separated)
Route optimization sequence
Delivery completion status by date
Earnings tracker
## Delivery Buddy Wallet:
Daily delivery earnings
Instant order commission
Incentive bonuses
Withdrawal options
Performance metrics linked to earnings
1.5 EarlyBird Supplier App — SUPPLIER PORTAL
Supply chain integration for inventory management.
## Primary Users:
Milk suppliers
Grocery wholesalers
Product vendors
## Key Capabilities:
View upcoming order forecasts based on calendar demand

Receive auto-generated purchase orders
Confirm delivery dates and quantities
Track payment status
Manage product catalog and pricing
## Primary Calendar View:
Calendar showing expected orders by date
Delivery commitment dates
Payment due and received dates
Inventory fulfillment timeline
## Supplier Wallet:
Outstanding payment balance
Payment history by date
Advance payments received
Invoice reconciliation
## 2. CALENDAR ARCHITECTURE (THE CORE)
2.1 Calendar as Primary Interface
Every user role starts with a calendar view. This is not a secondary feature—it's the home screen.
## Month View:
Shows overview of entire month
Calendar Heat Map: Color-code dates by delivery volume intensity
Light green: 1-20 deliveries
Medium green: 21-50 deliveries
Dark green: 51-100 deliveries
Red: 100+ deliveries (alert state)
Date indicators for: Deliveries scheduled, Payments due, Payments received, New orders,
Subscription changes, Staff activities, Supplier orders
Day View (Date Detail View):
Click any date to see all events for that date
This is the most important screen in the system
Shows complete event timeline for selected date
## 2.2 Date Detail View — The Workhorse Screen
When user clicks on any calendar date, they see:
## For Admin:
All customer orders for that date
All deliveries completed/pending
All payments received
Staff activity log
Inventory movements
Route assignments

Supplier order summary: Total demand by supplier for that date
Product availability status: Stock alerts for that date
Wallet transactions for that date
## For Support Buddy:
Their assigned customer orders for that date
Payment confirmations needed
Subscription changes made
Customer interactions logged
Commission earned that date
Voice/image upload history
## For Delivery Buddy:
Their delivery list for that date (AM/PM separated)
Route sequence with GPS optimization
Instant orders captured
Delivery completion status
Earnings for that date
Last mile intelligence captured
## For Customer:
Their deliveries for that date
Payments made
Orders placed
Subscription status
Wallet transactions
## For Supplier:
Orders expected from EarlyBird for that date
Delivery commitments for that date
Payment status for past deliveries
Stock requirements
## 2.3 Event Timeline Data Model
All business events are stored as dated records in a unified timeline:
## Event Types:
## ORDER_PLACED
## ORDER_CONFIRMED
## DELIVERY_COMPLETED
## PAYMENT_RECEIVED
## WALLET_TOPUP
## WALLET_DEDUCTION
## COMMISSION_EARNED
## SUBSCRIPTION_CREATED
## SUBSCRIPTION_PAUSED
## SUBSCRIPTION_RESUMED
## BILL_GENERATED

## STAFF_ACTION_LOGGED
## SUPPLIER_ORDER_PLACED
## SUPPLIER_DELIVERY_CONFIRMED
## VOICE_ORDER_PROCESSED
## IMAGE_ORDER_PROCESSED
## Event Schema:
2.4 Calendar Filtering and Permissions
Each role sees calendar filtered by their permissions:
Admin: All events across all customers, staff, and suppliers
Support Buddy: Only their assigned customers' events
Delivery Buddy: Only deliveries on their assigned routes
Customer: Only their personal events
Supplier: Only orders relevant to their supply catalog
## 3. WALLET SYSTEM (UNIFIED FINANCIAL LAYER)
## 3.1 Customer Wallet
Purpose: Simplify payments, enable advance credits, track all transactions
## Features:
Exclusive Payment Link: Each customer gets ONE permanent UPI payment link tied to their
customer ID
Link format: pay.earlybird.app/c/[CUSTOMER_ID]
Customer saves this link in their UPI app favorites
Reusable for all future payments—no new links needed
Customer can change amount in UPI app before confirming payment
WhatsApp messages just say: "Pay ₹450 using your EarlyBird link"
## How Exclusive Link Works:
- Customer receives WhatsApp: "Your order total: ₹450. Pay using your saved EarlyBird link."
- Customer opens their UPI app (GPay/PhonePe/Paytm)
- Goes to saved links/favorites → Finds "EarlyBird Payment"
- Edits amount to ₹450 (or pays different amount if partial payment)
- Completes payment
## {
## {


event_id: unique_identifier,
event_id: unique_identifier,


event_type: enum,
event_type: enum,


event_date: date,
event_date: date,


event_time: timestamp,
event_time: timestamp,


customer_id: reference,
customer_id: reference,


actor_id: who_performed_action,
actor_id: who_performed_action,


actor_role: customer/support/delivery/admin/supplier,
actor_role: customer/support/delivery/admin/supplier,


event_data: json_details,
event_data: json_details,


related_events: linked_event_ids,
related_events: linked_event_ids,


wallet_transaction_id: if_applicable
wallet_transaction_id: if_applicable
## }
## }

- Webhook triggers: Payment received on link associated with Customer ID → Amount credited to
customer's wallet
- System auto-deducts outstanding balance from wallet
- Customer receives confirmation: "Received ₹450. Wallet balance: ₹50. Outstanding: ₹0"
## Wallet Operations:
Top-up: Customer adds money to wallet in advance
Auto-deduction: When order is placed, amount deducted from wallet first
Insufficient balance: If wallet has ₹100 but order is ₹300, deduct ₹100 from wallet, request ₹200
via UPI
Advance credit: Excess payments stored in wallet for future use
Refunds: Canceled orders credited back to wallet
Transaction history: All wallet activity visible on calendar by date
## Benefits:
Non-tech customers memorize/save ONE link forever
UPI apps remember the link, enable repeat payments with amount editing
No confusion about which link for which order
Reduces friction significantly
3.2 Staff Wallet (Support & Delivery Buddies)
Purpose: Transparent commission tracking and instant payouts
## Features:
## Earning Sources:
Per-order commission (Support Buddy creates order)
Delivery commission (Delivery Buddy completes delivery)
Instant order bonus (Delivery Buddy captures on-the-spot order)
Subscription conversion bonus
Referral rewards
Performance incentives
Real-time Balance: Updated immediately when qualifying event occurs
## Withdrawal Options:
Instant withdrawal to bank account (min ₹500)
Weekly auto-transfer (if enabled)
Monthly consolidated payout
## Transparency:
Earnings breakdown by customer, by date, by order
Pending vs. paid commissions
Calendar view shows daily earnings
Leaderboard based on wallet earnings
## Calendar Integration:
Every commission event logged on Date Detail View
Staff can click any date to see earnings breakdown
Monthly/weekly earnings aggregated from calendar events
## 3.3 Supplier Wallet

Purpose: Track payments owed and received from EarlyBird
## Features:
## Payment Tracking:
Outstanding balance (what EarlyBird owes supplier)
Payment history with dates
Invoice reconciliation
Advance payments received
## Auto-calculation:
When supplier confirms delivery on calendar date, system calculates payment owed
Amount added to supplier wallet as "receivable"
When admin processes payment, marked as "paid"
## Payment Terms:
Configurable: Immediate, 7 days, 15 days, 30 days
Calendar shows payment due dates
Automated reminders to admin for due payments
## Calendar Integration:
Supplier sees calendar with delivery dates and payment due dates color-coded
Date Detail View shows delivery confirmation and payment status
## 4. CUSTOMER ACCOUNT & IDENTITY MODEL
## 4.1 Customer Master Data
## Required Fields:
Mobile number (primary unique identifier)
Customer name
Complete delivery address
Landmark for delivery assistance
Google Maps location (GPS coordinates)
Service area
Delivery route assignment
## Assigned Support Buddy
## Assigned Delivery Buddy
Exclusive Payment Link: Auto-generated on account creation
Wallet Balance: Current advance credit/outstanding balance
4.2 Multi-Access Model
The same customer account can be accessed simultaneously by:
Support Buddy (on behalf of customer, full list management access)
Delivery Buddy (limited scope: instant orders, delivery confirmation)
Customer via mobile app (full self-service access)
Family member using customer app (same access as customer)
Implementation Requirement: All actions must sync to one centralized ledger with proper attribution to
the actor.

## 5. INTELLIGENT ORDER ENTRY METHODS
5.1 Voice-Based List Addition (Regional Languages)
Purpose: Support Buddies can create orders faster by speaking instead of typing
## Supported Languages:
## Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati
## How It Works:
- Support Buddy clicks "Voice Order" button
- Speaks naturally: "पांच िकलो चावल, दो िकलो चीनी, एक लीटर तेल, आधा िकलो ह ी"
- System converts speech to text
- AI parses: Rice 5kg, Sugar 2kg, Oil 1L, Turmeric 500g
- Support Buddy reviews and confirms
- Items added to customer's monthly list
## Features:
Real-time transcription preview
Edit before confirming
Learns from corrections (improves over time)
Works offline with on-device speech recognition (cloud sync when online)
## Calendar Integration:
Voice orders logged on Date Detail View with audio clip attachment
Admin can review voice order accuracy for quality control
5.2 Handwritten List Image Upload (OCR)
Purpose: Customers or Support Buddies can photograph handwritten grocery lists
## How It Works:
- Customer writes grocery list on paper (traditional behavior)
- Takes photo and sends via WhatsApp to Support Buddy OR uploads in app
- System uses OCR (Optical Character Recognition) to extract text
- AI parses handwriting: "Rice 25kg, Atta 10kg, Sugar 5kg..."
- Support Buddy reviews extracted items
- Confirms or corrects any misreads
- Items added to customer's monthly list
## Supported Formats:
Handwritten Hindi/English/regional scripts
Printed shopping lists
Screenshots from other apps
Photos of old delivery receipts (to recreate past orders)
## Features:
Handles messy handwriting with confidence scores

Flags uncertain items for manual review
Learns from corrections to improve accuracy
Can extract quantities, units, brands from handwriting
## Use Cases:
Elderly customers who prefer writing lists
Customers dictating to family members who write
Support Buddies visiting customers in person
Recreating orders from old paper records during onboarding
## Calendar Integration:
Image upload events logged on Date Detail View
Original image stored for reference
OCR accuracy metrics tracked for system improvement
5.3 Traditional Text/Kirana UI Entry
Purpose: Fast typing for Support Buddies familiar with products
(Existing kirana-style dense list UI as described in section 6.2)
## 6. DELIVERY TIME & PRODUCT BEHAVIOR
6.1 Universal AM / PM Choice
Core Rule: All products can be delivered in either AM or PM slots. There is no hard restriction like 'milk
only AM'.
6.2 Product-Level Delivery Rule (Admin Configurable)
Each product has a configurable flag in the admin panel:
Time-Bound Products:
Customer must explicitly choose AM or PM
No default; selection is mandatory
Examples: Milk, water tins (configurable)
Not Time-Bound Products:
Can be delivered anytime during the day
AM/PM selection is optional
Examples: Most grocery items
## 7. PRODUCT TYPES SUPPORTED
## 7.1 Subscription Products
Any product can be configured as a subscription:
Milk (most common)
Water tins
Any grocery item (if customer wants recurring delivery)
## Subscription Configuration Options:

Frequency: Daily, alternate days, specific days of week, custom pattern
Quantity: Units per delivery
Delivery Window: AM or PM (must be specified)
Pause/Resume: Customer or staff can pause and resume subscription
Skip Dates: Ability to skip specific delivery dates (e.g., vacation)
End Date: Optional subscription end date
## Smart Subscription Features:
Pause Detection: Auto-detect unusual pauses (7+ days) and alert Support Buddy
Instant-to-Subscription Intelligence: If customer orders item 3+ times in 45 days, suggest
conversion to subscription
## Calendar Integration:
Each subscription generates dated delivery events
All future deliveries appear on calendar
Pause/resume actions update calendar in real-time
Paused dates show in orange on calendar
7.2 One-Time Orders
Single delivery items: Standard grocery items, Add-on products, Instant requests (captured during
delivery)
Conversion Feature: Any one-time order item can be converted into a subscription later.
## 8. GROCERY SYSTEM — TRUE KIRANA STYLE
8.1 Monthly Master Grocery List (Per Customer)
Core Concept: Each customer has ONE MASTER MONTHLY LIST that persists and evolves over time.
## List Characteristics:
Created once: Initial list is built during customer onboarding or first order
Reused every month: List automatically carries forward to next month
Editable anytime: Customer or staff can modify quantities or add/remove items
Acts as template: Serves as starting point for all future monthly orders
Key Benefit: Customer never starts from an empty list again. This mirrors actual household behavior
where families buy similar items each month with minor variations.
8.2 Kirana-Style Dense Grocery List UI
CRITICAL: Modern e-commerce aesthetics are WRONG for this use case. The grocery list must be
dense, text-focused, and feel familiar to traditional kirana shop customers.
## Visual Principles:
NO cards, NO tiles, NO large padding, NO images by default
Tight line spacing (no gaps between items)
Single-line items: Product Name — Brand — Quantity — Price
Visual density similar to handwritten kirana notebook
## Line Item Format Examples:

Image Display (On Demand Only):
Images shown only when item is tapped
Slide-in or modal view with product image and details
Close action returns user to same scroll position
## 8.3 Previously Ordered Items — Priority Display
Within each product category, items are sorted by purchase history:
- Previously ordered items (pinned/highlighted at top of category)
- Remaining catalog items (displayed below in standard order)
Benefit: Dramatically reduces time to find commonly purchased items. Most customers rebuy the same
20-30 products monthly.
8.4 Monthly Reuse Logic with Smart Diff
At the start of every month:
Last month's list auto-loads with all items and quantities
Quantities retained from previous order
User or staff edits quantities as required
Smart Diff View: Side-by-side comparison showing changes
## Last Month: Rice 25kg, Atta 10kg
This Month: Rice 25kg (no change), Atta 15kg (+5kg), Oil 2L (NEW)
New items can be added
Modified list becomes the new template for next month
## Calendar Integration:
Monthly list creation dates appear on calendar
Order finalization dates tracked
Payment dates linked to monthly orders
Diff view accessible from Date Detail View
## 9. ORDER CREATION ON BEHALF OF CUSTOMER
## 9.1 Support Buddy Capabilities
Support Buddies can perform all customer-facing operations using multiple input methods:
Voice: Speak grocery list in regional language
Image Upload: Photograph customer's handwritten list
Text Entry: Traditional kirana-style fast entry
Create customer account (mobile number, address, location)
Add subscriptions (milk, water, recurring groceries)
Modify quantities (adjust existing orders)
## Rice — India Gate Basmati — 25kg — ₹1,650
## Rice — India Gate Basmati — 25kg — ₹1,650
## Sugar — 1kg — ₹45
## Sugar — 1kg — ₹45
Sunflower Oil — Gold Drop — 5L — ₹890
Sunflower Oil — Gold Drop — 5L — ₹890
## Toor Dal — Loose — 2kg — ₹320
## Toor Dal — Loose — 2kg — ₹320
## Atta — Aashirvaad — 10kg — ₹450
## Atta — Aashirvaad — 10kg — ₹450

Select AM/PM (set delivery windows)
Finalize order (submit for WhatsApp confirmation)
All actions logged on calendar with Support Buddy attribution.
9.2 WhatsApp Approval Flow (Simplified with Exclusive Link)
Once Support Buddy finalizes the order:
Step 1: System sends WhatsApp message to customer
Step 2: Customer pays using exclusive link
Opens UPI app
Finds saved "EarlyBird Payment" link
Edits amount to ₹2,325
Confirms payment
Step 3: Webhook processes payment
Payment received on customer's exclusive link
Amount credited to customer wallet
Order amount auto-deducted from wallet
Order auto-approved
Step 4: Confirmations sent
Customer: "Payment received ₹2,325. Order confirmed for delivery on Jan 21 (AM)."
Support Buddy: Commission earned and credited to wallet
Delivery Buddy: Order added to tomorrow's route
Supplier: Demand updated for product fulfillment
All events logged on calendar with timestamps
## 10. PAYMENTS & LEDGER (WALLET-CENTRIC)
10.1 Payment Flow with Exclusive Links
Traditional Flow (OLD - NOT USED):
Admin creates order → generates new payment link → sends to customer
Customer confused about which link for which order
Multiple links clutter WhatsApp
Non-tech users struggle
EarlyBird Flow (NEW - EXCLUSIVE LINK):
Customer gets ONE permanent link when account is created
Hi Ramesh! Your order is ready:
Hi Ramesh! Your order is ready:
## - Rice 25kg - ₹1,650
## - Rice 25kg - ₹1,650
## - Atta 10kg - ₹450
## - Atta 10kg - ₹450
## - Sugar 5kg - ₹225
## - Sugar 5kg - ₹225
## TOTAL: ₹2,325
## TOTAL: ₹2,325
Pay using your saved EarlyBird link.
Pay using your saved EarlyBird link.
Change amount to ₹2,325 and confirm.
Change amount to ₹2,325 and confirm.

Link saved in UPI app favorites
Every WhatsApp message just mentions amount
Customer opens saved link, edits amount, pays
Webhook identifies customer from link, credits wallet
Outstanding balance auto-settled
## Benefits:
Zero confusion for non-tech customers
UPI app remembers merchant (EarlyBird) for repeat payments
No need to copy/paste different links
Works perfectly for elderly customers
## 10.2 Payment Modes
Primary: Exclusive UPI Payment Link (reusable)
QR Codes (for in-person payments)
Partial Payments (installments supported, all go to wallet)
Cash on Delivery (delivery buddy marks in app, cash goes to admin, wallet credited manually)
10.3 Ledger System (Unified with Wallet)
Every customer has a complete financial ledger showing:
Date, Item, Quantity, Amount Charged, Payment Status, Wallet Balance After Transaction
## Ledger Entries:
## Calendar Integration:
Every ledger entry appears on calendar on transaction date
Date Detail View shows all financial activity for that day
Wallet balance graph overlays on calendar
## Ledger Visibility:
Admin (full access to all customer ledgers)
Support Buddy (assigned customers only)
Customer App (own ledger only)
WhatsApp Sharing: Support Buddy can send ledger snapshot via WhatsApp
## 11. SUPPLIER INTEGRATION & AUTO-ORDERING
## 11.1 Supplier Master Data
## Supplier Profile:
Supplier name
Contact details
Jan 15: Opening Balance - ₹500 (Advance Credit) | Wallet: ₹500
Jan 15: Opening Balance - ₹500 (Advance Credit) | Wallet: ₹500
Jan 16: Milk 2L (AM) - ₹100 | Wallet: ₹400
Jan 16: Milk 2L (AM) - ₹100 | Wallet: ₹400
## Jan 17: Payment Received - ₹1,000 | Wallet: ₹1,400
## Jan 17: Payment Received - ₹1,000 | Wallet: ₹1,400
## Jan 18: Grocery Order - ₹850 | Wallet: ₹550
## Jan 18: Grocery Order - ₹850 | Wallet: ₹550
Jan 20: Milk 2L (AM) - ₹100 | Wallet: ₹450
Jan 20: Milk 2L (AM) - ₹100 | Wallet: ₹450

Products supplied (with catalog mapping)
Payment terms (immediate/7/15/30 days)
Minimum order quantity (MOQ)
Lead time (how many days advance notice needed)
Assigned admin contact
11.2 Calendar-Based Demand Forecasting
## How It Works:
- Admin views calendar for any future date (e.g., Jan 25)
- System aggregates all confirmed orders for that date
- Breaks down demand by supplier:
Supplier A (Milk): 100L required
Supplier B (Rice/Grains): 75kg rice, 50kg atta, 30kg dal
Supplier C (Vegetables): 20kg potatoes, 15kg onions
Auto-Generation of Supplier Orders:
Admin clicks "Generate Supplier Orders" for Jan 25
System creates purchase orders for each supplier
Sends via WhatsApp/Email: "Order for Jan 25 delivery: 100L milk, please confirm"
Supplier confirms in app or via WhatsApp reply
Confirmation logged on calendar Date Detail View
## 11.3 Supplier Calendar View
Supplier sees:
Upcoming order forecasts (7-day, 14-day, 30-day views)
Confirmed orders with delivery dates
Payment due dates
Past delivery history
## Example Supplier Calendar:
11.4 Inventory Alerts on Calendar
## Stock Status Overlay:
System calculates current stock vs. upcoming demand
If Jan 23 shows 150L milk demand but stock is only 80L → RED ALERT on Jan 23
Date Detail View shows: "⚠ Stock shortage: Need 150L, have 80L. Order 70L from Supplier A
urgently."
## Calendar Integration:
Stock alerts appear as red badges on calendar dates
Admin can click date → see exact shortage → one-click create supplier order
Jan 20: No orders
Jan 20: No orders
Jan 21: 100L Milk - Confirmed ✅
Jan 21: 100L Milk - Confirmed ✅
Jan 22: 120L Milk - Pending Confirmation ⏳
Jan 22: 120L Milk - Pending Confirmation ⏳
Jan 23: 90L Milk - Forecasted 
Jan 23: 90L Milk - Forecasted 
Jan 24: 110L Milk - Forecasted 
Jan 24: 110L Milk - Forecasted 
## Jan 25: Payment Due ₹15,000 
## Jan 25: Payment Due ₹15,000 

Prevents confirming orders you can't fulfill
## 12. ADVANCED FEATURES (TIER 1 - BUILD IMMEDIATELY)
## 12.1 Calendar Heat Map
Visual density layer on month view showing delivery volume by color intensity (already described in
section 2.1).
## 12.2 Smart Subscription Pause Detection
Auto-detect unusual subscription patterns:
Paused >7 days → Support Buddy alert
Paused 3+ times in 30 days → churn risk flag
No reactivation after 14 days → escalation to admin
Calendar Integration: Paused dates show orange, alerts appear on Date Detail View
12.3 Instant-to-Subscription Intelligence
When Delivery Buddy captures instant order, system checks history:
"Customer ordered Bread 4 times in last 45 days"
Show popup: "Suggest subscription?" → One-tap sends WhatsApp offer
Calendar Integration: Analysis shows past order dates on mini-calendar popup
## 12.4 First 30 Days Customer Journey Tracker
Milestone tracking for new customers:
Day 0: Account created
Day 1-3: First order ✅
Day 3-5: First payment ✅
Day 7: First subscription ✅
Day 14: Second order ✅
Day 30: Retention confirmed ✅
Calendar Integration: Milestones shown as badges on customer calendar, Support Buddy alerted on
delays
## 12.5 Payment Reminder Escalation Logic
Smart reminder sequence:
Day 1-3: Gentle reminder
Day 4-7: Balance warning
Day 8-10: Support Buddy call trigger
Day 11+: Subscription pause warning
Calendar Integration: Payment due dates color-coded (yellow → orange → red)
## 12.6 Delivery Time Slot Prediction
Analyze past delivery timestamps:
Customer consistently receives at 6:15-6:45 AM
Auto-suggest "Preferred: AM (6:00-7:00)" for new subscriptions

Calendar Integration: Time preferences shown as icons on calendar dates
## 12.7 Monthly List Smart Diff View
Side-by-side comparison when editing monthly list (already described in 8.4)
12.8 Route Deviation Alerts with GPS
If Delivery Buddy deviates >500m, app asks reason and logs for optimization
Calendar Integration: Deviation events logged on Date Detail View with GPS trail
12.9 Customer Trust Score (Internal)
Composite score: Payment punctuality (40%), Subscription stability (30%), Order frequency (20%),
## Feedback (10%)
Calendar Integration: Score badge on customer calendar, trend graph on Date Detail View
12.10 Ledger Snapshot WhatsApp Sharing
Support Buddy generates and sends ledger summary with payment link via WhatsApp
Calendar Integration: Ledger share logged on Date Detail View
## 13. ADVANCED FEATURES (TIER 2 - BUILD AFTER MVP)
13.1 Festival/Season Template Lists
Pre-configured templates:
Diwali: Sweets, dry fruits, oil, ghee
Ramadan: Dates, special items
Monsoon: Ginger, turmeric, immunity items
Calendar Integration: Festival dates auto-marked with template suggestion badges
## 13.2 Family Event Tracker
Store birthdays/anniversaries

## EARLYBIRD: ADVANCED FEATURES SPECIFICATION
Supplementary to Main PRD v3.0
##  TIER 2: BUILD AFTER MVP STABLE
13.1 Festival/Season Template Lists
What: Pre-configured grocery templates for seasonal events
## Templates Available:
Diwali Pack: Sweets (2kg), Dry fruits (1kg), Refined oil (5L), Ghee (1kg), Decorative items
Ramadan Essentials: Dates (2kg), Special grains, Increased milk quantity
Monsoon Immunity: Ginger (500g), Turmeric (200g), Honey (500ml), Tulsi, Seasonal vegetables
Wedding Season: Bulk rice (50kg), Dal (25kg), Oil (20L), Disposables
## Holi Special: Colors, Snacks, Beverages, Sweets
## How It Works:
- Admin creates festival templates with recommended items and quantities
- System auto-detects upcoming festivals based on calendar
- 7 days before festival, Support Buddy gets alert: "Diwali on Nov 12. Send template to active
customers?"
- Support Buddy selects customers to receive template
- WhatsApp sent: "Hi! Diwali is coming. We've prepared a special list for you: [items]. Want to add
these to your order?"
- Customer responds or Support Buddy adds items directly
- One-tap adds entire template to monthly list
## Benefits:
Drives basket size during peak seasons (30-50% higher AOV)
Reduces Support Buddy effort (no manual list creation)
Customers appreciate timely reminders
## Calendar Integration:
Festival dates marked on calendar with  icon
Date Detail View shows "Festival Template Sent" events
Track conversion: template sent → order placed
Admin dashboard shows festival campaign performance by date
13.2 Family Event Tracker with Auto-Suggestions
What: Store family birthdays/anniversaries and auto-suggest celebratory items
## Setup:
Support Buddy or customer enters family member details during onboarding
Name, Relationship (wife, son, daughter, mother), Date of birth/Anniversary
Auto-Suggestions:

- 5 days before birthday, Support Buddy gets alert
- System suggests: Cake (1kg), Sweets (500g), Party snacks, Beverages
- Support Buddy calls/messages: "Hi Ramesh! Your son's birthday is on Jan 25. Would you like to
add cake and sweets to your order?"
- Customer confirms, items added
- Order scheduled for delivery on birthday date (or day before)
## Why It Matters:
Builds deep customer relationship ("they remember my family!")
Captures high-value occasional orders
Increases customer lifetime value
Creates emotional connection beyond transactional relationship
## Calendar Integration:
Birthday/anniversary dates shown as  icons on calendar
Date Detail View shows upcoming events with suggested items
Track: Event reminded → Order placed → Customer retention impact
13.3 Daily Delivery Brief Auto-Message
What: Morning WhatsApp message to Delivery Buddies with day's overview
Sent At: 6:00 AM every day
## Message Format:
## Benefits:
Sets clear expectations
Motivates with yesterday's achievement
Highlights challenges (new addresses)
Earnings transparency drives performance
## Calendar Integration:
Brief generation logged on today's Date Detail View
Track: Brief sent → Delivery completion rate correlation
Admin can review which Delivery Buddies opened route link
 Good morning Rajesh!
 Good morning Rajesh!
##  Today: Monday, Jan 20, 2026
##  Today: Monday, Jan 20, 2026
##  Your Deliveries:
##  Your Deliveries:
- 47 total (32 AM, 15 PM)
- 47 total (32 AM, 15 PM)
- 3 new addresses ⚠
- 3 new addresses ⚠
- 2 subscription changes
- 2 subscription changes
 Route: [Optimized map link]
 Route: [Optimized map link]
✅ Yesterday: 45/45 completed
✅ Yesterday: 45/45 completed
 Earnings: ₹1,450 (today's potential: ₹1,620)
 Earnings: ₹1,450 (today's potential: ₹1,620)
Have a great day!
Have a great day!

13.4 Customer Referral Program with Staff Attribution
What: Track referrals with dual attribution to Support and Delivery Buddies
## How It Works:
- Customer refers friend (via WhatsApp share link or verbal)
- Friend signs up mentioning referrer name
- System identifies:
Referring customer (Ramesh)
Ramesh's Support Buddy (Priya)
Ramesh's Delivery Buddy (Rajesh)
- When referred friend places first order:
Referring customer: ₹100 wallet credit
Priya (Support): ₹50 commission (60% of staff bonus)
Rajesh (Delivery): ₹30 commission (40% of staff bonus)
## Referral Tracking:
Unique referral link per customer: earlybird.app/r/[CUSTOMER_ID]
QR code in WhatsApp status/delivery receipts
Verbal referrals: Friend enters referrer mobile during signup
## Calendar Integration:
Referral signup date logged on all three parties' calendars
Date Detail View shows referral chain
Track: Referral → First order → Subscription conversion timeline
Admin sees referral network visualization on calendar
## 13.5 Last Mile Intelligence Capture
What: Delivery Buddies log field observations during delivery
Quick-Tap Buttons in App:
 "Family size changed" (more/fewer people noticed)
 "Competitor product spotted" (BigBasket/Dunzo/Local dairy visible)
 "Customer asked about [category]" (e.g., "Do you sell organic vegetables?")
 "Complaint: Quality/Timing/Price"
⭐ "Compliment: Good service"
 "Address issue: Difficult to find"
## How It Works:
- Delivery Buddy completes delivery
- Before marking "Delivered", sees "Add intelligence note?" (optional, non-intrusive)
- Quick-taps relevant buttons
- Adds brief text if needed (voice input enabled)
- Note logged with timestamp and GPS location

## Intelligence Flow:
Competitor Spotted: Alert to Admin + Support Buddy → Proactive retention call
Product Inquiry: Alert to Support Buddy → Follow-up with product info
Complaint: Immediate escalation to Admin → Resolution within 24 hours
Family Size Changed: Update customer profile → Adjust monthly list suggestions
## Calendar Integration:
Intelligence notes logged on delivery date's Date Detail View
Admin calendar can filter to show:
All competitor sightings by date
All product inquiries by category
All complaints by type
Heatmap: Which routes have most competitor presence
## Analytics:
Competitor threat level by area/route
Product category demand not being fulfilled
Service quality trends over time
Address/route optimization insights
13.6 WhatsApp Broadcast Segmentation Engine
What: Send targeted broadcasts based on purchase behavior
Segments Auto-Created:
- Heavy Milk Buyers: >10L/month
- Premium Grocery Buyers: AOV >₹3,000/month
- Subscription-Only Customers: No one-time orders in 60 days
- Inactive 30+ Days: No orders in last month
- High Wallet Balance: >₹500 advance credit unused
- Frequent Pausers: Paused subscriptions 3+ times in 90 days
- Payment Prompt: Pay within 1 day consistently
- Payment Delayed: Average 7+ days to pay
## Broadcast Campaigns:
New Product Launch: Send to relevant segment (e.g., premium buyers for organic range)
Win-Back Offer: Inactive customers get ₹100 off next order
Subscription Upsell: One-time order customers get "Subscribe & Save 10%"
Wallet Reminder: High balance customers reminded to use credit
Broadcast Rules (Anti-Spam):
Maximum 2 broadcasts per customer per week
No broadcasts before 9 AM or after 8 PM
Unsubscribe option in every broadcast
A/B testing: Send to 20% first, analyze response, then send to rest
## Calendar Integration:

Broadcast campaign dates marked on Admin calendar
Date Detail View shows:
Which customers received broadcast
Open rate (if using WhatsApp Business API click tracking)
Conversion rate (broadcast → order within 7 days)
Compare campaign performance by send date
13.7 Product Availability Status on Calendar
What: Overlay stock levels on future calendar dates
## How It Works:
- System tracks current inventory for each product
- Analyzes upcoming orders on calendar for next 14 days
- Calculates daily stock requirement
- Flags dates where stock will be insufficient
## Visual Indicators:
Green ✅: Adequate stock (>150% of requirement)
Yellow ⚠: Low stock (100-150% of requirement)
Red : Insufficient stock (<100% of requirement)
Example on Calendar:
## Proactive Actions:
Support Buddy sees warning when creating order for affected date
Auto-suggest substitute products: "Basmati Rice low stock. Suggest India Gate Sona Masoori
instead?"
Admin gets daily report: "Stock alerts for next 7 days"
One-click create supplier order from stock alert
## Calendar Integration:
Stock status shown as colored dots on calendar dates
Date Detail View shows exact shortage details
Supplier order link directly from stock alert
Track: Alert generated → Supplier order placed → Stock replenished
## 13.8 Competitor Price Tracking
What: Admin tracks competitor prices for key products
## Setup:
- Admin designates "Key Products" (top 20 by volume)
- Weekly, admin inputs competitor prices from local stores/apps:
Jan 22:  Basmati Rice (Need 75kg, Have 40kg - SHORT 35kg)
Jan 22:  Basmati Rice (Need 75kg, Have 40kg - SHORT 35kg)
Jan 23: ⚠ Sunflower Oil (Need 20L, Have 25L - Low stock)
Jan 23: ⚠ Sunflower Oil (Need 20L, Have 25L - Low stock)
Jan 25:  Aashirvaad Atta (Need 100kg, Have 60kg - SHORT 40kg)
Jan 25:  Aashirvaad Atta (Need 100kg, Have 60kg - SHORT 40kg)

BigBasket: Basmati Rice 25kg - ₹1,800
Local Dairy: Milk 1L - ₹55
## Dunzo: Atta 10kg - ₹440
## System Calculates:
EarlyBird vs. BigBasket: -8% (we're cheaper)
EarlyBird vs. Local Dairy: +10% (we're costlier)
EarlyBird vs. Dunzo: +2% (roughly equal)
## Support Buddy Toolkit:
When customer questions price, Support Buddy opens product
Sees: "Our price: ₹1,650. BigBasket: ₹1,800 (You save ₹150!)"
Or: "Our price: ₹55. Local dairy: ₹50 (₹5 more, but we deliver twice daily and you never run out)"
## Why Price Difference Justified:
Home delivery (no travel time/cost)
Twice daily delivery (morning & evening)
Never out of stock
Personal relationship with Support Buddy
Flexible payment (wallet, credit)
## Calendar Integration:
Price updates logged on calendar (admin can see when prices were last checked)
Date Detail View shows price comparison trends over time
Alert if competitor significantly undercuts EarlyBird
## ⚡ TIER 3: ENHANCEMENT PHASE (COMPETITIVE MOATS)
## 14.1 Predictive Subscription Churn Model
What: Machine learning analyzes calendar patterns to predict churn
## Data Inputs:
Subscription pause frequency over 90 days
Payment delay trends (days to pay increasing?)
Order quantity reduction (used to order 4L milk, now 2L)
Monthly grocery order skipped
Customer interaction frequency with Support Buddy
Competitor intelligence notes from Delivery Buddy
## Churn Risk Score: 0-100%
0-30% (Green): Stable customer, low risk
31-60% (Yellow): Moderate risk, watch closely
61-100% (Red): High risk, immediate intervention needed
## When Score >60%, System Triggers:
- Alert to Support Buddy: "Ramesh shows 73% churn risk. Call within 48 hours."

- Support Buddy calls customer: "Haven't seen you in a while. Everything okay? Any issues with
quality/delivery/price?"
- Offer retention incentive: "Here's ₹100 wallet credit as a loyal customer bonus"
- Log call outcome: "Customer was traveling, reactivating subscription"
- Update churn score based on outcome
## Calendar Integration:
Churn risk score badge on customer calendar
Date Detail View shows risk factors with specific examples
Track: Churn alert → Support intervention → Outcome (saved/lost)
Admin sees monthly "Customers Saved" vs. "Customers Lost" on calendar
Success Metric: Reduce churn by 40-50% through early intervention
14.2 Dynamic Pricing Based on Calendar Demand
What: Adjust prices based on forecasted demand from calendar
Pricing Rules (Admin Configurable):
Surge Pricing: If tomorrow shows >150 milk orders (high demand) → +₹2/L
Promotional Pricing: If tomorrow shows <80 milk orders (low demand) → -₹1/L discount
Weekend Bulk Discounts: Saturday/Sunday grocery orders >₹2,000 → 5% off
Festival Premium: Diwali week high-demand items → +10% (customers expect it)
## How It Works:
- System analyzes confirmed orders on calendar for next day
- Applies pricing rules
- New prices take effect at midnight
- WhatsApp broadcast to active customers: "Tomorrow only: Milk ₹1 off per liter!"
## Customer Communication:
Always show original price + discount: "₹52 ₹51 (₹1 off today!)"
Surge pricing shown as "High demand, limited stock available"
## Calendar Integration:
Pricing tiers shown on Date Detail View
Track: Dynamic pricing → Order volume → Revenue impact
A/B test different pricing strategies by date
## 14.3 Supplier Integration Calendar
What: Real-time supplier collaboration via calendar
## Supplier Calendar Features:
- Demand Forecast: See EarlyBird's expected orders 7-14 days ahead
- Delivery Commitments: Confirm delivery dates
- Stock Alerts: Notify EarlyBird if unable to fulfill (e.g., "Can only supply 70L milk on Jan 23, not
## 100L")

- Payment Tracking: See due dates and payment history
## Example Supplier View:
Auto-Order Generation:
Admin clicks "Generate Supplier Orders" on Jan 20 for Jan 23
System calculates: 90L milk needed based on confirmed customer orders
Creates PO for Supplier A: "Supply 90L milk on Jan 23 (AM delivery)"
Sends WhatsApp: "New order for Jan 23: 90L. Confirm by 6 PM today."
Supplier confirms in app or replies "Confirmed"
Confirmation logged on calendar
## Stock Shortage Handling:
Supplier replies: "Can only supply 60L on Jan 23"
System alerts Admin: "Supplier A can only fulfill 67% of requirement"
Admin options:
Find alternate supplier for remaining 30L
Reduce customer allocations proportionally
Proactively message customers about shortage with substitute offer
## Calendar Integration:
Supplier orders appear on Admin calendar on order date
Expected delivery dates marked
Date Detail View shows: Order placed → Supplier confirmed → Delivery received → Payment due
14.4 Weather Integration for Delivery Planning
What: Overlay weather forecast on calendar to manage expectations
## Weather Data Sources:
API integration with weather service (OpenWeatherMap, AccuWeather)
7-day forecast updated daily
## Calendar Display:
Weather icons on each date: ☀ Clear,  Partly Cloudy,  Rain, ⛈ Heavy Rain
Temperature range
Rain probability
## Operational Impact:
- Heavy Rain Forecast (Jan 22):
Admin sees ⛈ on Jan 22
Date Detail View shows: "Heavy rain expected. Plan 30-60 min delivery delays."
Jan 21: 100L Milk - Confirmed ✅ (Delivered)
Jan 21: 100L Milk - Confirmed ✅ (Delivered)
Jan 22: 120L Milk - Confirmed ✅ (Ready)
Jan 22: 120L Milk - Confirmed ✅ (Ready)
Jan 23: 90L Milk - Pending Confirmation ⏳
Jan 23: 90L Milk - Pending Confirmation ⏳
Jan 24: 110L Milk - Forecasted  (Not confirmed yet)
Jan 24: 110L Milk - Forecasted  (Not confirmed yet)
## Jan 25: Payment Due - ₹15,000 
## Jan 25: Payment Due - ₹15,000 

Auto-WhatsApp to all Jan 22 AM customers at 5:30 AM: "Weather alert: Heavy rain today.
Your delivery may be 30-60 min late. We appreciate your patience!"
- Clear Weather (Jan 24):
Ideal for bulk deliveries
Schedule large grocery orders for this day
Plan route optimization without weather delays
- Extreme Weather (Storm/Flood):
Admin can bulk-reschedule deliveries to next day
WhatsApp: "Due to severe weather, today's delivery rescheduled to tomorrow (same time).
Stay safe!"
## Calendar Integration:
Weather icons visible on month view calendar
Date Detail View shows hourly forecast for AM/PM planning
Track: Weather delays → Customer complaints correlation
Improve forecasting: "Heavy rain days average 45 min delay, adjust routes accordingly"
14.5 Multi-Language Calendar Interface
What: Calendar labels and event names in user's preferred language
## Supported Languages:
## Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati, English
## What Gets Translated:
Day/Month names
Event types: "Milk Delivery" → "दूध की िडलीवरी"
Status labels: "Confirmed" → "உறுதிப்படுத்தப்பட்டது"
Button text: "Add Order" → "ఆ
## ర
##  ర్ జోడించండి"
## Data Integrity:
Core data (product names, quantities, prices) remain in database language
UI layer translates for display
Voice and image inputs work in regional languages
## Benefits:
Staff with varying literacy levels can use app comfortably
Customers feel respected (seeing their language)
Reduces training time for new staff
## Calendar Integration:
User selects language in settings
Entire calendar interface renders in chosen language
Event details shown in user's language while maintaining searchability

14.6 Delivery Buddy Earnings Leaderboard (Gamification)
What: Competitive rankings to drive performance
## Leaderboard Views:
Daily: Top performers today
Weekly: Top 10 earners this week
Monthly: Top 20 earners this month
All-Time: Hall of fame
## Ranking Display:
## Achievement Badges:
##  "100 Deliveries Streak"
⚡ "Zero Complaints Month"
 "₹10K Club"
 "Instant Order Champion" (most instant orders captured)
⭐ "Customer Favorite" (highest positive feedback)
 "Month's Top Earner"
## Rewards:
Badges displayed on profile (visible to peers)
Monthly winner gets bonus: ₹1,000 extra
Quarterly winner gets special recognition + ₹5,000
Annual champion gets paid trip/gift
## Calendar Integration:
Leaderboard calculated from calendar event data (deliveries, commissions by date)
Date Detail View shows individual daily contribution to monthly rank
Admin can see historical leaderboard by month (click past months on calendar)
## Psychology:
Healthy competition drives performance without creating toxic environment
Recognition matters as much as monetary rewards
Transparent criteria builds trust
## 磊 #1 Ramesh Kumar - ₹12,450
## 磊 #1 Ramesh Kumar - ₹12,450


- 145 deliveries
- 145 deliveries


- 8 instant orders captured
- 8 instant orders captured


- 2 subscriptions converted
- 2 subscriptions converted


- Zero complaints this month
- Zero complaints this month
## 賂 #2 Suresh Patil - ₹11,200
## 賂 #2 Suresh Patil - ₹11,200


- 138 deliveries
- 138 deliveries


- 6 instant orders captured
- 6 instant orders captured


- 1 subscription converted
- 1 subscription converted


- 1 complaint resolved
- 1 complaint resolved
## 雷 #3 Mahesh Reddy - ₹10,800
## 雷 #3 Mahesh Reddy - ₹10,800


- 142 deliveries
- 142 deliveries


- 4 instant orders captured
- 4 instant orders captured


- 98% on-time delivery rate
- 98% on-time delivery rate

## 14.7 Support Buddy Activity Heatmap
What: Visual representation of when Support Buddies are most productive
## Data Tracked:
Orders created (by hour of day)
Customer calls made
Payments followed up
Voice/image orders processed
Heatmap Display (Admin View):
## Insights:
Peak Hours: 9-11 AM (most orders created)
Low Hours: Post 4 PM (need incentive to work evening shift?)
Weekend: Minimal activity (need weekend staff?)
## Admin Actions:
Optimize shift timings based on heatmap
Identify underperformers: "Priya creates 40 orders/day, Sneha only 15"
Training opportunities: "Why is Sneha less productive?"
Reward high-activity hours: "Bonus for orders created 9-11 AM"
## Calendar Integration:
Activity heatmap overlays on Admin calendar
Date Detail View shows per-buddy hourly breakdown
Compare: "Priya was 40% more active this week vs. last week"
## 14.8 Emergency Contact Escalation Chain
What: Systematic handling of failed delivery attempts
## Escalation Flow:
- Attempt 1: Delivery Buddy calls customer primary number
## Support Buddy: Priya Sharma
## Support Buddy: Priya Sharma


## Mon   Tue   Wed   Thu   Fri   Sat   Sun
## Mon   Tue   Wed   Thu   Fri   Sat   Sun
## 9-10                            
## 9-10                            
## 10-11                           
## 10-11                           
## 11-12                           
## 11-12                           
12-1                             (Lunch)
12-1                             (Lunch)
1-2                              (Lunch)
1-2                              (Lunch)
## 2-3                             
## 2-3                             
## 3-4                             
## 3-4                             
## 4-5                             
## 4-5                             
## 5-6                             
## 5-6                             
 High activity (8+ actions/hour)
 High activity (8+ actions/hour)
 Moderate (3-7 actions/hour)
 Moderate (3-7 actions/hour)
 Low/None (0-2 actions/hour)
 Low/None (0-2 actions/hour)

No answer → Wait 5 min, try again
- Attempt 2: Call alternate number (if registered)
No answer → Escalate to Step 3
- Attempt 3: WhatsApp Support Buddy assigned to customer
"Customer unreachable for delivery. Please contact."
Support Buddy WhatsApp messages customer
- Attempt 4 (If no response in 30 min): Support Buddy calls customer
If reached: Confirm delivery time, re-attempt
If still unreachable: Escalate to Step 5
- Attempt 5: Flag to Admin + Hold delivery
Admin decides: Leave with neighbor, return to warehouse, reschedule
Customer charged for delivery attempt if rescheduled
## Logging:
Every attempt logged on Date Detail View with timestamp
Reason for failure: "Customer phone switched off", "Wrong address", "Out of town"
Resolution: "Rescheduled to next day", "Delivered to neighbor"
## Calendar Integration:
Failed delivery marked with ⚠ on calendar date
Escalation timeline visible on Date Detail View
Admin can review patterns: "Address XYZ has 3 failed deliveries this month - address issue?"
## Benefits:
Reduces completely failed deliveries (from 5% to <1%)
Systematic process, no ad-hoc decisions
Customer feels effort was made (multiple attempts)
14.9 Customer Calendar Sharing with Family
What: Allow customer to share delivery calendar with household members
## How It Works:
- Customer clicks "Share Calendar" in app
- Generates shareable link: earlybird.app/calendar/[ENCRYPTED_CUSTOMER_ID]
- Customer sends link to family WhatsApp group
- Family members open link (no login needed)
- See view-only calendar with upcoming deliveries
## What Family Sees:

## Benefits:
Household coordination: "I'll be home for AM delivery"
Transparency: Everyone knows what's being delivered when
Reduces missed deliveries: Someone is always aware of schedule
Family can request additions: "Mom, add butter to tomorrow's order"
## Security:
View-only access (can't edit orders)
Encrypted link expires after 90 days (renewable)
Customer can revoke access anytime
## Calendar Integration:
Shared calendar syncs with customer's main calendar in real-time
Updates immediately when orders change
Shows same Date Detail View but without financial information (prices/payments hidden for
privacy)
## 14.10 Bulk Action Calendar Interface
What: Admin can select multiple dates and apply actions at once
## Use Cases:
## 1. Festival Week Closure:
Admin selects Jan 26-28 on calendar
Clicks "Bulk Action" → "Pause All Subscriptions"
WhatsApp auto-sent: "EarlyBird closed for festival. Deliveries resume Jan 29."
## 2. Seasonal Pricing:
Select all Sundays in February
Apply "Weekend Discount: 5% off grocery orders >₹2,000"
## 3. Payment Reminders:
Select today's date (Jan 20)
Filter: "Customers with outstanding balance >₹500"
Click "Send Payment Reminder to All"
Bulk WhatsApp with payment links sent
## 4. Route Reassignment:
## Your Deliveries:
## Your Deliveries:
Jan 21 (Mon): Milk 2L - AM (6:00-7:00)
Jan 21 (Mon): Milk 2L - AM (6:00-7:00)
Jan 22 (Tue): Milk 2L - AM (6:00-7:00)
Jan 22 (Tue): Milk 2L - AM (6:00-7:00)
Jan 23 (Wed): Milk 2L + Grocery - AM (6:00-7:00)
Jan 23 (Wed): Milk 2L + Grocery - AM (6:00-7:00)


## • Rice 25kg
## • Rice 25kg


## • Atta 10kg
## • Atta 10kg


- Oil 2L
- Oil 2L
Jan 24 (Thu): Milk 2L - AM (6:00-7:00)
Jan 24 (Thu): Milk 2L - AM (6:00-7:00)

## Select Jan 25-31
Change Delivery Buddy for Route 3: "Ramesh → Suresh (Ramesh on leave)"
All customers on Route 3 notified: "Suresh will deliver next week"
## How It Works:
- Admin long-presses first date on calendar → Enters multi-select mode
- Taps additional dates (or drags to select range)
- Selected dates highlighted in blue
- "Bulk Action" button appears
- Menu shows: Pause subscriptions, Apply pricing, Send reminders, Reassign routes, etc.
- Confirm action → Applied to all selected dates
## Safety:
Preview affected customers/orders before confirming
"This will affect 247 orders across 3 days. Confirm?"
Undo option for 24 hours
## Calendar Integration:
Bulk actions logged on each affected date's Detail View
Admin can review: "What bulk actions were applied on Jan 26?"
Audit trail maintained
##  EXPECTED OUTCOMES FROM ADVANCED FEATURES
If these features are implemented respecting calendar-centric architecture:
## Customer Metrics:
Retention: 85%+ subscription renewal (from churn prediction + early intervention)
Basket Size: 30-40% increase during festivals (from templates + event tracking)
Payment Collection: 95%+ within 10 days (from smart escalation + exclusive links)
Delivery Success: 98%+ first attempt (from time prediction + weather + emergency escalation)
## Staff Metrics:
Productivity: 40% more orders per Support Buddy (from voice + image + templates)
Earnings Transparency: 90%+ staff satisfaction (from real-time wallet + leaderboard)
Retention: 60% lower staff turnover (from gamification + recognition)
## Operational Metrics:
Inventory Efficiency: 30% reduction in wastage (from calendar demand forecasting)
Supplier Coordination: 95% on-time fulfillment (from calendar integration)
Route Optimization: 25% faster deliveries (from GPS + weather + time prediction)
## Competitive Defense:
Churn to Competitors: 60% reduction (from trust score + last-mile intelligence + proactive
intervention)
Price Objections: 40% reduction (from competitor tracking + value justification)

Referral Growth: 25% of new customers from referrals (from attribution + incentives)
##  IMPLEMENTATION PRIORITY SUMMARY
Build First (Tier 1 - Weeks 1-8):
## 1. Calendar Heat Map
## 2. Smart Subscription Pause Detection
- Instant-to-Subscription Intelligence
## 4. First 30 Days Journey Tracker
## 5. Payment Reminder Escalation
## 6. Delivery Time Prediction
## 7. Monthly List Smart Diff
## 8. Route Deviation Alerts
## 9. Customer Trust Score
- Ledger WhatsApp Sharing
Build Next (Tier 2 - Weeks 9-16):
## 1. Festival Templates
## 2. Family Event Tracker
## 3. Daily Delivery Brief
## 4. Customer Referral Program
## 5. Last Mile Intelligence
- WhatsApp Segmentation
- Product Availability on Calendar
## 8. Competitor Price Tracking
Competitive Moats (Tier 3 - Weeks 17-24):
## 1. Predictive Churn Model
## 2. Dynamic Pricing
## 3. Supplier Integration Calendar
## 4. Weather Integration
- Multi-Language Interface
## 6. Leaderboard Gamification
## 7. Support Buddy Heatmap
## 8. Emergency Escalation
## 9. Family Calendar Sharing
## 10. Bulk Calendar Actions
## ✅ CRITICAL SUCCESS FACTORS
Every feature respects these principles:
✅ Calendar remains the spine - All features accessed through or displayed on calendar
✅ Date-bound events - Every action creates timestamped calendar entries
✅ WhatsApp-first - Notifications and confirmations via WhatsApp
✅ Staff empowerment - Tools make Support/Delivery Buddies more effective

✅ No forced app usage - Customer can remain WhatsApp-only
✅ Audit transparency - All actions logged with attribution
✅ Speed over beauty - Dense UI, fast operations, minimal clicks
✅ Wallet-based - All financial transactions through wallet system
✅ Supplier integration - Calendar-driven inventory management
✅ Voice + Image - Multiple input methods for non-tech users
## ❌ ANTI-PATTERNS TO AVOID
These would break the EarlyBird philosophy:
❌ Dashboard-first analytics that hide daily operational reality
❌ Image-heavy grocery UI that slows down order creation
❌ Complex customer self-service that excludes non-tech users
❌ Hidden commission structures that erode staff trust
❌ Unattributed actions that break audit trail
❌ Date-agnostic reports that lose temporal context
❌ Multiple payment links per customer (use exclusive link only)
❌ Forcing suppliers to use complex software (keep it calendar-simple)
❌ Over-automation that removes human touch
##  COMPLETE FEATURE IMPLEMENTATION GUIDE
15.1 Voice-Based Order Entry - Technical Specification
## Technology Stack:
Speech Recognition: Google Cloud Speech-to-Text API (supports 125+ languages)
Fallback: On-device speech recognition (Android/iOS native) for offline mode
Natural Language Processing: Custom NLP model trained on grocery vocabulary
## Supported Input Formats:
## Processing Pipeline:
- Audio Capture: Support Buddy presses mic button, speaks
- Real-time Transcription: Text appears as they speak
## 3. Entity Extraction:
Identify product names: चावल → Rice
Extract quantities: पांच िकलो → 5 kg
Match to catalog: Rice → "India Gate Basmati Rice 25kg" (suggest closest match)
## 4. Confirmation Screen:
## Hindi: "पांच िकलो चावल, दो िकलो चीनी, एक लीटर तेल"
## Hindi: "पांच िकलो चावल, दो िकलो चीनी, एक लीटर तेल"
## Tamil: "ஐந்து கிேலா அரிசி, இரண்டு கிேலா சர்க்கைர"
## Tamil: "ஐந்து கிேலா அரிசி, இரண்டு கிேலா சர்க்கைர"
English: "Five kilo rice, two kilo sugar, one liter oil"
English: "Five kilo rice, two kilo sugar, one liter oil"
Mixed: "पांच िकलो rice, दो िकलो sugar" (code-switching)
Mixed: "पांच िकलो rice, दो िकलो sugar" (code-switching)

- Calendar Logging: Voice order event logged with audio clip attached
## Error Handling:
If confidence <80% on any item → highlight in yellow for review
"Did you say 'Rice 5kg' or 'Rice 15kg'?" (disambiguation)
Support Buddy can replay audio or re-record
## Performance Optimization:
Cache common phrases: "एक िकलो" → 1kg (instant recognition)
Local vocabulary: Train on regional product names
Accent adaptation: System learns from corrections
## Calendar Integration:
Date Detail View shows "Voice Order Created" event
Click event → play original audio recording
Admin can review voice accuracy: "80% transcription success rate this month"
## 15.2 Handwritten List Image Upload - Technical Specification
## Technology Stack:
OCR Engine: Google Cloud Vision API + Tesseract (fallback)
Handwriting Recognition: Custom ML model trained on Indian handwriting samples
Image Preprocessing: OpenCV for noise reduction, skew correction
## Processing Pipeline:
## Step 1: Image Capture
Support Buddy clicks "Upload List" → Camera opens OR WhatsApp image upload
Guidelines shown: "Hold phone steady, ensure good lighting, avoid shadows"
## Step 2: Image Enhancement
## Step 3: Text Detection
Detect text regions (separate lines)
Identify language (Hindi/English/Tamil/Telugu)
Extract text line by line
## Step 4: Product Parsing


## Detected Items:
## Detected Items:


## ✓ Rice - 5kg - ₹330
## ✓ Rice - 5kg - ₹330


## ✓ Sugar - 2kg - ₹90
## ✓ Sugar - 2kg - ₹90


✓ Oil - 1L - ₹178
✓ Oil - 1L - ₹178




[Edit] [Confirm] [Try Again]
[Edit] [Confirm] [Try Again]
## Original → Grayscale → Noise Reduction → Contrast Enhancement → Binarization
## Original → Grayscale → Noise Reduction → Contrast Enhancement → Binarization

Step 5: Confirmation UI
## Handling Unclear Text:
Low confidence (<75%) → Highlight in yellow
Support Buddy clicks → Original image zooms to that line
Manual correction: Type correct product/quantity
System learns from correction (ML feedback loop)
## Supported Handwriting Styles:
Print (block letters): 95% accuracy
Cursive: 80% accuracy
Mixed Hindi-English: 85% accuracy
Regional scripts (Tamil/Telugu): 75-80% accuracy
## Calendar Integration:
Date Detail View shows "Image Order Processed" event
Click event → view original image + extracted items
Track accuracy: "Average OCR confidence: 88% this month"
Admin can review failed extractions to improve model
## 15.3 Exclusive Payment Link System - Technical Specification
## Link Generation:
## Handwritten Text: "चावल - 25 िकलो"
## Handwritten Text: "चावल - 25 िकलो"
## ↓
## ↓
OCR Output: "चावल - 25 िकलो" (confidence: 92%)
OCR Output: "चावल - 25 िकलो" (confidence: 92%)
## ↓
## ↓
Entity Extraction: Product="Rice", Quantity="25", Unit="kg"
Entity Extraction: Product="Rice", Quantity="25", Unit="kg"
## ↓
## ↓
Catalog Match: "India Gate Basmati Rice 25kg - ₹1,650"
Catalog Match: "India Gate Basmati Rice 25kg - ₹1,650"
## Uploaded Image          Detected Items
## Uploaded Image          Detected Items
[Photo of list]         ✓ Rice - 25kg - ₹1,650 (92% confidence)
[Photo of list]         ✓ Rice - 25kg - ₹1,650 (92% confidence)


⚠ Atta - 10kg - ₹450 (75% confidence - verify?)
⚠ Atta - 10kg - ₹450 (75% confidence - verify?)


✓ Sugar - 5kg - ₹225 (95% confidence)
✓ Sugar - 5kg - ₹225 (95% confidence)


[Edit Items] [Confirm All]
[Edit Items] [Confirm All]
javascript

## Link Characteristics:
Permanent: Never expires (unless customer requests deactivation)
Unique: One link per customer, cryptographically secure
Amount-agnostic: Customer edits amount in UPI app before paying
Traceable: Every payment on this link auto-attributes to customer
## Payment Flow:
## Scenario 1: First Payment
- Customer signs up → System generates: pay.earlybird.app/c/Rx8kL3mN
- WhatsApp welcome message:
- Customer clicks link → UPI apps list shown (GPay, PhonePe, Paytm)
- Selects GPay → "Pay to EarlyBird" screen
- Default amount: ₹0 (customer must enter amount)
- Customer enters ₹500, completes payment
- Webhook triggers: Payment received on token Rx8kL3mN → Lookup customer → Credit wallet
Scenario 2: Repeat Payment (The Magic)
- Customer receives WhatsApp order confirmation:
(No link sent - customer already has it saved)
- Customer opens GPay app
- Goes to "Saved Merchants" or "Recent Payments"
- Finds "EarlyBird" (from previous payment)
- Clicks → Payment screen opens with last amount (₹500)
// On customer account creation
// On customer account creation
function
function


generateExclusiveLink
generateExclusiveLink
## (
## (
customerId
customerId
## )
## )


## {
## {


const
const
uniqueToken
uniqueToken
## =
## =


encrypt
encrypt
## (
## (
customerId
customerId
## +
## +
timestamp
timestamp
## +
## +
randomSalt
randomSalt
## )
## )
## ;
## ;


const
const
paymentLink
paymentLink
## =
## =


## `
## `
https://pay.earlybird.app/c/
https://pay.earlybird.app/c/
## ${
## ${
uniqueToken
uniqueToken
## }
## }
## `
## `
## ;
## ;




// Store mapping in database
// Store mapping in database


saveToDatabase
saveToDatabase
## (
## (
## {
## {


customer_id
customer_id
## :
## :
customerId
customerId
## ,
## ,


payment_token
payment_token
## :
## :
uniqueToken
uniqueToken
## ,
## ,


link_url
link_url
## :
## :
paymentLink
paymentLink
## ,
## ,


created_at
created_at
## :
## :


now
now
## (
## (
## )
## )
## ,
## ,


status
status
## :
## :


## 'active'
## 'active'


## }
## }
## )
## )
## ;
## ;




return
return
paymentLink
paymentLink
## ;
## ;
## }
## }


Welcome to EarlyBird!
Welcome to EarlyBird!




Your exclusive payment link: pay.earlybird.app/c/Rx8kL3mN
Your exclusive payment link: pay.earlybird.app/c/Rx8kL3mN




 Save this link in your UPI app. Use it for all future payments - just change the amount each time.
 Save this link in your UPI app. Use it for all future payments - just change the amount each time.


Your grocery order: ₹1,250
Your grocery order: ₹1,250


Pay using your saved EarlyBird link.
Pay using your saved EarlyBird link.

- Customer edits amount to ₹1,250 (this is key!)
- Confirms payment → Done in 10 seconds
## Webhook Processing:
Benefits for Non-Tech Customers:
No confusion: One link forever, no tracking which link for which order
UPI app memory: App remembers merchant, enables muscle-memory payments
Amount flexibility: Can pay partial, full, or advance amounts
Family-friendly: Son/daughter can save link and pay on parent's behalf
## Security Considerations:
Link doesn't contain customer ID directly (encrypted token)
HTTPS only, no HTTP fallback
Rate limiting: Max 10 payments per link per day (prevents abuse)
javascript
// When payment received on any EarlyBird link
// When payment received on any EarlyBird link
async
async


function
function


handlePaymentWebhook
handlePaymentWebhook
## (
## (
paymentData
paymentData
## )
## )


## {
## {


const
const


## {
## {
token
token
## ,
## ,
amount
amount
## ,
## ,
transaction_id
transaction_id
## ,
## ,
timestamp
timestamp
## }
## }


## =
## =
paymentData
paymentData
## ;
## ;




// Lookup customer from token
// Lookup customer from token


const
const
customer
customer
## =
## =


await
await


getCustomerByToken
getCustomerByToken
## (
## (
token
token
## )
## )
## ;
## ;




if
if


## (
## (
## !
## !
customer
customer
## )
## )


## {
## {


logError
logError
## (
## (
'Unknown payment token'
'Unknown payment token'
## )
## )
## ;
## ;


return
return


## 'refund'
## 'refund'
## ;
## ;


## }
## }




// Credit wallet
// Credit wallet


await
await


creditWallet
creditWallet
## (
## (
## {
## {


customer_id
customer_id
## :
## :
customer
customer
## .
## .
id
id
## ,
## ,


amount
amount
## :
## :
amount
amount
## ,
## ,


transaction_id
transaction_id
## :
## :
transaction_id
transaction_id
## ,
## ,


transaction_date
transaction_date
## :
## :
timestamp
timestamp
## ,
## ,


source
source
## :
## :


## 'exclusive_link_payment'
## 'exclusive_link_payment'


## }
## }
## )
## )
## ;
## ;




// Auto-settle outstanding balance
// Auto-settle outstanding balance


await
await


settleOutstandingBalance
settleOutstandingBalance
## (
## (
customer
customer
## .
## .
id
id
## )
## )
## ;
## ;




// Send confirmation WhatsApp
// Send confirmation WhatsApp


await
await


sendWhatsApp
sendWhatsApp
## (
## (
customer
customer
## .
## .
mobile
mobile
## ,
## ,




## `
## `
✅ Payment received: ₹
✅ Payment received: ₹
## ${
## ${
amount
amount
## }
## }
 Wallet balance: ₹
 Wallet balance: ₹
## ${
## ${
customer
customer
## .
## .
wallet_balance
wallet_balance
## }
## }
##  Outstanding: ₹
##  Outstanding: ₹
## ${
## ${
customer
customer
## .
## .
outstanding_balance
outstanding_balance
## }
## }
## `
## `


## )
## )
## ;
## ;




// Log on calendar
// Log on calendar


await
await


logCalendarEvent
logCalendarEvent
## (
## (
## {
## {


customer_id
customer_id
## :
## :
customer
customer
## .
## .
id
id
## ,
## ,


event_type
event_type
## :
## :


## 'PAYMENT_RECEIVED'
## 'PAYMENT_RECEIVED'
## ,
## ,


event_date
event_date
## :
## :


today
today
## (
## (
## )
## )
## ,
## ,


event_time
event_time
## :
## :


now
now
## (
## (
## )
## )
## ,
## ,


amount
amount
## :
## :
amount
amount
## ,
## ,


payment_method
payment_method
## :
## :


## 'exclusive_link'
## 'exclusive_link'


## }
## }
## )
## )
## ;
## ;
## }
## }

Fraud detection: If unusual amount paid (>₹50,000), admin alert
## Calendar Integration:
Payment link generation logged on customer account creation date
Every payment using link logged on payment date
Date Detail View shows payment source: "Exclusive Link (saved in GPay)"
## 15.4 Wallet System - Complete Technical Specification
## Database Schema:
## Wallet Operations:
- Customer Pays (Wallet Credit):
sql
## -- Customer Wallet Table
## -- Customer Wallet Table
## CREATE
## CREATE


## TABLE
## TABLE
customer_wallets
customer_wallets
## (
## (
wallet_id UUID
wallet_id UUID
## PRIMARY
## PRIMARY


## KEY
## KEY
## ,
## ,
customer_id UUID
customer_id UUID
## REFERENCES
## REFERENCES
customers
customers
## (
## (
id
id
## )
## )
## ,
## ,
balance
balance
## DECIMAL
## DECIMAL
## (
## (
## 10
## 10
## ,
## ,
## 2
## 2
## )
## )


## DEFAULT
## DEFAULT


## 0.00
## 0.00
## ,
## ,
lifetime_credits
lifetime_credits
## DECIMAL
## DECIMAL
## (
## (
## 10
## 10
## ,
## ,
## 2
## 2
## )
## )


## DEFAULT
## DEFAULT


## 0.00
## 0.00
## ,
## ,
lifetime_debits
lifetime_debits
## DECIMAL
## DECIMAL
## (
## (
## 10
## 10
## ,
## ,
## 2
## 2
## )
## )


## DEFAULT
## DEFAULT


## 0.00
## 0.00
## ,
## ,
created_at
created_at
## TIMESTAMP
## TIMESTAMP
## ,
## ,
updated_at
updated_at
## TIMESTAMP
## TIMESTAMP
## )
## )
## ;
## ;
## -- Wallet Transaction Table
## -- Wallet Transaction Table
## CREATE
## CREATE


## TABLE
## TABLE
wallet_transactions
wallet_transactions
## (
## (
transaction_id UUID
transaction_id UUID
## PRIMARY
## PRIMARY


## KEY
## KEY
## ,
## ,
wallet_id UUID
wallet_id UUID
## REFERENCES
## REFERENCES
customer_wallets
customer_wallets
## (
## (
wallet_id
wallet_id
## )
## )
## ,
## ,
transaction_type
transaction_type
## ENUM
## ENUM
## (
## (
## 'credit'
## 'credit'
## ,
## ,


## 'debit'
## 'debit'
## )
## )
## ,
## ,
amount
amount
## DECIMAL
## DECIMAL
## (
## (
## 10
## 10
## ,
## ,
## 2
## 2
## )
## )
## ,
## ,
transaction_date
transaction_date
## DATE
## DATE
## ,
## ,
transaction_time
transaction_time
## TIMESTAMP
## TIMESTAMP
## ,
## ,
source
source
## ENUM
## ENUM
## (
## (
## 'payment_received'
## 'payment_received'
## ,
## ,


## 'order_deduction'
## 'order_deduction'
## ,
## ,


## 'refund'
## 'refund'
## ,
## ,


## 'opening_balance'
## 'opening_balance'
## ,
## ,


## 'bonus'
## 'bonus'
## )
## )
## ,
## ,
reference_id UUID
reference_id UUID
## ,
## ,


-- order_id or payment_id
-- order_id or payment_id
balance_after
balance_after
## DECIMAL
## DECIMAL
## (
## (
## 10
## 10
## ,
## ,
## 2
## 2
## )
## )
## ,
## ,
description
description
## TEXT
## TEXT
## ,
## ,
created_by UUID
created_by UUID
## REFERENCES
## REFERENCES
users
users
## (
## (
id
id
## )
## )
## ,
## ,
created_at
created_at
## TIMESTAMP
## TIMESTAMP
## )
## )
## ;
## ;
-- Staff Wallet Table (similar structure)
-- Staff Wallet Table (similar structure)
## CREATE
## CREATE


## TABLE
## TABLE
staff_wallets
staff_wallets
## (
## (
wallet_id UUID
wallet_id UUID
## PRIMARY
## PRIMARY


## KEY
## KEY
## ,
## ,
staff_id UUID
staff_id UUID
## REFERENCES
## REFERENCES
staff
staff
## (
## (
id
id
## )
## )
## ,
## ,
balance
balance
## DECIMAL
## DECIMAL
## (
## (
## 10
## 10
## ,
## ,
## 2
## 2
## )
## )


## DEFAULT
## DEFAULT


## 0.00
## 0.00
## ,
## ,
pending_commission
pending_commission
## DECIMAL
## DECIMAL
## (
## (
## 10
## 10
## ,
## ,
## 2
## 2
## )
## )


## DEFAULT
## DEFAULT


## 0.00
## 0.00
## ,
## ,
paid_commission
paid_commission
## DECIMAL
## DECIMAL
## (
## (
## 10
## 10
## ,
## ,
## 2
## 2
## )
## )


## DEFAULT
## DEFAULT


## 0.00
## 0.00
## ,
## ,
withdrawal_account_number
withdrawal_account_number
## VARCHAR
## VARCHAR
## (
## (
## 50
## 50
## )
## )
## ,
## ,
ifsc_code
ifsc_code
## VARCHAR
## VARCHAR
## (
## (
## 20
## 20
## )
## )
## ,
## ,
created_at
created_at
## TIMESTAMP
## TIMESTAMP
## )
## )
## ;
## ;
javascript

- Order Placed (Wallet Debit):
async
async


function
function


processPayment
processPayment
## (
## (
customerId
customerId
## ,
## ,
amount
amount
## ,
## ,
paymentMethod
paymentMethod
## )
## )


## {
## {


const
const
wallet
wallet
## =
## =


await
await


getCustomerWallet
getCustomerWallet
## (
## (
customerId
customerId
## )
## )
## ;
## ;




// Credit wallet
// Credit wallet


const
const
transaction
transaction
## =
## =


await
await


createWalletTransaction
createWalletTransaction
## (
## (
## {
## {


wallet_id
wallet_id
## :
## :
wallet
wallet
## .
## .
id
id
## ,
## ,


transaction_type
transaction_type
## :
## :


## 'credit'
## 'credit'
## ,
## ,


amount
amount
## :
## :
amount
amount
## ,
## ,


transaction_date
transaction_date
## :
## :


today
today
## (
## (
## )
## )
## ,
## ,


transaction_time
transaction_time
## :
## :


now
now
## (
## (
## )
## )
## ,
## ,


source
source
## :
## :


## 'payment_received'
## 'payment_received'
## ,
## ,


description
description
## :
## :


## `
## `
Payment via
Payment via
## ${
## ${
paymentMethod
paymentMethod
## }
## }
## `
## `
## ,
## ,


balance_after
balance_after
## :
## :
wallet
wallet
## .
## .
balance
balance


## +
## +
amount
amount


## }
## }
## )
## )
## ;
## ;




// Update wallet balance
// Update wallet balance


await
await


updateWalletBalance
updateWalletBalance
## (
## (
wallet
wallet
## .
## .
id
id
## ,
## ,
wallet
wallet
## .
## .
balance
balance


## +
## +
amount
amount
## )
## )
## ;
## ;




// Auto-settle outstanding orders
// Auto-settle outstanding orders


await
await


autoSettleOutstanding
autoSettleOutstanding
## (
## (
customerId
customerId
## )
## )
## ;
## ;




// Log on calendar
// Log on calendar


await
await


logCalendarEvent
logCalendarEvent
## (
## (
## {
## {


event_type
event_type
## :
## :


## 'WALLET_CREDIT'
## 'WALLET_CREDIT'
## ,
## ,


customer_id
customer_id
## :
## :
customerId
customerId
## ,
## ,


event_date
event_date
## :
## :


today
today
## (
## (
## )
## )
## ,
## ,


amount
amount
## :
## :
amount
amount


## }
## }
## )
## )
## ;
## ;




return
return
transaction
transaction
## ;
## ;
## }
## }
javascript

- Staff Commission (Wallet Credit):
async
async


function
function


deductOrderAmount
deductOrderAmount
## (
## (
customerId
customerId
## ,
## ,
orderId
orderId
## ,
## ,
orderAmount
orderAmount
## )
## )


## {
## {


const
const
wallet
wallet
## =
## =


await
await


getCustomerWallet
getCustomerWallet
## (
## (
customerId
customerId
## )
## )
## ;
## ;




if
if


## (
## (
wallet
wallet
## .
## .
balance
balance


## >=
## >=
orderAmount
orderAmount
## )
## )


## {
## {


// Sufficient balance - deduct full amount
// Sufficient balance - deduct full amount


await
await


createWalletTransaction
createWalletTransaction
## (
## (
## {
## {


transaction_type
transaction_type
## :
## :


## 'debit'
## 'debit'
## ,
## ,


amount
amount
## :
## :
orderAmount
orderAmount
## ,
## ,


source
source
## :
## :


## 'order_deduction'
## 'order_deduction'
## ,
## ,


reference_id
reference_id
## :
## :
orderId
orderId
## ,
## ,


description
description
## :
## :


## `
## `
## Order #
## Order #
## ${
## ${
orderId
orderId
## }
## }
## `
## `
## ,
## ,


balance_after
balance_after
## :
## :
wallet
wallet
## .
## .
balance
balance


## -
## -
orderAmount
orderAmount


## }
## }
## )
## )
## ;
## ;




await
await


updateWalletBalance
updateWalletBalance
## (
## (
wallet
wallet
## .
## .
id
id
## ,
## ,
wallet
wallet
## .
## .
balance
balance


## -
## -
orderAmount
orderAmount
## )
## )
## ;
## ;


await
await


updateOrderStatus
updateOrderStatus
## (
## (
orderId
orderId
## ,
## ,


## 'paid_from_wallet'
## 'paid_from_wallet'
## )
## )
## ;
## ;




## }
## }


else
else


if
if


## (
## (
wallet
wallet
## .
## .
balance
balance


## >
## >


## 0
## 0
## )
## )


## {
## {


// Partial balance - deduct what's available
// Partial balance - deduct what's available


const
const
partialAmount
partialAmount
## =
## =
wallet
wallet
## .
## .
balance
balance
## ;
## ;


const
const
remainingAmount
remainingAmount
## =
## =
orderAmount
orderAmount
## -
## -
partialAmount
partialAmount
## ;
## ;




await
await


createWalletTransaction
createWalletTransaction
## (
## (
## {
## {


transaction_type
transaction_type
## :
## :


## 'debit'
## 'debit'
## ,
## ,


amount
amount
## :
## :
partialAmount
partialAmount
## ,
## ,


source
source
## :
## :


## 'order_deduction'
## 'order_deduction'
## ,
## ,


reference_id
reference_id
## :
## :
orderId
orderId
## ,
## ,


description
description
## :
## :


## `
## `
Partial payment for Order #
Partial payment for Order #
## ${
## ${
orderId
orderId
## }
## }
## `
## `
## ,
## ,


balance_after
balance_after
## :
## :


## 0
## 0


## }
## }
## )
## )
## ;
## ;




await
await


updateWalletBalance
updateWalletBalance
## (
## (
wallet
wallet
## .
## .
id
id
## ,
## ,


## 0
## 0
## )
## )
## ;
## ;


await
await


updateOrderStatus
updateOrderStatus
## (
## (
orderId
orderId
## ,
## ,


## 'partially_paid'
## 'partially_paid'
## ,
## ,


## {
## {


paid_from_wallet
paid_from_wallet
## :
## :
partialAmount
partialAmount
## ,
## ,


remaining
remaining
## :
## :
remainingAmount
remainingAmount


## }
## }
## )
## )
## ;
## ;




// Send payment request for remaining amount
// Send payment request for remaining amount


await
await


sendPaymentRequest
sendPaymentRequest
## (
## (
customerId
customerId
## ,
## ,
remainingAmount
remainingAmount
## ,
## ,
orderId
orderId
## )
## )
## ;
## ;




## }
## }


else
else


## {
## {


// Zero balance - full payment required
// Zero balance - full payment required


await
await


updateOrderStatus
updateOrderStatus
## (
## (
orderId
orderId
## ,
## ,


## 'payment_pending'
## 'payment_pending'
## )
## )
## ;
## ;


await
await


sendPaymentRequest
sendPaymentRequest
## (
## (
customerId
customerId
## ,
## ,
orderAmount
orderAmount
## ,
## ,
orderId
orderId
## )
## )
## ;
## ;


## }
## }




// Log on calendar
// Log on calendar


await
await


logCalendarEvent
logCalendarEvent
## (
## (
## {
## {


event_type
event_type
## :
## :


## 'WALLET_DEBIT'
## 'WALLET_DEBIT'
## ,
## ,


customer_id
customer_id
## :
## :
customerId
customerId
## ,
## ,


event_date
event_date
## :
## :


today
today
## (
## (
## )
## )
## ,
## ,


amount
amount
## :
## :
orderAmount
orderAmount


## }
## }
## )
## )
## ;
## ;
## }
## }
javascript

## 4. Staff Withdrawal:
async
async


function
function


creditStaffCommission
creditStaffCommission
## (
## (
staffId
staffId
## ,
## ,
orderId
orderId
## ,
## ,
commissionAmount
commissionAmount
## ,
## ,
commissionType
commissionType
## )
## )


## {
## {


const
const
wallet
wallet
## =
## =


await
await


getStaffWallet
getStaffWallet
## (
## (
staffId
staffId
## )
## )
## ;
## ;




await
await


createStaffWalletTransaction
createStaffWalletTransaction
## (
## (
## {
## {


wallet_id
wallet_id
## :
## :
wallet
wallet
## .
## .
id
id
## ,
## ,


transaction_type
transaction_type
## :
## :


## 'credit'
## 'credit'
## ,
## ,


amount
amount
## :
## :
commissionAmount
commissionAmount
## ,
## ,


source
source
## :
## :
commissionType
commissionType
## ,
## ,


## // 'order_commission', 'delivery_commission', 'bonus'
## // 'order_commission', 'delivery_commission', 'bonus'


reference_id
reference_id
## :
## :
orderId
orderId
## ,
## ,


balance_after
balance_after
## :
## :
wallet
wallet
## .
## .
balance
balance


## +
## +
commissionAmount
commissionAmount


## }
## }
## )
## )
## ;
## ;




await
await


updateWalletBalance
updateWalletBalance
## (
## (
wallet
wallet
## .
## .
id
id
## ,
## ,
wallet
wallet
## .
## .
balance
balance


## +
## +
commissionAmount
commissionAmount
## )
## )
## ;
## ;




// Send WhatsApp notification
// Send WhatsApp notification


await
await


sendWhatsApp
sendWhatsApp
## (
## (
staff
staff
## .
## .
mobile
mobile
## ,
## ,


## `
## `
 Commission earned: ₹
 Commission earned: ₹
## ${
## ${
commissionAmount
commissionAmount
## }
## }
##  Type:
##  Type:
## ${
## ${
commissionType
commissionType
## }
## }
 Wallet balance: ₹
 Wallet balance: ₹
## ${
## ${
wallet
wallet
## .
## .
balance
balance
## }
## }


Withdraw anytime from app.
Withdraw anytime from app.
## `
## `


## )
## )
## ;
## ;




// Log on calendar
// Log on calendar


await
await


logCalendarEvent
logCalendarEvent
## (
## (
## {
## {


event_type
event_type
## :
## :


## 'COMMISSION_EARNED'
## 'COMMISSION_EARNED'
## ,
## ,


staff_id
staff_id
## :
## :
staffId
staffId
## ,
## ,


event_date
event_date
## :
## :


today
today
## (
## (
## )
## )
## ,
## ,


amount
amount
## :
## :
commissionAmount
commissionAmount


## }
## }
## )
## )
## ;
## ;
## }
## }
javascript

Wallet UI Components:
## Customer Wallet View:
async
async


function
function


processStaffWithdrawal
processStaffWithdrawal
## (
## (
staffId
staffId
## ,
## ,
amount
amount
## )
## )


## {
## {


const
const
wallet
wallet
## =
## =


await
await


getStaffWallet
getStaffWallet
## (
## (
staffId
staffId
## )
## )
## ;
## ;




if
if


## (
## (
wallet
wallet
## .
## .
balance
balance


## <
## <
amount
amount
## )
## )


## {
## {


throw
throw


new
new


## Error
## Error
## (
## (
'Insufficient wallet balance'
'Insufficient wallet balance'
## )
## )
## ;
## ;


## }
## }




if
if


## (
## (
amount
amount
## <
## <


## 500
## 500
## )
## )


## {
## {


throw
throw


new
new


## Error
## Error
## (
## (
'Minimum withdrawal: ₹500'
'Minimum withdrawal: ₹500'
## )
## )
## ;
## ;


## }
## }




// Create withdrawal request
// Create withdrawal request


const
const
withdrawal
withdrawal
## =
## =


await
await


createWithdrawalRequest
createWithdrawalRequest
## (
## (
## {
## {


staff_id
staff_id
## :
## :
staffId
staffId
## ,
## ,


amount
amount
## :
## :
amount
amount
## ,
## ,


account_number
account_number
## :
## :
wallet
wallet
## .
## .
withdrawal_account_number
withdrawal_account_number
## ,
## ,


ifsc_code
ifsc_code
## :
## :
wallet
wallet
## .
## .
ifsc_code
ifsc_code
## ,
## ,


status
status
## :
## :


## 'pending'
## 'pending'
## ,
## ,


requested_at
requested_at
## :
## :


now
now
## (
## (
## )
## )


## }
## }
## )
## )
## ;
## ;




// Deduct from wallet
// Deduct from wallet


await
await


createStaffWalletTransaction
createStaffWalletTransaction
## (
## (
## {
## {


transaction_type
transaction_type
## :
## :


## 'debit'
## 'debit'
## ,
## ,


amount
amount
## :
## :
amount
amount
## ,
## ,


source
source
## :
## :


## 'withdrawal'
## 'withdrawal'
## ,
## ,


reference_id
reference_id
## :
## :
withdrawal
withdrawal
## .
## .
id
id
## ,
## ,


balance_after
balance_after
## :
## :
wallet
wallet
## .
## .
balance
balance


## -
## -
amount
amount


## }
## }
## )
## )
## ;
## ;




await
await


updateWalletBalance
updateWalletBalance
## (
## (
wallet
wallet
## .
## .
id
id
## ,
## ,
wallet
wallet
## .
## .
balance
balance


## -
## -
amount
amount
## )
## )
## ;
## ;




// Notify admin for processing
// Notify admin for processing


await
await


notifyAdmin
notifyAdmin
## (
## (
## 'staff_withdrawal_pending'
## 'staff_withdrawal_pending'
## ,
## ,
withdrawal
withdrawal
## )
## )
## ;
## ;




// Log on calendar
// Log on calendar


await
await


logCalendarEvent
logCalendarEvent
## (
## (
## {
## {


event_type
event_type
## :
## :


## 'WITHDRAWAL_REQUESTED'
## 'WITHDRAWAL_REQUESTED'
## ,
## ,


staff_id
staff_id
## :
## :
staffId
staffId
## ,
## ,


event_date
event_date
## :
## :


today
today
## (
## (
## )
## )
## ,
## ,


amount
amount
## :
## :
amount
amount


## }
## }
## )
## )
## ;
## ;
## }
## }

## Staff Wallet View:
## Calendar Integration:
Every wallet transaction appears on calendar on transaction date
Date Detail View shows:
All credits (payments, bonuses, refunds)
All debits (orders, withdrawals)
Running balance for that day
Wallet balance graph overlays on calendar (shows balance trend over time)
## 15.5 Supplier Integration - Complete Workflow
## Supplier Onboarding:
## 1. Admin Creates Supplier Account:
## ┌──────────────────────────────┐
## ┌──────────────────────────────┐
## │   Your Wallet              │
## │   Your Wallet              │
## │                              │
## │                              │
## │  Current Balance: ₹1,250     │
## │  Current Balance: ₹1,250     │
## │  ━━━━━━━━━━━━━━━━━━━━━━━━   │
## │  ━━━━━━━━━━━━━━━━━━━━━━━━   │
## │                              │
## │                              │
## │  Recent Transactions         │
## │  Recent Transactions         │
## │  ┌──────────────────────┐   │
## │  ┌──────────────────────┐   │
## │  │ Jan 20  +₹2,000      │   │
## │  │ Jan 20  +₹2,000      │   │
## │  │ Payment Received     │   │
## │  │ Payment Received     │   │
## │  ├──────────────────────┤   │
## │  ├──────────────────────┤   │
## │  │ Jan 20  -₹850        │   │
## │  │ Jan 20  -₹850        │   │
## │  │ Grocery Order        │   │
## │  │ Grocery Order        │   │
## │  ├──────────────────────┤   │
## │  ├──────────────────────┤   │
## │  │ Jan 19  -₹100        │   │
## │  │ Jan 19  -₹100        │   │
## │  │ Milk Delivery        │   │
## │  │ Milk Delivery        │   │
## │  └──────────────────────┘   │
## │  └──────────────────────┘   │
## │                              │
## │                              │
│  [Top Up Wallet]             │
│  [Top Up Wallet]             │
│  [View Full History]         │
│  [View Full History]         │
## └──────────────────────────────┘
## └──────────────────────────────┘
## ┌──────────────────────────────┐
## ┌──────────────────────────────┐
## │   Your Earnings            │
## │   Your Earnings            │
## │                              │
## │                              │
## │  Available: ₹5,450           │
## │  Available: ₹5,450           │
│  Pending: ₹850 (2 orders)    │
│  Pending: ₹850 (2 orders)    │
## │  ━━━━━━━━━━━━━━━━━━━━━━━━   │
## │  ━━━━━━━━━━━━━━━━━━━━━━━━   │
## │                              │
## │                              │
## │  This Month: ₹12,200         │
## │  This Month: ₹12,200         │
## │  Last Month: ₹10,800         │
## │  Last Month: ₹10,800         │
## │                              │
## │                              │
## │  Breakdown                   │
## │  Breakdown                   │
## │  • Delivery: ₹8,400          │
## │  • Delivery: ₹8,400          │
## │  • Commission: ₹3,200        │
## │  • Commission: ₹3,200        │
## │  • Bonuses: ₹600             │
## │  • Bonuses: ₹600             │
## │                              │
## │                              │
│  [Withdraw to Bank]          │
│  [Withdraw to Bank]          │
│  [View Calendar]             │
│  [View Calendar]             │
## └──────────────────────────────┘
## └──────────────────────────────┘

## 2. Supplier Receives Login Credentials:
WhatsApp: "Welcome to EarlyBird Supplier Portal! Login: fresh@milkdairy.com"
Portal URL: supplier.earlybird.app
## Daily Workflow:
Admin Side (Morning - Day Before Delivery):
- Admin opens calendar, clicks on tomorrow's date (Jan 21)
- Date Detail View shows:
- Admin clicks "Generate Supplier Orders"
- System auto-creates PO:
- PO sent via WhatsApp + Email to supplier
- Logged on calendar: "Supplier Order Placed - Fresh Milk Dairy - Jan 21"
javascript
## {
## {


supplier_id
supplier_id
## :
## :


## UUID
## UUID
## ,
## ,


supplier_name
supplier_name
## :
## :


"Fresh Milk Dairy"
"Fresh Milk Dairy"
## ,
## ,


contact_person
contact_person
## :
## :


"Ramesh Kumar"
"Ramesh Kumar"
## ,
## ,


mobile
mobile
## :
## :


## "+919876543210"
## "+919876543210"
## ,
## ,


email
email
## :
## :


## "fresh@milkdairy.com"
## "fresh@milkdairy.com"
## ,
## ,


payment_terms
payment_terms
## :
## :


## 7
## 7
## ,
## ,


// days
// days


minimum_order
minimum_order
## :
## :


## 50
## 50
## ,
## ,


// liters
// liters


lead_time
lead_time
## :
## :


## 1
## 1
## ,
## ,


// days advance notice
// days advance notice


products_supplied
products_supplied
## :
## :


## [
## [


## {
## {
product_id
product_id
## :
## :


## "milk_500ml"
## "milk_500ml"
## ,
## ,


price_per_unit
price_per_unit
## :
## :


## 25
## 25
## }
## }
## ,
## ,


## {
## {
product_id
product_id
## :
## :


"milk_1L"
"milk_1L"
## ,
## ,


price_per_unit
price_per_unit
## :
## :


## 48
## 48
## }
## }


## ]
## ]
## }
## }


## Jan 21 Deliveries Summary:
## Jan 21 Deliveries Summary:


## Total Orders: 150
## Total Orders: 150




## Milk Requirements:
## Milk Requirements:


- 500ml: 80 units (40L total)
- 500ml: 80 units (40L total)


- 1L: 120 units (120L total)
- 1L: 120 units (120L total)


## TOTAL MILK: 160L
## TOTAL MILK: 160L




## Supplier Breakdown:
## Supplier Breakdown:


- Fresh Milk Dairy: 100L (confirmed ✅)
- Fresh Milk Dairy: 100L (confirmed ✅)


- Local Dairy Co: 60L (pending ⏳)
- Local Dairy Co: 60L (pending ⏳)


Purchase Order #PO-2026-0120
Purchase Order #PO-2026-0120


## To: Fresh Milk Dairy
## To: Fresh Milk Dairy


## Delivery Date: Jan 21, 2026
## Delivery Date: Jan 21, 2026


Delivery Time: 5:00 AM (before customer deliveries)
Delivery Time: 5:00 AM (before customer deliveries)




## Items:
## Items:


- Milk 500ml: 50 units × ₹25 = ₹1,250
- Milk 500ml: 50 units × ₹25 = ₹1,250


- Milk 1L: 50 units × ₹48 = ₹2,400
- Milk 1L: 50 units × ₹48 = ₹2,400


## TOTAL: ₹3,650
## TOTAL: ₹3,650




Payment Terms: 7 days (Due: Jan 28)
Payment Terms: 7 days (Due: Jan 28)

## Supplier Side:
- Supplier logs into portal (or receives WhatsApp)
- Sees calendar with expected orders:
- Clicks Jan 21 → Date Detail View shows PO details
## 4. Options:
✅ Confirm: "Yes, will deliver 100L at 5 AM on Jan 21"
⚠ Partial: "Can only supply 70L, not 100L"
❌ Reject: "Cannot fulfill this order"
- Supplier clicks "Confirm"
- WhatsApp confirmation sent to admin: "Fresh Milk Dairy confirmed 100L for Jan 21"
- Logged on both calendars: "Order Confirmed"
If Supplier Can't Fulfill (Shortage Scenario):
- Supplier clicks "Partial" → enters 70L instead of 100L
- System alerts admin immediately:
- Admin selects "Find Alternate Supplier"
- System shows other suppliers: "Local Dairy Co can supply 30L at ₹50/L (premium)"
- Admin confirms alternate order
- Both orders logged on Jan 21 calendar
## Delivery & Payment Tracking:
- Delivery Confirmation (Jan 21, 5:00 AM):
Supplier delivers 100L milk to EarlyBird warehouse
Admin marks delivery as "Received" in app
System updates: Supplier Wallet += ₹3,650 (receivable)
Logged on calendar: "Supplier Delivery Received"
## 2. Payment Due Tracking:
Payment terms: 7 days → Due date: Jan 28
Jan 28 marked on both calendars with  icon


## Your Orders Calendar:
## Your Orders Calendar:




Jan 20: No orders
Jan 20: No orders


Jan 21: 100L Milk - ₹3,650 - Pending Confirmation ⏳
Jan 21: 100L Milk - ₹3,650 - Pending Confirmation ⏳


Jan 22: 120L Milk - ₹4,380 - Forecasted 
Jan 22: 120L Milk - ₹4,380 - Forecasted 


Jan 23: 90L Milk - ₹3,285 - Forecasted 
Jan 23: 90L Milk - ₹3,285 - Forecasted 


## ⚠ SHORTAGE ALERT
## ⚠ SHORTAGE ALERT




Fresh Milk Dairy can only supply 70L on Jan 21
Fresh Milk Dairy can only supply 70L on Jan 21


Shortage: 30L
Shortage: 30L




Affected customers: 15 customers won't receive milk
Affected customers: 15 customers won't receive milk




## Actions:
## Actions:


[Find Alternate Supplier]
[Find Alternate Supplier]


[Reduce All Allocations by 30%]
[Reduce All Allocations by 30%]


[Contact Customers]
[Contact Customers]

Admin calendar shows: "Payment Due: Fresh Milk Dairy - ₹3,650"
Supplier calendar shows: "Payment Expected: ₹3,650"
- Payment Processing (Jan 28):
Admin clicks "Process Payment" on Jan 28
Enters: Bank transfer reference number
Supplier Wallet: ₹3,650 moved from "receivable" to "paid"
WhatsApp to supplier: "Payment processed: ₹3,650. Check your account."
Logged on calendar: "Payment Completed"
## Supplier Calendar View Example:
## Calendar Integration Summary:
Every supplier order logged on order date
Expected delivery dates marked
Payment due dates highlighted
Admin sees all supplier events on consolidated calendar
Supplier sees only their relevant events
Date Detail View shows complete PO → Delivery → Payment timeline
## ┌────────────────────────────────────────┐
## ┌────────────────────────────────────────┐
## │  Fresh Milk Dairy - January 2026       │
## │  Fresh Milk Dairy - January 2026       │
## │                                        │
## │                                        │
## │  Mon  Tue  Wed  Thu  Fri  Sat  Sun    │
## │  Mon  Tue  Wed  Thu  Fri  Sat  Sun    │
## │              1    2    3    4    5     │
## │              1    2    3    4    5     │
## │   6    7    8    9   10   11   12     │
## │   6    7    8    9   10   11   12     │
## │  13   14   15   16   17   18   19     │
## │  13   14   15   16   17   18   19     │
## │  20   21  22   23   24   25   26    │
## │  20   21  22   23   24   25   26    │
## │  27   28  29   30   31              │
## │  27   28  29   30   31              │
## │                                        │
## │                                        │
## │   = Order Expected                  │
## │   = Order Expected                  │
## │   = Payment Due                     │
## │   = Payment Due                     │
## └────────────────────────────────────────┘
## └────────────────────────────────────────┘
## Click Jan 21:
## Click Jan 21:
## ┌────────────────────────────────────────┐
## ┌────────────────────────────────────────┐
## │  January 21, 2026                      │
## │  January 21, 2026                      │
## │                                        │
## │                                        │
│   Order #PO-2026-0120               │
│   Order #PO-2026-0120               │
## │  Status: Confirmed ✅                 │
## │  Status: Confirmed ✅                 │
## │                                        │
## │                                        │
## │  Items:                                │
## │  Items:                                │
│  • Milk 500ml: 50 units (₹1,250)     │
│  • Milk 500ml: 50 units (₹1,250)     │
│  • Milk 1L: 50 units (₹2,400)        │
│  • Milk 1L: 50 units (₹2,400)        │
## │  Total: ₹3,650                        │
## │  Total: ₹3,650                        │
## │                                        │
## │                                        │
│  Delivery: Jan 21, 5:00 AM            │
│  Delivery: Jan 21, 5:00 AM            │
## │  Payment Due: Jan 28, 2026            │
## │  Payment Due: Jan 28, 2026            │
## │                                        │
## │                                        │
│  [Mark as Delivered]                   │
│  [Mark as Delivered]                   │
## └────────────────────────────────────────┘
## └────────────────────────────────────────┘

##  FINAL IMPLEMENTATION CHECKLIST
Phase 1: Core Calendar System (Weeks 1-4)
Calendar UI component (month/day views)
Event timeline data model
Date Detail View (workhorse screen)
Role-based calendar filtering
Calendar heat map
Phase 2: Financial Foundation (Weeks 5-8)
Customer wallet system
Staff wallet system
Exclusive payment link generation
Webhook payment processing
Wallet transaction logging on calendar
Phase 3: Intelligent Input (Weeks 9-12)
Voice-based order entry (regional languages)
Handwritten list OCR
Kirana-style dense grocery UI
Monthly list reuse with smart diff
Phase 4: Smart Features (Weeks 13-16)
Smart subscription pause detection
Instant-to-subscription intelligence
First 30 days journey tracker
Payment reminder escalation
Customer trust score
Phase 5: Staff Empowerment (Weeks 17-20)
Commission tracking and wallet
Leaderboard gamification
Daily delivery brief
Activity heatmap
Last mile intelligence capture
Phase 6: Supplier Integration (Weeks 21-24)
Supplier portal and calendar
Auto-order generation from demand
Stock availability on calendar
Payment tracking
Supplier wallet
Phase 7: Advanced Intelligence (Weeks 25-28)
Predictive churn model
WhatsApp segmentation engine
Festival/season templates
Weather integration
Multi-language interface
Phase 8: Polish & Scale (Weeks 29-32)
Emergency escalation chain

Bulk calendar actions
Family calendar sharing
Dynamic pricing
Customer referral program
##  SUCCESS METRICS BY PHASE
After Phase 2 (Week 8):
100% of payments via exclusive link (zero payment link confusion)
90% wallet adoption (customers using advance credit)
Complete financial audit trail on calendar
After Phase 4 (Week 16):
60% reduction in subscription churn (from pause detection)
40% increase in subscription conversions (from instant-order intelligence)
85% first-30-day retention (from journey tracker)
After Phase 6 (Week 24):
95% supplier order accuracy (from calendar forecasting)
30% reduction in inventory wastage
Zero stock-out incidents (from availability alerts)
After Phase 8 (Week 32):
85%+ customer retention rate
95%+ payment collection within 10 days
98%+ first-attempt delivery success
25% growth from customer referrals
## ✅ THE CALENDAR PROMISE
If you build this system exactly as specified:
- Every business event will be visible on calendar - No hidden actions
- Every role will start their day with calendar - It becomes muscle memory
- Every decision will be date-informed - "What happened on Jan 15?" → Click Jan 15 → See
everything
- Every audit will be instant - Calendar is the audit trail
- Every customer will trust you more - Transparency builds trust
- Every staff member will be accountable - Their actions are on calendar
- Every supplier will coordinate better - Shared calendar view
The calendar doesn't lie. It shows exactly what happened when. Build your entire business on this
truth, and you will never lose track of reality.
## END OF ADVANCED FEATURES SPECIFICATION
This document is supplementary to EarlyBird Complete Unified PRD v3.0

