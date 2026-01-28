# Firebase Cloud Messaging (FCM) Setup Guide

## What is FCM?
Firebase Cloud Messaging enables:
- Push notifications to users
- Real-time alerts for deliveries
- Order updates
- Promotional notifications

## Quick Setup (10 minutes)

### Step 1: Get FCM Server Key

1. Go to Firebase Console: https://console.firebase.google.com
2. Select project: **earlybird-delivery-ap**
3. Click **Project Settings** (⚙️ icon, top right)
4. Go to **Cloud Messaging** tab
5. Find **Server API Key** at the top
6. Copy and save this key

**Keep this secret! This key gives access to send all notifications.**

```
Server API Key Format: AAAA...(long alphanumeric string)...9999
```

### Step 2: Get VAPID Key for Web

1. In same **Cloud Messaging** tab
2. Scroll down to **Web Configuration**
3. If no key exists, click **Generate Key Pair**
4. Copy the **public key** (starts with `BCxxx...`)
5. This goes in your frontend environment

---

## Backend Configuration

### Set Environment Variables

Add to `.env`:
```bash
FCM_SERVER_API_KEY=AAAA...(your server API key)...9999
FIREBASE_PROJECT_ID=earlybird-delivery-ap
```

### Send Notification from Backend

**Example Python/FastAPI code:**

```python
from fastapi import FastAPI
import httpx

app = FastAPI()

FCM_SERVER_API_KEY = os.getenv("FCM_SERVER_API_KEY")
FCM_URL = "https://fcm.googleapis.com/fcm/send"

async def send_notification(user_token: str, title: str, body: str):
    """Send push notification to specific user"""
    
    headers = {
        "Authorization": f"key={FCM_SERVER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "to": user_token,
        "notification": {
            "title": title,
            "body": body,
            "sound": "default",
            "click_action": "FLUTTER_NOTIFICATION_CLICK"
        },
        "data": {
            "timestamp": str(datetime.now())
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(FCM_URL, json=payload, headers=headers)
        return response.json()

# Usage in route:
@app.post("/api/v1/orders/{order_id}/notify")
async def notify_delivery_update(order_id: str):
    # Get user's FCM token from database
    user = await db.users.find_one({"_id": order_id})
    
    if user and user.get("fcm_token"):
        await send_notification(
            user_token=user["fcm_token"],
            title="Order Update",
            body="Your order is on its way!"
        )
    
    return {"status": "notification_sent"}
```

---

## Frontend Configuration

### Step 1: Install Firebase Messaging

```bash
cd frontend
npm install firebase
```

### Step 2: Create Service Worker

Create `frontend/public/firebase-messaging-sw.js`:

```javascript
// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase services
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing the generated config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "earlybird-delivery-ap.firebaseapp.com",
  projectId: "earlybird-delivery-ap",
  storageBucket: "earlybird-delivery-ap.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico',
    badge: '/badge-icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

### Step 3: Request Notification Permission

Create `frontend/src/utils/fcm-setup.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseConfig } from '../config/firebase';

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      console.log('FCM Token:', token);
      
      // Send token to your backend
      await fetch('/api/v1/users/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcm_token: token })
      });
      
      return token;
    } else {
      console.log('Notification permission denied');
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
}

// Listen for foreground messages
export function setupForegroundMessageHandler() {
  onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    
    // Display notification while app is open
    if (Notification.permission === 'granted') {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/favicon.ico'
      });
    }
  });
}
```

### Step 4: Call FCM Setup in App.js

```javascript
import { requestNotificationPermission, setupForegroundMessageHandler } from './utils/fcm-setup';

function App() {
  useEffect(() => {
    // Request notification permission on app load
    if ('Notification' in window) {
      requestNotificationPermission();
      setupForegroundMessageHandler();
    }
  }, []);

  return (
    // Your app components
  );
}
```

### Step 5: Update Frontend Config

Edit `frontend/src/config/firebase.js`:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "earlybird-delivery-ap.firebaseapp.com",
  projectId: "earlybird-delivery-ap",
  storageBucket: "earlybird-delivery-ap.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const FCM_VAPID_KEY = "YOUR_VAPID_PUBLIC_KEY";
```

**Get these values from Firebase Console > Project Settings > General**

---

## Store FCM Token in Database

### Backend Route to Save Token

```python
@app.post("/api/v1/users/fcm-token")
async def save_fcm_token(fcm_data: dict, current_user = Depends(get_current_user)):
    """Save user's FCM token for push notifications"""
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {
            "$set": {
                "fcm_token": fcm_data["fcm_token"],
                "fcm_token_updated_at": datetime.now()
            }
        }
    )
    
    return {"status": "token_saved"}
```

---

## Test Notifications

### Using Firebase Console

1. Go to **Firebase Console** → **Cloud Messaging** tab
2. Click **Send your first message**
3. Enter:
   - Title: "Test Notification"
   - Text: "Hello from Firebase!"
4. Select **User segment** or **Single device**
5. Click **Send**

### Using Backend API

```bash
curl -X POST http://localhost:8000/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -d {
    "user_id": "user123",
    "title": "Test",
    "body": "This is a test notification"
  }
```

---

## Notification Types

### 1. Order Updates
```python
await send_notification(
    user_token=delivery_user["fcm_token"],
    title="Order Confirmed",
    body="Your order #12345 has been confirmed"
)
```

### 2. Delivery Status
```python
await send_notification(
    user_token=customer_fcm_token,
    title="On the Way",
    body="Your delivery boy is arriving in 5 minutes"
)
```

### 3. Payment Alerts
```python
await send_notification(
    user_token=user_fcm_token,
    title="Payment Received",
    body="We received your payment of ₹500"
)
```

### 4. Promotional
```python
async def send_bulk_notification(title: str, body: str):
    """Send to all users"""
    users = await db.users.find({"fcm_token": {"$exists": True}}).to_list(None)
    
    for user in users:
        await send_notification(user["fcm_token"], title, body)
```

---

## Troubleshooting

### "Invalid token" error
- Token might be expired (request new one)
- Token might be for wrong project
- User may have unregistered

### Notifications not showing on device
- Check notification permission is granted
- Check battery saver isn't blocking notifications
- Verify service worker is registered
- Check browser console for errors (F12)

### VAPID key error
- Regenerate key in Firebase Cloud Messaging tab
- Update key in frontend config
- Restart app and request permission again

### Token not being sent to backend
- Check network request in DevTools
- Verify backend endpoint exists
- Check browser is not blocking requests

---

## Database Schema for FCM

```javascript
// users collection
{
  _id: ObjectId(...),
  email: "user@example.com",
  fcm_token: "cNVHoWJr9y...",
  fcm_token_updated_at: ISODate("2026-01-28T10:00:00Z"),
  notification_enabled: true,
  notification_types: ["orders", "deliveries", "promotions"]
}
```

---

## Environment Variables Required

### Backend
```
FCM_SERVER_API_KEY=AAAA...(server key)...9999
FIREBASE_PROJECT_ID=earlybird-delivery-ap
```

### Frontend
```
REACT_APP_FIREBASE_PROJECT_ID=earlybird-delivery-ap
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
REACT_APP_FCM_VAPID_KEY=YOUR_VAPID_PUBLIC_KEY
```

---

## Next Steps

1. ✅ Get Server API Key from FCM
2. ✅ Get VAPID Key from FCM
3. Add keys to backend `.env`
4. Add keys to frontend `.env`
5. Deploy backend with FCM code
6. Deploy frontend with notification setup
7. Test sending notification from console
8. Verify notification appears on device

**Ready? Deploy backend and frontend with FCM configuration!**
