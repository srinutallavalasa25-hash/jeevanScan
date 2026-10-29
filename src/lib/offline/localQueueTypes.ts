import type { CreateIncidentPayload } from '../../types/database';

export type LocalDeliveryState =
  | 'QUEUED_LOCAL'            // Durably committed to IndexedDB pending queue
  | 'TEMPORARY_MEMORY_ONLY'   // In-memory volatile RAM fallback (storage failed)
  | 'LOCAL_PROCESSING'        // Currently being processed by local queue worker
  | 'UPLOADING'               // Network upload / synchronization in progress
  | 'CONFIRMED_SERVER_RECEIPT'// Confirmed live server receipt (Supabase)
  | 'LOCAL_DEMO_COMMITTED'    // Successfully committed to local demo incident store
  | 'LOCAL_PROCESSING_RETRY'  // Transient storage busy/conflict, scheduled for retry (legacy)
  | 'RETRY_SCHEDULED'         // Network/server retry scheduled with exponential backoff
  | 'VALIDATION_FAILED_LOCAL' // Local schema or validation error (legacy)
  | 'VALIDATION_FAILED'       // Permanent validation error
  | 'EXPIRED_LOCALLY'         // TTL expired before processing could be completed
  | 'RETRY_LIMIT_EXCEEDED';   // Retry attempt limit reached

export interface ServerReceipt {
  received_at: string;
  is_duplicate: boolean;
  mode: 'live_supabase' | 'demo_mode';
  message: string;
  tracking_code?: string;
}

export interface PendingQueueItem {
  queue_id: string;
  sos_id: string;
  payload: CreateIncidentPayload;
  delivery_status: LocalDeliveryState;
  is_demo: boolean;
  created_at: number;
  valid_until: number;
  attempt_count: number;
  last_attempt_at: number | null;
  next_retry_at: number | null;
  last_error: string | null;
  committed_at: number | null;
  is_memory_only?: boolean;
  server_receipt?: ServerReceipt | null;
}

export interface LocalCommitResult {
  success: boolean;
  incidentId: string;
  isDuplicate: boolean;
  message: string;
  is_demo: true;
}

export interface LocalQueueStats {
  queuedDurable: number;
  queuedMemoryOnly: number;
  processing: number;
  committed: number;
  failedOrExpired: number;
  totalPending: number;
  totalCommitted: number;
}
