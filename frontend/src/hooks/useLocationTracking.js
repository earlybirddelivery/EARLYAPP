import { useEffect, useState, useCallback } from 'react';
import {
  requestLocationPermission,
  startLocationTracking,
  stopLocationTracking,
  getCurrentLocation,
  syncLocationToBackend,
  checkLocationPermission,
} from '@/lib/locationTracking';

/**
 * Custom hook for location tracking
 * Used by delivery boys and marketing staff
 */
export const useLocationTracking = (deliveryId = null, syncInterval = 10000) => {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error

  const token = localStorage.getItem('token');

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const hasPermission = await checkLocationPermission();
      setHasPermission(hasPermission);
    } catch (error) {
      console.error('[Location Hook] Permission check error:', error);
    }
  };

  /**
   * Request location permission and start tracking
   */
  const requestPermissionAndStart = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const initialLocation = await requestLocationPermission();
      setLocation(initialLocation);
      setHasPermission(true);

      // Start continuous tracking
      startTracking();

      console.log('[Location Hook] Permission granted and tracking started');
    } catch (err) {
      console.error('[Location Hook] Permission request failed:', err);
      setError(err.message);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Start location tracking
   */
  const startTracking = useCallback(() => {
    if (!hasPermission) {
      setError('Location permission not granted');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const id = startLocationTracking(
        async (newLocation) => {
          setLocation(newLocation);

          // Sync to backend if deliveryId provided
          if (deliveryId && token) {
            setSyncStatus('syncing');
            try {
              await syncLocationToBackend(deliveryId, newLocation, token);
              setSyncStatus('success');
              setTimeout(() => setSyncStatus('idle'), 2000);
            } catch (syncError) {
              console.error('[Location Hook] Sync error:', syncError);
              setSyncStatus('error');
              setTimeout(() => setSyncStatus('idle'), 2000);
            }
          }
        },
        (err) => {
          console.error('[Location Hook] Tracking error:', err);
          setError(err.message);
        }
      );

      setWatchId(id);
      setIsTracking(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hasPermission, deliveryId, token]);

  /**
   * Stop location tracking
   */
  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      stopLocationTracking(watchId);
      setWatchId(null);
      setIsTracking(false);
    }
  }, [watchId]);

  /**
   * Get location once
   */
  const getLocation = useCallback(async () => {
    setLoading(true);
    try {
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      return currentLocation;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Manually sync location
   */
  const manualSync = useCallback(async () => {
    if (!location || !deliveryId || !token) return;

    setSyncStatus('syncing');
    try {
      await syncLocationToBackend(deliveryId, location, token);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      setSyncStatus('error');
      setError(err.message);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [location, deliveryId, token]);

  return {
    // State
    location,
    isTracking,
    hasPermission,
    loading,
    error,
    syncStatus,

    // Methods
    requestPermissionAndStart,
    startTracking,
    stopTracking,
    getLocation,
    manualSync,
  };
};

export default useLocationTracking;
