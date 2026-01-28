/**
 * GPS Tracking Frontend Integration Guide
 * How to integrate GPS tracking components into the EarlyBird frontend
 */

// ============================================
// STEP 1: Install Required Dependencies
// ============================================

/*
npm install leaflet react-leaflet
npm install lucide-react  // For icons

// In your public/index.html, add Leaflet CSS:
<link 
  rel="stylesheet" 
  href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.min.css" 
/>
*/


// ============================================
// STEP 2: Update App.js Routing
// ============================================

// Add these imports to your App.js
import DeliveryTrackingMap from './components/DeliveryTrackingMap';
import DeliveryOperationsDashboard from './components/DeliveryOperationsDashboard';

// Add these routes to your routing configuration
<Route path="/tracking/:deliveryId" element={<DeliveryTrackingMap />} />
<Route path="/operations/dashboard" element={<DeliveryOperationsDashboard />} />

// Or if using older React Router:
<Route exact path="/tracking/:deliveryId" component={DeliveryTrackingMap} />
<Route exact path="/operations/dashboard" component={DeliveryOperationsDashboard} />


// ============================================
// STEP 3: Update Navigation/Links
// ============================================

// Add link to tracking in customer order details
<Link to={`/tracking/${delivery_id}`}>
  View Live Tracking
</Link>

// Add link to operations dashboard
<Link to="/operations/dashboard">
  Delivery Operations
</Link>


// ============================================
// STEP 4: Use GPS Service in Components
// ============================================

import gpsService from './services/gpsService';

// In any component, you can use:

// Start tracking
const startTracking = async (deliveryId) => {
  const result = await gpsService.startTracking(deliveryId);
  console.log('Tracking started:', result);
};

// Get current tracking
const getTracking = async (deliveryId) => {
  const tracking = await gpsService.getTracking(deliveryId);
  console.log('Current tracking:', tracking);
};

// Calculate ETA
const getETA = async () => {
  const eta = await gpsService.calculateETA(
    28.7041,  // current_lat
    77.1025,  // current_lon
    28.7589,  // dest_lat
    77.0262,  // dest_lon
    15        // speed_kmh
  );
  console.log('ETA:', eta);
};

// Connect WebSocket
gpsService.connectWebSocket(
  deliveryId,
  (data) => {
    // Handle message
    console.log('Tracking update:', data);
  },
  (error) => {
    // Handle error
    console.error('WebSocket error:', error);
  },
  () => {
    // Handle close
    console.log('WebSocket closed');
  }
);


// ============================================
// STEP 5: Customer Notification Integration
// ============================================

// In your notification service, add GPS updates:

// When delivery tracking starts
await notificationService.sendToCustomer({
  type: 'delivery_tracking_started',
  title: 'Your Delivery is on the Way!',
  body: 'Your order is being delivered now. Click here to track live.',
  action_url: `/tracking/${delivery_id}`
});

// When delivery is about to arrive (within 5 minutes)
await notificationService.sendToCustomer({
  type: 'delivery_arriving_soon',
  title: 'Delivery Boy Arriving Soon',
  body: 'Your delivery boy will arrive in approximately 5 minutes.',
  action_url: `/tracking/${delivery_id}`
});

// When delivery is completed
await notificationService.sendToCustomer({
  type: 'delivery_completed',
  title: 'Delivery Completed!',
  body: 'Your order has been successfully delivered.',
  action_url: `/orders/${order_id}`
});


// ============================================
// STEP 6: Delivery Boy App Integration
// ============================================

// In your delivery boy mobile app component:

import gpsService from './services/gpsService';
import { useEffect, useRef } from 'react';

export const DeliveryBoyTracking = ({ deliveryId }) => {
  const locationWatchRef = useRef(null);
  
  useEffect(() => {
    // Start tracking when component mounts
    const startDeliveryTracking = async () => {
      // Start tracking on backend
      await gpsService.startTracking(deliveryId);
      
      // Watch device location and send updates
      locationWatchRef.current = gpsService.watchLocation(
        async (location) => {
          // Send location update to server
          const result = await gpsService.updateLocation(
            deliveryId,
            location.latitude,
            location.longitude,
            location.speed,
            location.accuracy
          );
          
          console.log('Location updated:', result);
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    };
    
    startDeliveryTracking();
    
    // Cleanup on unmount
    return () => {
      if (locationWatchRef.current) {
        gpsService.clearLocationWatch(locationWatchRef.current);
      }
      gpsService.endTracking(deliveryId);
    };
  }, [deliveryId]);
  
  return (
    <div>
      <h1>Tracking in Progress...</h1>
      <p>Your location is being tracked and shared with the customer.</p>
    </div>
  );
};


// ============================================
// STEP 7: Operations Dashboard Usage
// ============================================

// Access the operations dashboard at:
// /operations/dashboard

// Features:
// - View all active deliveries
// - Filter by status
// - See real-time ETA
// - Start/stop individual deliveries
// - Export delivery report
// - Click on delivery for details modal
// - View map for each delivery


// ============================================
// STEP 8: Environment Configuration
// ============================================

/*
If running on different domains, update CORS in backend:

// In backend server.py:
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://yourdomain.com",
        "https://app.yourdomain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

// For WebSocket, ensure same origin or configure CORS
*/


// ============================================
// STEP 9: Styling & Customization
// ============================================

// DeliveryTrackingMap.jsx uses Tailwind CSS
// Make sure Tailwind is installed:
// npm install -D tailwindcss postcss autoprefixer
// npx tailwindcss init -p

// DeliveryOperationsDashboard.jsx also uses Tailwind

// Customize colors:
// Change: from-blue-50 to-blue-100 → from-YOUR-COLOR-50 to-YOUR-COLOR-100
// Change: bg-blue-600 → bg-YOUR-COLOR-600


// ============================================
// STEP 10: Testing
// ============================================

// Test tracking endpoints with curl:

# Start tracking
curl -X POST http://localhost:9885/api/gps/tracking/start/delivery-123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update location
curl -X POST "http://localhost:9885/api/gps/tracking/update/delivery-123?latitude=28.7041&longitude=77.1025&speed=15" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get active deliveries
curl -X GET http://localhost:9885/api/gps/deliveries/active \
  -H "Authorization: Bearer YOUR_TOKEN"

# Calculate ETA
curl -X GET "http://localhost:9885/api/gps/eta?current_latitude=28.7041&current_longitude=77.1025&destination_latitude=28.7589&destination_longitude=77.0262" \
  -H "Authorization: Bearer YOUR_TOKEN"


// ============================================
// STEP 11: WebSocket Testing
// ============================================

/*
Test WebSocket in browser console:

const ws = new WebSocket('ws://localhost:9885/api/gps/ws/tracking/delivery-123');

ws.onopen = () => {
  console.log('Connected');
  
  // Send location update
  ws.send(JSON.stringify({
    type: 'location_update',
    latitude: 28.7041,
    longitude: 77.1025,
    speed: 15,
    accuracy: 5
  }));
};

ws.onmessage = (event) => {
  console.log('Message:', JSON.parse(event.data));
};

ws.onerror = (error) => {
  console.error('Error:', error);
};
*/


// ============================================
// STEP 12: Performance Optimization
// ============================================

/*
1. Lazy load map component:
   import { lazy, Suspense } from 'react';
   const DeliveryTrackingMap = lazy(() => import('./components/DeliveryTrackingMap'));
   
   <Suspense fallback={<div>Loading map...</div>}>
     <DeliveryTrackingMap />
   </Suspense>

2. Memoize components:
   export default React.memo(DeliveryTrackingMap);

3. Use React Query for caching:
   npm install @tanstack/react-query
   
   const { data } = useQuery(
     ['tracking', deliveryId],
     () => gpsService.getTracking(deliveryId),
     { refetchInterval: 10000 }  // Refetch every 10 seconds
   );

4. Virtual scrolling for long lists:
   npm install react-window
*/


// ============================================
// STEP 13: Error Handling
// ============================================

/*
Common errors and solutions:

1. "WebSocket connection failed"
   - Check WebSocket URL
   - Ensure backend is running
   - Check CORS configuration
   
2. "Unauthorized (401)"
   - Check JWT token in localStorage
   - Verify token is not expired
   - Check Authorization header format
   
3. "Forbidden (403)"
   - Verify user role has permission
   - Check delivery_id ownership
   
4. "Invalid coordinates"
   - Verify latitude is -90 to 90
   - Verify longitude is -180 to 180
   
5. "Map not loading"
   - Check Leaflet CSS import
   - Verify map container has height
   - Check browser console for errors
*/


// ============================================
// STEP 14: Deployment Checklist
// ============================================

/*
Before deploying to production:

Frontend:
- [ ] Build optimized production bundle: npm run build
- [ ] Test all GPS features in staging
- [ ] Verify WebSocket connection on staging
- [ ] Update API base URL for production
- [ ] Test on mobile devices
- [ ] Verify performance (Core Web Vitals)
- [ ] Check accessibility (WCAG)
- [ ] Test in multiple browsers

Backend:
- [ ] Deploy GPS service files
- [ ] Create database collections
- [ ] Add indexes for query performance
- [ ] Configure production CORS
- [ ] Set up SSL certificates (for WSS)
- [ ] Configure firewall for WebSocket port
- [ ] Test API endpoints in production
- [ ] Monitor for errors and performance
- [ ] Set up backup for tracking data

DevOps:
- [ ] Configure load balancer for WebSocket sticky sessions
- [ ] Set up monitoring/alerting
- [ ] Configure auto-scaling if needed
- [ ] Plan disaster recovery
- [ ] Document rollback procedure
*/


// ============================================
// STEP 15: Monitoring & Analytics
// ============================================

/*
Add monitoring to track:

1. GPS Tracking Metrics:
   - Active deliveries count
   - Average ETA accuracy
   - Location update frequency
   - WebSocket connection uptime

2. User Behavior:
   - How many customers view tracking
   - Average tracking session duration
   - Tracking engagement rate

3. Performance Metrics:
   - API response times
   - WebSocket latency
   - Database query performance
   - Location history storage size

Use tools like:
- Sentry (error tracking)
- DataDog (performance monitoring)
- PostHog (product analytics)
- New Relic (APM)
*/

export default {};
