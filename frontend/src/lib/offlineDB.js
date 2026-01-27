/**
 * IndexedDB Setup and Management
 * Handles offline data storage for deliveries, customers, orders, etc.
 */

const DB_NAME = 'earlybird-offline-db';
const DB_VERSION = 1;

// Store names for different data types
export const STORES = {
  DELIVERIES: 'deliveries',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  SYNC_QUEUE: 'sync-queue',
  METADATA: 'metadata',
};

/**
 * Initialize IndexedDB
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      console.log('[Offline DB] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('[Offline DB] Upgrading database...');

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.DELIVERIES)) {
        db.createObjectStore(STORES.DELIVERIES, { keyPath: 'id' });
        console.log('[Offline DB] Created deliveries store');
      }

      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        console.log('[Offline DB] Created customers store');
      }

      if (!db.objectStoreNames.contains(STORES.ORDERS)) {
        db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
        console.log('[Offline DB] Created orders store');
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('status', 'status', { unique: false });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('[Offline DB] Created sync queue store');
      }

      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        console.log('[Offline DB] Created metadata store');
      }
    };
  });
};

/**
 * Get all items from a store
 */
export const getAll = (db, storeName) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Offline DB] Retrieved ${request.result.length} items from ${storeName}`);
      resolve(request.result);
    };
  });
};

/**
 * Get single item by ID
 */
export const getById = (db, storeName, id) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Offline DB] Retrieved item ${id} from ${storeName}`);
      resolve(request.result);
    };
  });
};

/**
 * Add or update item
 */
export const put = (db, storeName, data) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Offline DB] Saved item to ${storeName}:`, data);
      resolve(request.result);
    };
  });
};

/**
 * Add multiple items
 */
export const putMultiple = (db, storeName, items) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    items.forEach(item => {
      store.put(item);
    });

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      console.log(`[Offline DB] Saved ${items.length} items to ${storeName}`);
      resolve(items.length);
    };
  });
};

/**
 * Delete item
 */
export const deleteItem = (db, storeName, id) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Offline DB] Deleted item ${id} from ${storeName}`);
      resolve();
    };
  });
};

/**
 * Clear entire store
 */
export const clearStore = (db, storeName) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Offline DB] Cleared ${storeName}`);
      resolve();
    };
  });
};

/**
 * Get items by index
 */
export const getByIndex = (db, storeName, indexName, value) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Offline DB] Retrieved ${request.result.length} items from ${storeName} by ${indexName}`);
      resolve(request.result);
    };
  });
};

/**
 * Count items in store
 */
export const count = (db, storeName) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
};
