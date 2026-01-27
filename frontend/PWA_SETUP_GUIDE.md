# PWA (Progressive Web App) Setup Guide

## Overview
The EarlyBird app is now fully configured as a Progressive Web App (PWA) with the following features:

### ✅ Implemented Features

1. **Service Worker**
   - Offline support with intelligent caching
   - Background sync capability
   - Push notifications support
   - Cache-first strategy for static assets
   - Network-first strategy for API calls

2. **Web App Manifest**
   - App metadata and branding
   - Installation shortcuts
   - App icons (192x192 and 512x512)
   - Screenshots for app store
   - Theme colors and display settings

3. **PWA Component & Hook**
   - `usePWA()` - Custom hook for PWA features
   - `PWAWidget` - UI component for install prompts and status
   - Offline status detection
   - Update notifications
   - Install prompts

4. **iOS Support**
   - Apple mobile web app meta tags
   - Apple touch icons
   - Status bar styling
   - Safe area support (notch handling)

---

## File Structure

```
frontend/
├── public/
│   ├── manifest.json           # PWA manifest file
│   ├── service-worker.js       # Service worker for offline/caching
│   └── index.html              # Updated with PWA meta tags
├── src/
│   ├── hooks/
│   │   └── usePWA.js           # PWA functionality hook
│   ├── components/
│   │   ├── PWAWidget.jsx       # PWA UI component
│   │   └── PWAWidget.css       # PWA component styles
│   └── index.js                # Updated with SW registration
```

---

## How to Use

### 1. Display PWA Widget in Your App

In your main App.js or App.jsx:

```jsx
import PWAWidget from '@/components/PWAWidget';

function App() {
  return (
    <>
      <PWAWidget /> {/* Add this to show install prompt and status */}
      {/* Rest of your app */}
    </>
  );
}
```

### 2. Use PWA Hook in Components

```jsx
import usePWA from '@/hooks/usePWA';

function MyComponent() {
  const {
    isOnline,
    canInstall,
    installApp,
    sendNotification,
    requestNotificationPermission,
  } = usePWA();

  return (
    <div>
      {!isOnline && <p>You are offline</p>}
      {canInstall && (
        <button onClick={installApp}>
          Install App
        </button>
      )}
      <button onClick={() => sendNotification('Hello!')}>
        Send Notification
      </button>
    </div>
  );
}
```

### 3. Request Notification Permission

```jsx
const { requestNotificationPermission, sendNotification } = usePWA();

const handleNotifications = async () => {
  const granted = await requestNotificationPermission();
  if (granted) {
    sendNotification('Notification enabled!', {
      body: 'You will now receive notifications',
    });
  }
};
```

---

## Service Worker Features

### Caching Strategy

**Static Assets (Cache First)**
- Serves from cache first
- Falls back to network
- Updates cache in background

**API Calls (Network First)**
- Tries network first
- Falls back to cached response
- Offline responses return 503 with message

### Cache Names
- `earlybird-v1` - Static assets
- `earlybird-runtime-v1` - Dynamic content

### Clearing Caches
Old caches are automatically cleaned up on service worker activation.

---

## Testing the PWA

### Desktop (Chrome/Edge)
1. Build the app: `npm run build`
2. Serve with HTTPS (required for PWA)
3. Look for install button in address bar (or PWA Widget)
4. Click "Install" to add to desktop/taskbar

### Mobile (Android)
1. Open in Chrome
2. Tap three dots menu
3. Select "Install app" or "Add to Home screen"
4. App appears on home screen

### Mobile (iOS/Safari)
1. Open in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. App appears on home screen (limited offline support)

### Testing Offline Mode
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Reload page
5. App should load from cache
6. API calls show offline message

---

## Configuration

### manifest.json
Located at: `frontend/public/manifest.json`

Customize:
- `name` - Full app name
- `short_name` - Home screen name
- `description` - App description
- `theme_color` - App bar color
- `background_color` - Splash screen color
- `icons` - App icons (currently using emoji SVG)
- `shortcuts` - Quick access items

### service-worker.js
Located at: `frontend/public/service-worker.js`

Modify:
- `CACHE_NAME` - Cache version (increment to force update)
- `STATIC_ASSETS` - Assets to cache on install
- Cache strategies (network-first, cache-first, etc.)
- API endpoints for background sync

---

## Build & Deployment

### Build for Production
```bash
npm run build
```

### Important: HTTPS Required
PWA features (Service Worker, Push Notifications) require **HTTPS** connection.

For local testing, use:
- `localhost` (works without HTTPS)
- Self-signed certificate with `https://localhost:3000`

### Deployment
1. Ensure HTTPS is enabled
2. Verify manifest.json is served with correct MIME type
3. Service worker must be at root path or configured properly
4. Test on real device before production

---

## Troubleshooting

### Service Worker Not Registering
- Check DevTools > Application > Service Workers
- Ensure HTTPS (or localhost)
- Check browser console for errors
- Clear cache and hard refresh (Ctrl+Shift+R)

### App Not Installing on Android
- Chrome version must be recent
- HTTPS required (localhost OK)
- manifest.json must be valid
- Icons must be present

### Offline Mode Not Working
- Check DevTools > Application > Cache Storage
- Verify service worker scope
- Ensure assets are cached
- Check Network tab for failed requests

### Notifications Not Showing
- Request permission: `requestNotificationPermission()`
- Browser must have notification permission
- Background tab may not show notifications

---

## Next Steps

1. **Add App Icons**
   - Replace emoji SVG with actual PNG icons
   - Generate multiple sizes: 96px, 192px, 512px

2. **Enhance Offline Experience**
   - Create offline fallback page
   - Add offline indicator
   - Queue API requests for sync

3. **Push Notifications**
   - Set up push notification server
   - Request notification permission on app open

4. **Background Sync**
   - Implement delivery sync (`syncDeliveries()`)
   - Queue pending requests
   - Sync when online

5. **Analytics**
   - Track install rates
   - Monitor offline usage
   - Measure performance

---

## Resources

- [Web App Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Checklist](https://developers.google.com/web/progressive-web-apps/checklist)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)

---

## Support

For issues or questions about PWA functionality, check:
1. Browser DevTools > Application tab
2. Console for error messages
3. Service Worker registration status
4. Cache storage contents
