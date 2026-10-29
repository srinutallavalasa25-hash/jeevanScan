import type { CreateIncidentPayload } from '../../types/database';
import type { PendingQueueItem, LocalDeliveryState } from './localQueueTypes';
import { enqueueIdbItem, getAllIdbItems, deleteIdbItem, updateIdbItem } from './idbStorage';
import { enqueueMemoryItem, getMemoryItems, removeMemoryItem, updateMemoryItem } from './memoryQueue';
import { processLocalQueue, notifyQueueUpdate } from './localWorker';
import { backend } from '../supabase';

export { setSimulatedOffline, isSimulatedOffline, isEffectiveOnline } from './localWorker';

export interface EnqueueResult {
  queueId: string;
  status: LocalDeliveryState;
  isMemoryOnly: boolean;
  message: string;
}

/**
 * Entry point for enqueuing an SOS report.
 * Tries durable IndexedDB first (resolves on tx.oncomplete);
 * falls back to volatile memoryQueue if storage is blocked or quota exceeded.
 */
export async function enqueueOfflineSOS(payload: CreateIncidentPayload): Promise<EnqueueResult> {
  const queueId = crypto.randomUUID();
  const validUntilMs = new Date(payload.valid_until).getTime();

  const item: PendingQueueItem = {
    queue_id: queueId,
    sos_id: payload.sos_id,
    payload,
    delivery_status: 'QUEUED_LOCAL',
    is_demo: !backend.isConfigured,
    created_at: Date.now(),
    valid_until: validUntilMs,
    attempt_count: 0,
    last_attempt_at: null,
    next_retry_at: null,
    last_error: null,
    committed_at: null,
    is_memory_only: false,
    server_receipt: null,
  };

  try {
    // Attempt durable IndexedDB transaction commit (Requirement 5)
    await enqueueIdbItem(item);

    notifyQueueUpdate();

    // Trigger local processor asynchronously
    setTimeout(() => {
      processLocalQueue().catch((err) => console.warn('Background local processor error:', err));
    }, 50);

    return {
      queueId,
      status: 'QUEUED_LOCAL',
      isMemoryOnly: false,
      message: 'SOS successfully registered in durable device storage',
    };
  } catch (err) {
    // Requirement 6: Storage write failed, honest fallback to volatile memory
    console.warn('IndexedDB write failed. Falling back to temporary in-memory queue:', err);

    const memoryItem: PendingQueueItem = {
      ...item,
      delivery_status: 'TEMPORARY_MEMORY_ONLY',
      is_memory_only: true,
      last_error: err instanceof Error ? err.message : 'Storage denied/quota exceeded',
    };

    enqueueMemoryItem(memoryItem);
    notifyQueueUpdate();

    // Trigger local processor asynchronously
    setTimeout(() => {
      processLocalQueue().catch((err) => console.warn('Background local processor error:', err));
    }, 50);

    return {
      queueId,
      status: 'TEMPORARY_MEMORY_ONLY',
      isMemoryOnly: true,
      message: 'Local storage unavailable. Retained in temporary session memory only.',
    };
  }
}

/**
 * Retrieves all queued items across IndexedDB and volatile memory.
 */
export async function getAllLocalQueueItems(): Promise<PendingQueueItem[]> {
  let idbItems: PendingQueueItem[] = [];
  try {
    idbItems = await getAllIdbItems();
  } catch {
    idbItems = [];
  }
  const memItems = getMemoryItems();
  return [...memItems, ...idbItems];
}

/**
 * Re-attempts processing for a queued item that failed or was retried.
 */
export async function retryLocalQueueItem(queueId: string): Promise<void> {
  // Check memory queue first
  const memItems = getMemoryItems();
  const memItem = memItems.find((i) => i.queue_id === queueId);
  if (memItem) {
    memItem.delivery_status = 'TEMPORARY_MEMORY_ONLY';
    memItem.attempt_count = 0;
    memItem.next_retry_at = null;
    memItem.last_error = null;
    updateMemoryItem(memItem);
    await processLocalQueue();
    return;
  }

  // Check IndexedDB
  const idbItems = await getAllIdbItems();
  const idbItem = idbItems.find((i) => i.queue_id === queueId);
  if (idbItem) {
    idbItem.delivery_status = 'QUEUED_LOCAL';
    idbItem.attempt_count = 0;
    idbItem.next_retry_at = null;
    idbItem.last_error = null;
    await updateIdbItem(idbItem);
    await processLocalQueue();
  }
}

/**
 * Removes an item from the queue (e.g. after review or cancellation).
 */
export async function removeLocalQueueItem(queueId: string): Promise<void> {
  removeMemoryItem(queueId);
  try {
    await deleteIdbItem(queueId);
  } catch (err) {
    console.warn('Could not delete from IndexedDB:', err);
  }
  notifyQueueUpdate();
}
