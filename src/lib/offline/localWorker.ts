import type { PendingQueueItem, LocalQueueStats, LocalDeliveryState } from './localQueueTypes';
import { getAllIdbItems, updateIdbItem } from './idbStorage';
import { getMemoryItems, updateMemoryItem } from './memoryQueue';
import { commitToLocalDemoStore } from './localDemoStore';
import { backend } from '../supabase';

let simulatedOffline = false;
const activeProcessingIds = new Set<string>();

export const MAX_RETRY_ATTEMPTS = 5;
export const BASE_BACKOFF_MS = 2000;
export const MAX_BACKOFF_MS = 60000;

export function setSimulatedOffline(val: boolean): void {
  simulatedOffline = val;
}

export function isSimulatedOffline(): boolean {
  return simulatedOffline;
}

export function isEffectiveOnline(): boolean {
  const navOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return navOnline && !simulatedOffline;
}

export function calculateBackoffDelay(attemptCount: number): number {
  const exponent = Math.max(0, attemptCount - 1);
  const baseDelay = BASE_BACKOFF_MS * Math.pow(2, exponent);
  const jitter = Math.floor(Math.random() * 1000);
  return Math.min(MAX_BACKOFF_MS, baseDelay + jitter);
}

export function notifyQueueUpdate(detail?: { queue_id?: string; sos_id?: string; status?: string }): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jeevascan_local_queue_updated', { detail }));
  }
}

function isEligibleForProcessing(status: LocalDeliveryState): boolean {
  return (
    status === 'QUEUED_LOCAL' ||
    status === 'TEMPORARY_MEMORY_ONLY' ||
    status === 'LOCAL_PROCESSING_RETRY' ||
    status === 'RETRY_SCHEDULED'
  );
}

/**
 * Executes a single queue item synchronization attempt with identical
 * state transitions across both IndexedDB and in-memory storage.
 */
async function processQueueItem(
  item: PendingQueueItem,
  persistFn: (item: PendingQueueItem) => Promise<void> | void
): Promise<{ processed: boolean; error?: string }> {
  // 1. Guard against concurrent overlapping runs for the same item
  if (activeProcessingIds.has(item.queue_id)) {
    return { processed: false };
  }

  // 2. State eligibility check
  if (!isEligibleForProcessing(item.delivery_status)) {
    return { processed: false };
  }

  // 3. Enforce next_retry_at window
  if (item.next_retry_at && Date.now() < item.next_retry_at) {
    return { processed: false };
  }

  // 4. Enforce TTL pre-attempt check: Expired records must NEVER be sent over wire
  if (Date.now() >= item.valid_until) {
    item.delivery_status = 'EXPIRED_LOCALLY';
    item.last_error = 'TTL elapsed before processing commenced';
    item.next_retry_at = null;
    await persistFn(item);
    return { processed: false, error: `Queue item ${item.queue_id}: TTL expired` };
  }

  // 5. Connectivity check: If offline or simulated offline, leave item pending
  const online = isEffectiveOnline();
  if (!online) {
    return { processed: false };
  }

  // 6. Enforce retry attempt limit
  if (item.attempt_count >= MAX_RETRY_ATTEMPTS) {
    item.delivery_status = 'RETRY_LIMIT_EXCEEDED';
    item.last_error = `Maximum retry attempts exceeded (${MAX_RETRY_ATTEMPTS}/${MAX_RETRY_ATTEMPTS})`;
    item.next_retry_at = null;
    await persistFn(item);
    return { processed: false, error: `Queue item ${item.queue_id}: Retry limit exceeded` };
  }

  // Lock item for execution
  activeProcessingIds.add(item.queue_id);
  item.delivery_status = 'UPLOADING';
  item.last_attempt_at = Date.now();
  item.attempt_count += 1;

  try {
    // Persist locked state before initiating upload
    await persistFn(item);
  } catch (err) {
    console.warn(`Failed to persist locked state for ${item.queue_id}:`, err);
  }

  try {
    const isLive = backend.isConfigured;
    let result: { success: boolean; incidentId: string; isDuplicate: boolean; message: string };

    if (isLive) {
      // Live Supabase mode (preserves existing anonymous insert RLS rules; no .select())
      result = await backend.submitSOS(item.payload);
    } else {
      // Local demo store mode
      result = await commitToLocalDemoStore(item.payload);
    }

    if (result.success) {
      // Confirmed receipt
      item.delivery_status = isLive ? 'CONFIRMED_SERVER_RECEIPT' : 'LOCAL_DEMO_COMMITTED';
      item.committed_at = Date.now();
      item.last_error = null;
      item.next_retry_at = null;
      item.server_receipt = {
        received_at: new Date().toISOString(),
        is_duplicate: result.isDuplicate,
        mode: isLive ? 'live_supabase' : 'demo_mode',
        message: result.message,
        tracking_code: `JS-${item.sos_id.slice(0, 4).toUpperCase()}`,
      };
      await persistFn(item);
      return { processed: true };
    }

    // Handle failure
    const errorMsg = result.message || 'Synchronization failed';
    if (errorMsg.includes('expired')) {
      item.delivery_status = 'EXPIRED_LOCALLY';
      item.next_retry_at = null;
    } else if (
      errorMsg.includes('Missing') ||
      errorMsg.includes('Invalid') ||
      errorMsg.includes('Unauthorized') ||
      errorMsg.includes('violates check constraint')
    ) {
      // Permanent failure: Do not retry indefinitely
      item.delivery_status = 'VALIDATION_FAILED';
      item.next_retry_at = null;
    } else if (item.attempt_count >= MAX_RETRY_ATTEMPTS) {
      // Exhausted retries
      item.delivery_status = 'RETRY_LIMIT_EXCEEDED';
      item.next_retry_at = null;
    } else {
      // Transient network or server error: schedule backoff retry
      item.delivery_status = 'RETRY_SCHEDULED';
      item.next_retry_at = Date.now() + calculateBackoffDelay(item.attempt_count);
    }

    item.last_error = errorMsg;
    await persistFn(item);
    return { processed: false, error: `Queue item ${item.queue_id}: ${errorMsg}` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown network failure';
    if (item.attempt_count >= MAX_RETRY_ATTEMPTS) {
      item.delivery_status = 'RETRY_LIMIT_EXCEEDED';
      item.next_retry_at = null;
    } else {
      item.delivery_status = 'RETRY_SCHEDULED';
      item.next_retry_at = Date.now() + calculateBackoffDelay(item.attempt_count);
    }
    item.last_error = errorMsg;
    try {
      await persistFn(item);
    } catch {}
    return { processed: false, error: `Queue item ${item.queue_id}: ${errorMsg}` };
  } finally {
    activeProcessingIds.delete(item.queue_id);
  }
}

/**
 * Phase 8 Queue Processor:
 * Safe, idempotent queue synchronization supporting both Live Supabase and Demo mode.
 */
let activeProcessingPromise: Promise<{ processedCount: number; errors: string[] }> | null = null;
let queuedRerunPromise: Promise<{ processedCount: number; errors: string[] }> | null = null;

async function executeQueueProcessing(): Promise<{ processedCount: number; errors: string[] }> {
  let processedCount = 0;
  const errors: string[] = [];

  try {
    // 1. Process items from durable IndexedDB queue
    let idbItems: PendingQueueItem[] = [];
    try {
      idbItems = await getAllIdbItems();
    } catch (err) {
      console.warn('Could not read IndexedDB queue during processing:', err);
    }

    for (const item of idbItems) {
      const res = await processQueueItem(item, async (updated) => {
        await updateIdbItem(updated);
      });
      if (res.processed) processedCount++;
      if (res.error) errors.push(res.error);
    }

    // 2. Process items from volatile in-memory queue
    const memItems = getMemoryItems();
    for (const item of memItems) {
      const res = await processQueueItem(item, (updated) => {
        updateMemoryItem(updated);
      });
      if (res.processed) processedCount++;
      if (res.error) errors.push(res.error);
    }
  } finally {
    notifyQueueUpdate();
  }

  return { processedCount, errors };
}

/**
 * Phase 8 Queue Processor:
 * Safe, idempotent queue synchronization supporting both Live Supabase and Demo mode.
 * Serializes concurrent execution so rapid calls never drop processing passes.
 */
export async function processLocalQueue(): Promise<{ processedCount: number; errors: string[] }> {
  if (activeProcessingPromise) {
    if (!queuedRerunPromise) {
      queuedRerunPromise = activeProcessingPromise.then(() => {
        queuedRerunPromise = null;
        return executeQueueProcessing();
      });
    }
    return queuedRerunPromise;
  }

  activeProcessingPromise = executeQueueProcessing();
  try {
    return await activeProcessingPromise;
  } finally {
    activeProcessingPromise = null;
  }
}

/**
 * Returns summary metrics of all items across IndexedDB and memory queues.
 * Accurately includes retry-scheduled items in totalPending.
 */
export async function getLocalQueueStats(): Promise<LocalQueueStats> {
  let idbItems: PendingQueueItem[] = [];
  try {
    idbItems = await getAllIdbItems();
  } catch {
    idbItems = [];
  }

  const memItems = getMemoryItems();
  const allItems = [...idbItems, ...memItems];

  const isPendingStatus = (s: LocalDeliveryState) =>
    s === 'QUEUED_LOCAL' ||
    s === 'TEMPORARY_MEMORY_ONLY' ||
    s === 'LOCAL_PROCESSING' ||
    s === 'UPLOADING' ||
    s === 'LOCAL_PROCESSING_RETRY' ||
    s === 'RETRY_SCHEDULED';

  const isCommittedStatus = (s: LocalDeliveryState) =>
    s === 'LOCAL_DEMO_COMMITTED' || s === 'CONFIRMED_SERVER_RECEIPT';

  const isFailedOrExpired = (s: LocalDeliveryState) =>
    s === 'EXPIRED_LOCALLY' ||
    s === 'VALIDATION_FAILED_LOCAL' ||
    s === 'VALIDATION_FAILED' ||
    s === 'RETRY_LIMIT_EXCEEDED';

  const queuedDurable = idbItems.filter(
    (i) => i.delivery_status === 'QUEUED_LOCAL' || i.delivery_status === 'RETRY_SCHEDULED' || i.delivery_status === 'LOCAL_PROCESSING_RETRY'
  ).length;
  const queuedMemoryOnly = memItems.filter(
    (i) => i.delivery_status === 'TEMPORARY_MEMORY_ONLY' || i.delivery_status === 'RETRY_SCHEDULED' || i.delivery_status === 'LOCAL_PROCESSING_RETRY'
  ).length;
  const processing = allItems.filter((i) => i.delivery_status === 'UPLOADING' || i.delivery_status === 'LOCAL_PROCESSING').length;
  const committed = allItems.filter((i) => isCommittedStatus(i.delivery_status)).length;
  const failedOrExpired = allItems.filter((i) => isFailedOrExpired(i.delivery_status)).length;
  const totalPending = allItems.filter((i) => isPendingStatus(i.delivery_status)).length;

  return {
    queuedDurable,
    queuedMemoryOnly,
    processing,
    committed,
    failedOrExpired,
    totalPending,
    totalCommitted: committed,
  };
}

/**
 * Starts a recurring background queue worker (default every 8 seconds)
 * and returns a teardown function.
 */
export function startLocalQueueWorker(intervalMs = 8000): () => void {
  // Run immediately
  processLocalQueue().catch((err) => console.warn('Local queue initial run error:', err));

  const timer = setInterval(() => {
    processLocalQueue().catch((err) => console.warn('Local queue scheduled error:', err));
  }, intervalMs);

  return () => {
    clearInterval(timer);
  };
}
