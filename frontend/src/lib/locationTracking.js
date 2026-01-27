/**
 * Location Tracking Service
 * Handles GPS location capture and background tracking for delivery boys
 */

export const LOCATION_TRACKING_CONFIG = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 0,
  interval: 10000, // Update location every 10 seconds
};

/**
 * Request location permission and start tracking
 */
export const requestLocationPermission = async () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by this browser'));
      return;
    }

    // Request permission
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[Location] Permission granted');
        resolve({
          granted: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.error('[Location] Permission denied:', error.message);
        reject(new Error(`Location permission denied: ${error.message}`));
      },
      LOCATION_TRACKING_CONFIG
    );
  });
};

/**
 * Start continuous location tracking
 * Returns watch ID to stop tracking later
 */
export const startLocationTracking = (onLocationUpdate, onError) => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation not supported'));
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: new Date().toISOString(),
      };

      console.log('[Location Tracking] Update:', location);
      onLocationUpdate(location);
    },
    (error) => {
      console.error('[Location Tracking] Error:', error.message);
      onError(error);
    },
    LOCATION_TRACKING_CONFIG
  );

  return watchId;
};

/**
 * Stop location tracking
 */
export const stopLocationTracking = (watchId) => {
  if (watchId !== null && watchId !== undefined) {
    navigator.geolocation.clearWatch(watchId);
    console.log('[Location Tracking] Stopped');
  }
};

/**
 * Get current location (one-time)
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
      },
      reject,
      LOCATION_TRACKING_CONFIG
    );
  });
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // in meters
};

/**
 * Sync location to backend
 */
export const syncLocationToBackend = async (deliveryId, location, token) => {
  try {
    const response = await fetch(`http://localhost:8000/api/deliveries/${deliveryId}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[Location Sync] Success:', result);
    return result;
  } catch (error) {
    console.error('[Location Sync] Error:', error);
    throw error;
  }
};

/**
 * Check if location permission is granted
 */
export const checkLocationPermission = async () => {
  if (!navigator.geolocation) {
    return false;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 1000 }
    );
  });
};
