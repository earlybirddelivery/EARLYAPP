import { useEffect, useState, useCallback } from 'react';
import { initDB, getAll, put, getById, STORES } from '@/lib/offlineDB';
import { addToSyncQueue, syncWithBackend, getSyncStats } from '@/lib/syncQueue';

/**
 * Custom hook for offline-first data management
 * Provides local data access with automatic sync
 */
export const useOfflineData = () => {
  const [db, setDb] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState({ pending: 0, completed: 0, failed: 0, total: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize database
  useEffect(() => {
    const initializeDB = async () => {
      try {
        const database = await initDB();
        setDb(database);
        console.log('[Offline] Database initialized');
        
        // Update sync stats
        const stats = await getSyncStats(database);
        setSyncStats(stats);
      } catch (error) {
        console.error('[Offline] Failed to initialize database:', error);
      }
    };

    initializeDB();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Offline] Going online - syncing data...');
      setIsOnline(true);
      if (db) {
        syncData();
      }
    };

    const handleOffline = () => {
      console.log('[Offline] Going offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [db]);

  /**
   * Get deliveries from local storage
   */
  const getDeliveries = useCallback(async () => {
    if (!db) return [];
    try {
      const deliveries = await getAll(db, STORES.DELIVERIES);
      console.log('[Offline] Retrieved deliveries:', deliveries.length);
      return deliveries;
    } catch (error) {
      console.error('[Offline] Error getting deliveries:', error);
      return [];
    }
  }, [db]);

  /**
   * Get delivery by ID
   */
  const getDelivery = useCallback(async (id) => {
    if (!db) return null;
    try {
      const delivery = await getById(db, STORES.DELIVERIES, id);
      return delivery;
    } catch (error) {
      console.error('[Offline] Error getting delivery:', error);
      return null;
    }
  }, [db]);

  /**
   * Update delivery locally and queue for sync
   */
  const updateDelivery = useCallback(async (deliveryId, updates) => {
    if (!db) return;
    try {
      const delivery = await getById(db, STORES.DELIVERIES, deliveryId);
      const updated = { ...delivery, ...updates, updated_at: new Date().toISOString() };
      
      await put(db, STORES.DELIVERIES, updated);
      
      // Queue for sync
      await addToSyncQueue(
        db,
        'delivery_update',
        `/api/deliveries/${deliveryId}`,
        updated
      );

      console.log('[Offline] Updated delivery:', deliveryId);
      
      // Update sync stats
      const stats = await getSyncStats(db);
      setSyncStats(stats);
      
      return updated;
    } catch (error) {
      console.error('[Offline] Error updating delivery:', error);
      throw error;
    }
  }, [db]);

  /**
   * Get customers from local storage
   */
  const getCustomers = useCallback(async () => {
    if (!db) return [];
    try {
      const customers = await getAll(db, STORES.CUSTOMERS);
      return customers;
    } catch (error) {
      console.error('[Offline] Error getting customers:', error);
      return [];
    }
  }, [db]);

  /**
   * Get orders from local storage
   */
  const getOrders = useCallback(async () => {
    if (!db) return [];
    try {
      const orders = await getAll(db, STORES.ORDERS);
      return orders;
    } catch (error) {
      console.error('[Offline] Error getting orders:', error);
      return [];
    }
  }, [db]);

  /**
   * Cache data from API for offline use
   */
  const cacheData = useCallback(async (storeName, data) => {
    if (!db || !Array.isArray(data)) return;
    try {
      for (const item of data) {
        await put(db, storeName, item);
      }
      console.log(`[Offline] Cached ${data.length} items in ${storeName}`);
    } catch (error) {
      console.error('[Offline] Error caching data:', error);
    }
  }, [db]);

  /**
   * Sync pending operations with backend
   */
  const syncData = useCallback(async () => {
    if (!db || !isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const result = await syncWithBackend(db);
      console.log('[Offline] Sync result:', result);
      
      // Update stats
      const stats = await getSyncStats(db);
      setSyncStats(stats);
      
      return result;
    } catch (error) {
      console.error('[Offline] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [db, isOnline, isSyncing]);

  return {
    isOnline,
    isSyncing,
    syncStats,
    getDeliveries,
    getDelivery,
    updateDelivery,
    getCustomers,
    getOrders,
    cacheData,
    syncData,
    db,
  };
};

export default useOfflineData;
