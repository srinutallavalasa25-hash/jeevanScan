import type { CreateIncidentPayload, IncidentRecord } from '../../types/database';
import type { LocalCommitResult } from './localQueueTypes';

const DEMO_INCIDENTS_KEY = 'jeevascan_demo_incidents';

function getDemoIncidentsFromStorage(): IncidentRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(DEMO_INCIDENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to read demo incidents from localStorage:', err);
    return [];
  }
}

function saveDemoIncidentsToStorage(incidents: IncidentRecord[]): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(DEMO_INCIDENTS_KEY, JSON.stringify(incidents));
    return true;
  } catch (err) {
    console.error('Failed to write demo incidents to localStorage:', err);
    return false;
  }
}

/**
 * Dedicated local-only demo store commit operation.
 * Guaranteed to NEVER execute network requests or contact Supabase,
 * regardless of environment variables or configuration.
 */
export async function commitToLocalDemoStore(
  incidentInput: CreateIncidentPayload
): Promise<LocalCommitResult> {
  const sos_id = incidentInput.sos_id;

  // 1. Enforce payload validity & required fields
  if (!incidentInput.emergency_type || !incidentInput.description?.trim()) {
    return {
      success: false,
      incidentId: sos_id,
      isDuplicate: false,
      message: 'Missing required emergency category or description',
      is_demo: true,
    };
  }

  // 2. Validate coordinate ranges if provided
  if (incidentInput.latitude !== undefined && incidentInput.latitude !== null) {
    if (
      typeof incidentInput.latitude !== 'number' ||
      isNaN(incidentInput.latitude) ||
      incidentInput.latitude < -90 ||
      incidentInput.latitude > 90
    ) {
      return {
        success: false,
        incidentId: sos_id,
        isDuplicate: false,
        message: 'Invalid latitude coordinate: must be between -90 and 90',
        is_demo: true,
      };
    }
  }

  if (incidentInput.longitude !== undefined && incidentInput.longitude !== null) {
    if (
      typeof incidentInput.longitude !== 'number' ||
      isNaN(incidentInput.longitude) ||
      incidentInput.longitude < -180 ||
      incidentInput.longitude > 180
    ) {
      return {
        success: false,
        incidentId: sos_id,
        isDuplicate: false,
        message: 'Invalid longitude coordinate: must be between -180 and 180',
        is_demo: true,
      };
    }
  }

  // 3. Pre-attempt TTL check
  if (new Date(incidentInput.valid_until).getTime() <= Date.now()) {
    return {
      success: false,
      incidentId: sos_id,
      isDuplicate: false,
      message: 'SOS payload is expired (valid_until passed)',
      is_demo: true,
    };
  }

  // 4. Duplicate check against existing demo incidents
  const existingIncidents = getDemoIncidentsFromStorage();
  const existing = existingIncidents.find((i) => i.sos_id === sos_id);

  if (existing) {
    return {
      success: true,
      incidentId: existing.id,
      isDuplicate: true,
      message: 'Local demo duplicate detected; preserved existing incident record',
      is_demo: true,
    };
  }

  // 5. Commit fresh demo record
  const newRecord: IncidentRecord = {
    ...incidentInput,
    id: `demo-${sos_id}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_demo_record: true,
  };

  const saved = saveDemoIncidentsToStorage([newRecord, ...existingIncidents]);
  if (!saved) {
    return {
      success: false,
      incidentId: sos_id,
      isDuplicate: false,
      message: 'Failed to write to local storage quota/permission error',
      is_demo: true,
    };
  }

  return {
    success: true,
    incidentId: newRecord.id,
    isDuplicate: false,
    message: 'Recorded into local demo incident store (Strictly Local)',
    is_demo: true,
  };
}

/**
 * Reads all demo incidents strictly from local storage.
 */
export function getLocalDemoIncidents(): IncidentRecord[] {
  return getDemoIncidentsFromStorage();
}
