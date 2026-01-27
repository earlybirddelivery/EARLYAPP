/**
 * Sync Queue Management
 * Manages offline operations that need to be synced to backend
 */

import { 
  getAll, 
  put, 
  deleteItem, 
  getByIndex, 
  STORES 
} from './offlineDB';

/**
 * Add operation to sync queue
 * @param {Object} db - IndexedDB instance
 * @param {string} type - Operation type (delivery_update, order_create, etc.)
 * @param {string} endpoint - API endpoint to sync to
 * @param {Object} payload - Data to sync
 * @param {number} retries - Number of retry attempts
 */
export const addToSyncQueue = async (db, type, endpoint, payload, retries = 3) => {
  const operation = {
    type,
    endpoint,
    payload,
    status: 'pending', // pending, syncing, completed, failed
    retries,
    attempts: 0,
    timestamp: new Date().toISOString(),
    lastAttempt: null,
    error: null,
  };

  await put(db, STORES.SYNC_QUEUE, operation);
  console.log('[Sync Queue] Added operation:', type, operation);
  
  // Trigger background sync if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-deliveries');
      console.log('[Sync Queue] Background sync registered');
    } catch (error) {
      console.log('[Sync Queue] Background sync not available:', error);
    }
  }
};

/**
 * Get pending operations
 */
export const getPendingOperations = async (db) => {
  return getByIndex(db, STORES.SYNC_QUEUE, 'status', 'pending');
};

/**
 * Update operation status
 */
export const updateOperationStatus = async (db, operationId, status, error = null) => {
  const operation = {
    id: operationId,
    status,
    lastAttempt: new Date().toISOString(),
    error,
  };

  // Merge with existing operation
  const tx = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
  const store = tx.objectStore(STORES.SYNC_QUEUE);
  
  return new Promise((resolve, reject) => {
    const getRequest = store.get(operationId);
    
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (existing) {
        const updated = {
          ...existing,
          status,
          lastAttempt: operation.lastAttempt,
          error,
          attempts: existing.attempts + 1,
        };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Operation not found'));
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
};

/**
 * Sync operations with backend
 */
export const syncWithBackend = async (db, apiBaseUrl = 'http://localhost:8000') => {
  try {
    const pendingOps = await getPendingOperations(db);
    
    if (pendingOps.length === 0) {
      console.log('[Sync Queue] No operations to sync');
      return { synced: 0, failed: 0 };
    }

    console.log(`[Sync Queue] Syncing ${pendingOps.length} operations...`);
    
    let synced = 0;
    let failed = 0;

    for (const operation of pendingOps) {
      try {
        // Skip if already attempted max retries
        if (operation.attempts >= operation.retries) {
          console.warn('[Sync Queue] Max retries reached for operation:', operation.id);
          await updateOperationStatus(db, operation.id, 'failed', 'Max retries exceeded');
          failed++;
          continue;
        }

        // Update status to syncing
        await updateOperationStatus(db, operation.id, 'syncing');

        // Make API call
        const url = `${apiBaseUrl}${operation.endpoint}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(operation.payload),
        });

        if (response.ok) {
          const result = await response.json();
          await updateOperationStatus(db, operation.id, 'completed');
          console.log('[Sync Queue] Successfully synced operation:', operation.id);
          synced++;
        } else {
          const error = await response.text();
          await updateOperationStatus(db, operation.id, 'pending', error);
          console.error('[Sync Queue] Sync failed for operation:', operation.id, error);
          failed++;
        }
      } catch (error) {
        await updateOperationStatus(db, operation.id, 'pending', error.message);
        console.error('[Sync Queue] Error syncing operation:', operation.id, error);
        failed++;
      }
    }

    console.log(`[Sync Queue] Sync complete - ${synced} succeeded, ${failed} failed`);
    return { synced, failed };
  } catch (error) {
    console.error('[Sync Queue] Sync error:', error);
    throw error;
  }
};

/**
 * Get sync statistics
 */
export const getSyncStats = async (db) => {
  try {
    const pending = await getByIndex(db, STORES.SYNC_QUEUE, 'status', 'pending');
    const completed = await getByIndex(db, STORES.SYNC_QUEUE, 'status', 'completed');
    const failed = await getByIndex(db, STORES.SYNC_QUEUE, 'status', 'failed');

    return {
      pending: pending.length,
      completed: completed.length,
      failed: failed.length,
      total: pending.length + completed.length + failed.length,
    };
  } catch (error) {
    console.error('[Sync Queue] Error getting stats:', error);
    return { pending: 0, completed: 0, failed: 0, total: 0 };
  }
};

/**
 * Clear completed operations
 */
export const clearCompletedOperations = async (db) => {
  try {
    const completed = await getByIndex(db, STORES.SYNC_QUEUE, 'status', 'completed');
    
    for (const op of completed) {
      await deleteItem(db, STORES.SYNC_QUEUE, op.id);
    }

    console.log(`[Sync Queue] Cleared ${completed.length} completed operations`);
    return completed.length;
  } catch (error) {
    console.error('[Sync Queue] Error clearing completed operations:', error);
    return 0;
  }
};
