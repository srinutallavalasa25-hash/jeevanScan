import type { PendingQueueItem } from './localQueueTypes';
import type { RelayAckRecord } from '../relay/relayTypes';

const DB_NAME = 'jeevascan_offline_store';
const DB_VERSION = 2;
const QUEUE_STORE = 'pending_sos_queue';
export const RELAY_ACK_STORE = 'relay_acknowledgements';

export class StorageUnavailableError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageUnavailableError';
    this.cause = cause;
  }
}

export class StorageWriteError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageWriteError';
    this.cause = cause;
  }
}

let dbInstancePromise: Promise<IDBDatabase> | null = null;

export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

export function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new StorageUnavailableError('IndexedDB is not available in this environment'));
  }

  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  dbInstancePromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'queue_id' });
          store.createIndex('sos_id', 'sos_id', { unique: false });
          store.createIndex('delivery_status', 'delivery_status', { unique: false });
          store.createIndex('valid_until', 'valid_until', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
        if (!db.objectStoreNames.contains(RELAY_ACK_STORE)) {
          const ackStore = db.createObjectStore(RELAY_ACK_STORE, { keyPath: 'ack_id' });
          ackStore.createIndex('sos_id', 'sos_id', { unique: false });
          ackStore.createIndex('ingressed_at', 'ingressed_at', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Reset cached promise if db closes unexpectedly
        db.onclose = () => {
          dbInstancePromise = null;
        };
        db.onerror = (e) => {
          console.warn('IndexedDB runtime error:', e);
        };
        resolve(db);
      };

      request.onerror = (event) => {
        dbInstancePromise = null;
        const err = (event.target as IDBOpenDBRequest).error;
        reject(new StorageUnavailableError(`Failed to open IndexedDB: ${err?.message || 'Access denied'}`, err));
      };

      request.onblocked = () => {
        console.warn('IndexedDB open blocked by another tab');
      };
    } catch (err) {
      dbInstancePromise = null;
      reject(new StorageUnavailableError('IndexedDB initialization failed synchronously', err));
    }
  });

  return dbInstancePromise;
}

/**
 * Enqueues a new item into IndexedDB.
 * Resolves ONLY after the transaction oncomplete event fires.
 */
export async function enqueueIdbItem(item: PendingQueueItem): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([QUEUE_STORE], 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);

      const request = store.add(item);

      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        console.error('IDB store.add error:', error);
      };

      // Requirement 5: Confirm IndexedDB writes only after transaction completion
      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(new StorageWriteError('IndexedDB transaction failed', tx.error));
      };

      tx.onabort = () => {
        reject(new StorageWriteError('IndexedDB transaction was aborted', tx.error));
      };
    } catch (err) {
      reject(new StorageWriteError('Failed to start transaction for enqueue', err));
    }
  });
}

/**
 * Updates an existing item in IndexedDB.
 * Resolves ONLY after the transaction oncomplete event fires.
 */
export async function updateIdbItem(item: PendingQueueItem): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([QUEUE_STORE], 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);

      store.put(item);

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(new StorageWriteError('IndexedDB update transaction failed', tx.error));
      };

      tx.onabort = () => {
        reject(new StorageWriteError('IndexedDB update transaction was aborted', tx.error));
      };
    } catch (err) {
      reject(new StorageWriteError('Failed to start transaction for update', err));
    }
  });
}

/**
 * Retrieves all items in the local queue.
 */
export async function getAllIdbItems(): Promise<PendingQueueItem[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([QUEUE_STORE], 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result || []) as PendingQueueItem[]);
      };

      request.onerror = () => {
        reject(new StorageWriteError('Failed to read from IndexedDB', request.error));
      };
    } catch (err) {
      reject(new StorageWriteError('Failed to start read transaction', err));
    }
  });
}

/**
 * Deletes an item by queue_id.
 * Resolves ONLY after transaction oncomplete event fires.
 */
export async function deleteIdbItem(queue_id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([QUEUE_STORE], 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);

      store.delete(queue_id);

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(new StorageWriteError('Failed to delete queue item', tx.error));
      };
    } catch (err) {
      reject(new StorageWriteError('Failed to start transaction for delete', err));
    }
  });
}

/**
 * Clears all items in the queue store.
 */
export async function clearAllIdbItems(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([QUEUE_STORE], 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);

      store.clear();

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(new StorageWriteError('Failed to clear queue', tx.error));
      };
    } catch (err) {
      reject(new StorageWriteError('Failed to start transaction for clear', err));
    }
  });
}

/**
 * Enqueues or updates a relay acknowledgement record into IndexedDB.
 */
export async function enqueueRelayAckIdb(ack: RelayAckRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([RELAY_ACK_STORE], 'readwrite');
      const store = tx.objectStore(RELAY_ACK_STORE);

      store.put(ack);

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(new StorageWriteError('Failed to persist relay acknowledgement to IndexedDB', tx.error));
      };

      tx.onabort = () => {
        reject(new StorageWriteError('IndexedDB transaction aborted while saving relay acknowledgement', tx.error));
      };
    } catch (err) {
      reject(new StorageWriteError('Failed to start transaction for relay acknowledgement', err));
    }
  });
}

/**
 * Retrieves all relay acknowledgement records from IndexedDB.
 */
export async function getAllRelayAcksIdb(): Promise<RelayAckRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([RELAY_ACK_STORE], 'readonly');
      const store = tx.objectStore(RELAY_ACK_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result as RelayAckRecord[]) || []);
      };

      request.onerror = () => {
        reject(new StorageUnavailableError('Failed to retrieve relay acknowledgements from IndexedDB', request.error));
      };
    } catch (err) {
      reject(new StorageUnavailableError('Failed to start transaction for reading relay acknowledgements', err));
    }
  });
}

/**
 * Retrieves a relay acknowledgement record by its sos_id.
 */
export async function getRelayAckBySosIdIdb(sosId: string): Promise<RelayAckRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([RELAY_ACK_STORE], 'readonly');
      const store = tx.objectStore(RELAY_ACK_STORE);
      let request: IDBRequest;

      if (store.indexNames && store.indexNames.contains('sos_id')) {
        const index = store.index('sos_id');
        request = index.get(sosId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        if (store.indexNames && store.indexNames.contains('sos_id')) {
          resolve((request.result as RelayAckRecord) || null);
        } else {
          const list = (request.result as RelayAckRecord[]) || [];
          const found = list.find((a) => a.sos_id === sosId) || null;
          resolve(found);
        }
      };

      request.onerror = () => {
        reject(new StorageUnavailableError(`Failed to find relay acknowledgement for sos_id: ${sosId}`, request.error));
      };
    } catch (err) {
      reject(new StorageUnavailableError('Failed to query relay acknowledgement by sos_id', err));
    }
  });
}

/**
 * Clears all relay acknowledgement records from IndexedDB.
 */
export async function clearAllRelayAcksIdb(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([RELAY_ACK_STORE], 'readwrite');
      const store = tx.objectStore(RELAY_ACK_STORE);

      store.clear();

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(new StorageWriteError('Failed to clear relay acknowledgements', tx.error));
      };
    } catch (err) {
      reject(new StorageWriteError('Failed to start transaction for clearing relay acks', err));
    }
  });
}
