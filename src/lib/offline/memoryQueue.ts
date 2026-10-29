import type { PendingQueueItem } from './localQueueTypes';
import type { CreateIncidentPayload } from '../../types/database';

// In-memory array of records that failed persistent disk write
// Strictly volatile: wiped when tab is closed or reloaded
const memoryQueue: PendingQueueItem[] = [];

let beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

export function getMemoryItems(): PendingQueueItem[] {
  return [...memoryQueue];
}

export function enqueueMemoryItem(item: PendingQueueItem): void {
  const existingIndex = memoryQueue.findIndex((i) => i.queue_id === item.queue_id);
  if (existingIndex >= 0) {
    memoryQueue[existingIndex] = { ...item, is_memory_only: true };
  } else {
    memoryQueue.push({ ...item, is_memory_only: true });
  }
  updateUnloadGuard();
}

export function updateMemoryItem(item: PendingQueueItem): void {
  const index = memoryQueue.findIndex((i) => i.queue_id === item.queue_id);
  if (index >= 0) {
    memoryQueue[index] = { ...item, is_memory_only: true };
  }
  updateUnloadGuard();
}

export function removeMemoryItem(queue_id: string): void {
  const index = memoryQueue.findIndex((i) => i.queue_id === queue_id);
  if (index >= 0) {
    memoryQueue.splice(index, 1);
  }
  updateUnloadGuard();
}

export function clearMemoryQueue(): void {
  memoryQueue.length = 0;
  updateUnloadGuard();
}

export function hasMemoryOnlyItems(): boolean {
  return memoryQueue.length > 0;
}

/**
 * Requirement 6: Browser tab exit/reload guard
 * If volatile in-memory items exist, warn the user before closing or refreshing.
 */
function updateUnloadGuard(): void {
  if (typeof window === 'undefined') return;

  if (memoryQueue.length > 0) {
    if (!beforeUnloadHandler) {
      beforeUnloadHandler = (e: BeforeUnloadEvent) => {
        if (memoryQueue.length > 0) {
          e.preventDefault();
          // Setting e.returnValue triggers standard browser confirmation dialog
          e.returnValue = '';
        }
      };
      window.addEventListener('beforeunload', beforeUnloadHandler);
    }
  } else {
    if (beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      beforeUnloadHandler = null;
    }
  }
}

/**
 * Requirement 6: Formats the SOS payload into readable plain text for emergency clipboard export.
 */
export function formatSOSTextForClipboard(payload: CreateIncidentPayload): string {
  const lines = [
    '=== JEEVASCAN AI DEMO SOS EXPORT ===',
    `STATUS: TEMPORARY SESSION ONLY (Not Saved to Disk)`,
    `SOS ID: ${payload.sos_id}`,
    `EMERGENCY CATEGORY: ${payload.emergency_type.toUpperCase()}`,
    `PRIORITY: ${payload.priority.toUpperCase()}`,
    `DESCRIPTION: ${payload.description}`,
    `COORDINATES: ${
      payload.latitude != null && payload.longitude != null
        ? `${payload.latitude.toFixed(6)}, ${payload.longitude.toFixed(6)}`
        : 'Not provided'
    }`,
    `LANDMARK / LOCATION: ${payload.location_name || 'Not provided'}`,
    `VALID UNTIL (TTL): ${payload.valid_until}`,
    `EXPORT TIMESTAMP: ${new Date().toISOString()}`,
    '====================================',
    'NOTE: This emergency report is held in temporary browser memory only. Keep this text safely.',
  ];
  return lines.join('\n');
}
