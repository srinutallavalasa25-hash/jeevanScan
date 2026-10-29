/**
 * JEEVASCAN AI — DURABLE RELAY ACKNOWLEDGEMENT STORAGE
 * Tagline: Find Faster. Rescue Smarter.
 *
 * Implements Phase 8 Stage 2 durable acknowledgement persistence with a 3-tier strategy:
 *   - Tier 1: IndexedDB ('jeevascan_offline_store' -> 'relay_acknowledgements')
 *   - Tier 2: LocalStorage fallback ('jeevascan_relay_acks')
 *   - Tier 3: In-Memory fallback (clearly flagged as temporary)
 *
 * Strictly adheres to:
 *   - Zero live backend interaction (100% browser-local demo data)
 *   - Safe deduplication per sos_id
 *   - Transparent storage tier tagging and temporary flagging
 */

import type { RelayAckRecord, RelayAckStorageTier } from './relayTypes';
import {
  isIndexedDBAvailable,
  enqueueRelayAckIdb,
  getAllRelayAcksIdb,
  getRelayAckBySosIdIdb,
  clearAllRelayAcksIdb,
} from '../offline/idbStorage';

const LOCAL_STORAGE_ACK_KEY = 'jeevascan_relay_acks';

// In-memory fallback list (Tier 3)
let memoryRelayAcks: RelayAckRecord[] = [];

/**
 * Safely reads acknowledgements from localStorage.
 */
function getAcksFromLocalStorage(): RelayAckRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_STORAGE_ACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read relay ACKs from localStorage:', err);
    return [];
  }
}

/**
 * Safely writes acknowledgements to localStorage.
 */
function saveAcksToLocalStorage(acks: RelayAckRecord[]): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(LOCAL_STORAGE_ACK_KEY, JSON.stringify(acks));
    return true;
  } catch (err) {
    console.warn('Failed to write relay ACKs to localStorage:', err);
    return false;
  }
}

/**
 * Dispatches a custom window event for UI reactivity when an ACK is stored.
 */
function notifyAckChange(eventName: 'jeevascan:relay_ack_saved' | 'jeevascan:relay_ack_cleared', detail?: RelayAckRecord) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    } catch {
      // Ignore if event dispatch fails in non-DOM test runners
    }
  }
}

/**
 * Detects the highest available storage tier in the current environment.
 */
export function getActiveStorageTier(): RelayAckStorageTier {
  if (isIndexedDBAvailable()) {
    return 'durable_idb';
  }
  if (typeof localStorage !== 'undefined') {
    return 'durable_local_storage';
  }
  return 'temporary_memory';
}

/**
 * Retrieves a relay acknowledgement by SOS ID across all storage tiers.
 */
export async function getRelayAckBySosId(sosId: string): Promise<RelayAckRecord | null> {
  if (!sosId || typeof sosId !== 'string' || !sosId.trim()) {
    return null;
  }

  // 1. Check in-memory first (for fast hits or memory-only mode)
  const memAck = memoryRelayAcks.find((a) => a.sos_id === sosId);
  if (memAck) return memAck;

  // 2. Check IndexedDB (Tier 1)
  if (isIndexedDBAvailable()) {
    try {
      const idbAck = await getRelayAckBySosIdIdb(sosId);
      if (idbAck) return idbAck;
    } catch (err) {
      console.warn('IndexedDB read failed, checking localStorage fallback:', err);
    }
  }

  // 3. Check LocalStorage (Tier 2)
  const lsAcks = getAcksFromLocalStorage();
  const lsAck = lsAcks.find((a) => a.sos_id === sosId);
  if (lsAck) return lsAck;

  return null;
}

/**
 * Retrieves all stored relay acknowledgements across available storage tiers.
 * Merges records and eliminates duplicates by sos_id.
 */
export async function getAllRelayAcks(): Promise<RelayAckRecord[]> {
  const ackMap = new Map<string, RelayAckRecord>();

  // 1. Load from IndexedDB
  if (isIndexedDBAvailable()) {
    try {
      const idbAcks = await getAllRelayAcksIdb();
      for (const ack of idbAcks) {
        ackMap.set(ack.sos_id, ack);
      }
    } catch (err) {
      console.warn('Failed to load ACKs from IndexedDB; checking secondary storage:', err);
    }
  }

  // 2. Load from LocalStorage if IDB was empty or unavailable
  if (ackMap.size === 0) {
    const lsAcks = getAcksFromLocalStorage();
    for (const ack of lsAcks) {
      ackMap.set(ack.sos_id, ack);
    }
  }

  // 3. Merge in-memory records (takes precedence if memory fallback was triggered)
  for (const ack of memoryRelayAcks) {
    if (!ackMap.has(ack.sos_id)) {
      ackMap.set(ack.sos_id, ack);
    }
  }

  // Sort descending by ingressed_at
  return Array.from(ackMap.values()).sort(
    (a, b) => new Date(b.ingressed_at).getTime() - new Date(a.ingressed_at).getTime()
  );
}

/**
 * Saves a relay acknowledgement using the 3-tier durable fallback strategy.
 * If an ACK for this sos_id already exists, preserves it and returns it with is_duplicate: true.
 */
export async function saveRelayAck(ackInput: RelayAckRecord): Promise<RelayAckRecord> {
  // Deduplication check: check if already acknowledged
  const existing = await getRelayAckBySosId(ackInput.sos_id);
  if (existing) {
    const duplicateAck: RelayAckRecord = {
      ...existing,
      is_duplicate: true,
    };
    return duplicateAck;
  }

  // Tier 1: Try IndexedDB
  if (isIndexedDBAvailable()) {
    try {
      const idbAck: RelayAckRecord = {
        ...ackInput,
        storage_tier: 'durable_idb',
        is_temporary: false,
      };
      await enqueueRelayAckIdb(idbAck);
      notifyAckChange('jeevascan:relay_ack_saved', idbAck);
      return idbAck;
    } catch (idbErr) {
      console.warn('IndexedDB save failed for relay ACK. Falling back to localStorage:', idbErr);
    }
  }

  // Tier 2: Try LocalStorage
  try {
    const lsAck: RelayAckRecord = {
      ...ackInput,
      storage_tier: 'durable_local_storage',
      is_temporary: false,
    };
    const currentAcks = getAcksFromLocalStorage();
    const updated = [lsAck, ...currentAcks.filter((a) => a.sos_id !== lsAck.sos_id)];
    const saved = saveAcksToLocalStorage(updated);
    if (saved) {
      notifyAckChange('jeevascan:relay_ack_saved', lsAck);
      return lsAck;
    }
  } catch (lsErr) {
    console.warn('LocalStorage save failed for relay ACK. Falling back to memory:', lsErr);
  }

  // Tier 3: In-Memory Fallback (Explicitly marked temporary)
  const memoryAck: RelayAckRecord = {
    ...ackInput,
    storage_tier: 'temporary_memory',
    is_temporary: true,
  };
  memoryRelayAcks = [memoryAck, ...memoryRelayAcks.filter((a) => a.sos_id !== memoryAck.sos_id)];
  notifyAckChange('jeevascan:relay_ack_saved', memoryAck);
  return memoryAck;
}

/**
 * Clears all relay acknowledgement records across all tiers.
 */
export async function clearAllRelayAcks(): Promise<void> {
  memoryRelayAcks = [];

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_STORAGE_ACK_KEY);
    } catch {
      // Ignore
    }
  }

  if (isIndexedDBAvailable()) {
    try {
      await clearAllRelayAcksIdb();
    } catch {
      // Ignore
    }
  }

  notifyAckChange('jeevascan:relay_ack_cleared');
}
