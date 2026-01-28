# Phase 3 GPS Tracking - Quick Start Guide

**Get Phase 3 GPS tracking up and running in 15 minutes!**

---

## Prerequisites

- ✅ Node.js 16+ installed
- ✅ Python 3.8+ with FastAPI
- ✅ MongoDB running (local or Atlas)
- ✅ EarlyBird backend running on port 9885
- ✅ EarlyBird frontend running on port 3000

---

## Installation (5 minutes)

### Step 1: Install Frontend Dependencies

```bash
cd frontend
npm install leaflet react-leaflet lucide-react
```

### Step 2: Verify Backend Files

Ensure these files exist in the `backend/` directory:
- ✅ `gps_service.py` (450 lines)
- ✅ `routes_gps.py` (200+ lines)

Check: `server.py` has GPS routes registered

```bash
grep "gps_router" backend/server.py
# Should output: from routes_gps import router as gps_router
```

### Step 3: Create Database Collections

Connect to MongoDB and run:

```javascript
// MongoDB shell or MongoDB Compass
db.createCollection("delivery_tracking");
db.delivery_tracking.createIndex({ "delivery_id": 1 });
db.delivery_tracking.createIndex({ "status": 1 });

db.createCollection("delivery_location_history");
db.delivery_location_history.createIndex({ "delivery_id": 1, "timestamp": -1 });
```

---

## Testing (5 minutes)

### Test 1: API Health Check

```bash
curl http://localhost:9885/api/gps/health
# Expected: {"status": "healthy", "service": "gps_tracking", "active_connections": 0}
```

### Test 2: Start Tracking

Replace `YOUR_TOKEN` with a real JWT token from login

```bash
curl -X POST http://localhost:9885/api/gps/tracking/start/delivery-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Update Location

```bash
curl -X POST "http://localhost:9885/api/gps/tracking/update/delivery-123?latitude=28.7041&longitude=77.1025&speed=15" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 4: Get Tracking Data

```bash
curl http://localhost:9885/api/gps/tracking/delivery-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 5: WebSocket Connection

In browser console:

```javascript
const ws = new WebSocket('ws://localhost:9885/api/gps/ws/tracking/delivery-123');

ws.onopen = () => {
  console.log('Connected!');
  ws.send(JSON.stringify({
    type: 'location_update',
    latitude: 28.7041,
    longitude: 77.1025,
    speed: 15
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

---

## Quick Integration (5 minutes)

### In Your App.js

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DeliveryTrackingMap from './components/DeliveryTrackingMap';
import DeliveryOperationsDashboard from './components/DeliveryOperationsDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Existing routes */}
        
        {/* Add these new routes */}
        <Route 
          path="/tracking/:deliveryId" 
          element={<DeliveryTrackingMap />} 
        />
        <Route 
          path="/operations/dashboard" 
          element={<DeliveryOperationsDashboard />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### Link to Tracking Page

```jsx
// In your order details page
<a href={`/tracking/${delivery_id}`} className="btn btn-primary">
  View Live Tracking
</a>

// In your admin navigation
<a href="/operations/dashboard" className="btn">
  Delivery Operations
</a>
```

---

## Usage Examples

### Start Tracking in Your Code

```jsx
import gpsService from './services/gpsService';

async function startDelivery(deliveryId) {
  const result = await gpsService.startTracking(deliveryId);
  console.log('Tracking started:', result);
}
```

### Display Tracking in Customer View

```jsx
function CustomerOrderPage({ orderId, deliveryId }) {
  return (
    <div>
      <h1>Your Order</h1>
      <p>Order ID: {orderId}</p>
      
      <a href={`/tracking/${deliveryId}`} className="btn btn-blue">
        🗺️ Track Delivery Live
      </a>
    </div>
  );
}
```

### Access Operations Dashboard

**URL:** `http://localhost:3000/operations/dashboard`

**Features:**
- See all active deliveries
- Click on any delivery to view details
- Click "View Map" to see real-time tracking
- Use filters to sort by status or date

---

## Common Issues & Solutions

### Issue: WebSocket Connection Failed

**Solution:**
1. Check backend is running: `curl http://localhost:9885/api/gps/health`
2. Check browser console for errors (F12)
3. Verify WebSocket URL is correct

### Issue: "Unauthorized (401)"

**Solution:**
1. Make sure you have a valid JWT token
2. Login first to get token: `POST /api/auth/login`
3. Include token in Authorization header

### Issue: Map Not Displaying

**Solution:**
1. Check Leaflet CSS is imported in public/index.html
2. Verify map container has height (in CSS)
3. Check browser console for JavaScript errors

### Issue: Location Updates Not Showing

**Solution:**
1. Verify delivery was started: `POST /api/gps/tracking/start/{id}`
2. Check WebSocket connection in browser dev tools (Network → WS)
3. Verify mobile app is sending location updates

### Issue: ETA Is Way Off

**Solution:**
1. Check destination coordinates are correct
2. Adjust traffic buffer in gps_service.py if needed
3. Consider using real-time traffic API for better accuracy

---

## File Locations

### Backend
- `/backend/gps_service.py` - Core GPS logic
- `/backend/routes_gps.py` - API endpoints
- `/backend/server.py` - Main app (check GPS routes are included)

### Frontend
- `/frontend/src/components/DeliveryTrackingMap.jsx` - Map component
- `/frontend/src/components/DeliveryOperationsDashboard.jsx` - Dashboard
- `/frontend/src/services/gpsService.js` - API wrapper

### Documentation
- `/PHASE_3_GPS_TRACKING.md` - Full documentation
- `/PHASE_3_COMPLETION_SUMMARY.md` - Summary
- `/frontend/GPS_TRACKING_INTEGRATION.js` - Integration guide

---

## Testing Checklist

- [ ] Backend health check passes
- [ ] Can start tracking for a delivery
- [ ] Can update location
- [ ] Can get tracking data
- [ ] WebSocket connection works in browser
- [ ] Map component displays without errors
- [ ] Operations dashboard loads all active deliveries
- [ ] Can click on delivery to see modal
- [ ] Can click "View Map" to see tracking
- [ ] Real-time updates work (location changes on map)
- [ ] ETA displays and counts down
- [ ] Connection status indicator shows "Connected"

---

## Performance Tips

1. **Use WebSocket** instead of polling for real-time updates (more efficient)
2. **Limit location history** to 100 records max (set in API calls)
3. **Enable database indexes** on delivery_id and status fields
4. **Monitor active connections** with `/api/gps/health` endpoint
5. **Use lazy loading** for map component if page is slow

---

## Security Reminders

✅ **Always include JWT token** in Authorization header  
✅ **Validate coordinates** are within valid ranges  
✅ **Use HTTPS/WSS** in production (not HTTP/WS)  
✅ **Limit API rate** to prevent abuse  
✅ **Keep tokens secure** (don't expose in frontend code)  

---

## Next Steps

1. ✅ Complete testing with Quick Start
2. ✅ Integrate routes into your App.js
3. ✅ Test with real deliveries
4. ✅ Get customer feedback
5. ✅ Deploy to production
6. ✅ Monitor performance & usage
7. ✅ Iterate based on feedback

---

## Need Help?

### Check Documentation
- Full API docs: [PHASE_3_GPS_TRACKING.md](../PHASE_3_GPS_TRACKING.md)
- Integration guide: [GPS_TRACKING_INTEGRATION.js](./GPS_TRACKING_INTEGRATION.js)
- Completion summary: [PHASE_3_COMPLETION_SUMMARY.md](../PHASE_3_COMPLETION_SUMMARY.md)

### Debug Commands

```bash
# Check if backend is running
curl http://localhost:9885/

# Check if GPS service is healthy
curl http://localhost:9885/api/gps/health

# Check server logs
tail -f backend/server.log

# Check frontend errors
# Open browser F12 → Console tab
```

### Test Data

For testing without mobile device:

```bash
# Simulate delivery in Mumbai
curl -X POST "http://localhost:9885/api/gps/tracking/update/delivery-123?latitude=19.0760&longitude=72.8777&speed=12" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Simulate delivery in Delhi
curl -X POST "http://localhost:9885/api/gps/tracking/update/delivery-456?latitude=28.7041&longitude=77.1025&speed=15" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**That's it! Phase 3 GPS Tracking is ready to use! 🎉**

---

## Version
- **Version:** 1.0.0 Quick Start
- **Last Updated:** 2024-01-20
- **Status:** ✅ Production Ready
