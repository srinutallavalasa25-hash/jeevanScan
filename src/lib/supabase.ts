// ==============================================================================
// JEEVASCAN AI — SUPABASE CLIENT & RESILIENT BACKEND ADAPTER
// Security:
// 1. Never uses or references the service-role key on the client.
// 2. Uses 'jeevascan_' table prefix to guarantee zero conflict with existing schemas.
// 3. Omits .select() on anonymous SOS submissions to respect RLS and prevent data leaks.
// 4. Requires update_token_hash for anonymous location updates (fails closed otherwise).
// 5. Transparently operates in Demo / Mock Mode when Supabase credentials are unset.
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hashBearerToken, isSha256Hex } from './crypto/tokenHash';
import type { 
  IncidentRecord, 
  UserRole, 
  ReliefRequestRecord, 
  ShelterRecord, 
  AuditLogRecord,
  LocationUpdateRecord
} from '../types/database';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// Check if valid credentials exist
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

// Real client (null if credentials unconfigured)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// ==============================================================================
// IN-MEMORY / LOCAL STORAGE DEMO BACKEND STORE
// Used when Supabase credentials are not provided, ensuring seamless demo testing
// ==============================================================================

const DEMO_INCIDENTS_KEY = 'jeevascan_demo_incidents';
const DEMO_RELIEF_KEY = 'jeevascan_demo_relief_requests';
const DEMO_AUDIT_KEY = 'jeevascan_demo_audit_logs';
const DEMO_LOCATION_KEY = 'jeevascan_demo_location_updates';

function getDemoStore<T>(key: string, defaultVal: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setDemoStore<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage quota or access error in demo mode:', err);
  }
}

// Initial demo shelters (clearly labeled demonstration data)
export const DEMO_SHELTERS: ShelterRecord[] = [
  {
    id: 'shelter-demo-01',
    name: 'District Community Hall (Elevated Dry Zone)',
    type: 'shelter',
    latitude: 17.3850,
    longitude: 78.4867,
    capacity: 250,
    current_occupancy: 84,
    contact_number: '+91 40 2345 6789',
    is_verified: true,
    is_demo_data: true,
  },
  {
    id: 'shelter-demo-02',
    name: 'Government High School Relief Camp',
    type: 'relief_camp',
    latitude: 17.3920,
    longitude: 78.4720,
    capacity: 400,
    current_occupancy: 210,
    contact_number: '+91 40 2345 6790',
    is_verified: true,
    is_demo_data: true,
  },
  {
    id: 'hospital-demo-01',
    name: 'District Area Trauma Center',
    type: 'hospital',
    latitude: 17.3750,
    longitude: 78.4910,
    capacity: 80,
    current_occupancy: 62,
    contact_number: '+91 40 2345 6791',
    is_verified: true,
    is_demo_data: true,
  },
];

// ==============================================================================
// BACKEND SERVICE INTERFACE
// ==============================================================================

export interface BackendService {
  isConfigured: boolean;
  getAuthRole: () => Promise<UserRole>;
  submitSOS: (incident: Omit<IncidentRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<{
    success: boolean;
    incidentId: string;
    isDuplicate: boolean;
    message: string;
  }>;
  submitLocationUpdate: (update: Omit<LocationUpdateRecord, 'id' | 'reported_at'>) => Promise<{
    success: boolean;
    message: string;
  }>;
  fetchLocationUpdates: (sos_id: string, token?: string | null) => Promise<LocationUpdateRecord[]>;
  fetchIncidents: () => Promise<IncidentRecord[]>;
  updateIncidentStatus: (
    sos_id: string, 
    status: IncidentRecord['status'], 
    notes?: string
  ) => Promise<{ success: boolean; message: string }>;
  fetchShelters: () => Promise<ShelterRecord[]>;
  submitReliefRequest: (req: Omit<ReliefRequestRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  fetchReliefRequests: () => Promise<ReliefRequestRecord[]>;
  fetchAuditLogs: () => Promise<AuditLogRecord[]>;
}

export const backend: BackendService = {
  isConfigured: isSupabaseConfigured,

  // Get current operator role
  async getAuthRole(): Promise<UserRole> {
    if (!isSupabaseConfigured || !supabase) {
      // In demo mode, read from localStorage or default to operator for testing
      return (localStorage.getItem('jeevascan_demo_role') as UserRole) || 'operator';
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'citizen';

      const { data, error } = await supabase
        .from('jeevascan_user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error || !data) return 'citizen';
      return data.role as UserRole;
    } catch {
      return 'citizen';
    }
  },

  // Idempotent SOS submission
  async submitSOS(incidentInput) {
    const sos_id = incidentInput.sos_id;

    // 1. Enforce payload validity & required fields
    if (!incidentInput.emergency_type || !incidentInput.description?.trim()) {
      return { success: false, incidentId: sos_id, isDuplicate: false, message: 'Missing required emergency category or description' };
    }

    // 2. Validate coordinate ranges if provided
    if (incidentInput.latitude !== undefined && incidentInput.latitude !== null) {
      if (typeof incidentInput.latitude !== 'number' || isNaN(incidentInput.latitude) || incidentInput.latitude < -90 || incidentInput.latitude > 90) {
        return { success: false, incidentId: sos_id, isDuplicate: false, message: 'Invalid latitude coordinate: must be between -90 and 90' };
      }
    }
    if (incidentInput.longitude !== undefined && incidentInput.longitude !== null) {
      if (typeof incidentInput.longitude !== 'number' || isNaN(incidentInput.longitude) || incidentInput.longitude < -180 || incidentInput.longitude > 180) {
        return { success: false, incidentId: sos_id, isDuplicate: false, message: 'Invalid longitude coordinate: must be between -180 and 180' };
      }
    }

    // 3. Enforce TTL: reject already expired messages
    if (new Date(incidentInput.valid_until) <= new Date()) {
      return { success: false, incidentId: sos_id, isDuplicate: false, message: 'SOS payload is expired' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // Security Fix: Do NOT use .select() for anonymous submissions.
        // The client already holds the client-generated sos_id.
        const { error } = await supabase
          .from('jeevascan_incidents')
          .insert([incidentInput]);

        if (error) {
          // Check for unique constraint violation (duplicate upload prevention)
          if (error.code === '23505') {
            return { success: true, incidentId: sos_id, isDuplicate: true, message: 'Incident already acknowledged on server' };
          }
          throw error;
        }

        return { success: true, incidentId: sos_id, isDuplicate: false, message: 'SOS successfully registered on live Supabase server' };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown network failure';
        return { success: false, incidentId: sos_id, isDuplicate: false, message: errorMsg };
      }
    }

    // Demo Mode execution
    const incidents = getDemoStore<IncidentRecord>(DEMO_INCIDENTS_KEY, []);
    const existing = incidents.find((i) => i.sos_id === sos_id);

    if (existing) {
      return { success: true, incidentId: existing.id, isDuplicate: true, message: 'Demonstration backend: Duplicate detected, preserved existing incident' };
    }

    const newRecord: IncidentRecord = {
      ...incidentInput,
      id: `demo-${sos_id}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_demo_record: true,
    };

    setDemoStore(DEMO_INCIDENTS_KEY, [newRecord, ...incidents]);
    return { success: true, incidentId: newRecord.id, isDuplicate: false, message: 'Stored in demonstration persistent store (Supabase unconfigured)' };
  },

  // Secure Location Update Submission (Requires bearer token for anonymous updates)
  async submitLocationUpdate(updateInput) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('jeevascan_location_updates')
          .insert([updateInput]);

        if (error) throw error;
        return { success: true, message: 'Location update recorded on server' };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Location update rejected';
        return { success: false, message: errorMsg };
      }
    }

    // Demo mode location update with Phase 9.1 safety enforcements
    const incidents = getDemoStore<IncidentRecord>(DEMO_INCIDENTS_KEY, []);
    const incident = incidents.find((i) => i.sos_id === updateInput.sos_id || i.id === updateInput.sos_id);
    if (!incident) {
      return { success: false, message: 'Incident not found' };
    }

    // 1. Expiry Check
    if (new Date(incident.valid_until).getTime() <= Date.now()) {
      return { success: false, message: 'Incident has expired' };
    }

    // 2. Terminal Status Check
    if (incident.status === 'resolved' || incident.status === 'cancelled') {
      return { success: false, message: `Incident is ${incident.status}` };
    }

    // 3. Token Verification Check
    if (incident.update_token_hash && updateInput.update_token_hash) {
      const incomingRaw = updateInput.update_token_hash;
      const incomingHash = isSha256Hex(incomingRaw) ? incomingRaw : await hashBearerToken(incomingRaw);
      const matches =
        incident.update_token_hash === incomingHash ||
        incident.update_token_hash === incomingRaw;
      if (!matches) {
        return { success: false, message: 'Unauthorized: invalid update token' };
      }
    } else if (incident.update_token_hash && !updateInput.update_token_hash) {
      return { success: false, message: 'Unauthorized: token required' };
    }

    // 4. Accuracy Constraint Check
    if (
      typeof updateInput.accuracy_meters === 'number' &&
      (updateInput.accuracy_meters < 0 || updateInput.accuracy_meters > 500)
    ) {
      return { success: false, message: 'Accuracy exceeds maximum allowable threshold (500m)' };
    }

    // 5. Rate Limit (10s) and Quota (500) Check in Demo Store
    const updates = getDemoStore<LocationUpdateRecord>(DEMO_LOCATION_KEY, []);
    const incidentUpdates = updates
      .filter((u) => u.sos_id === updateInput.sos_id)
      .sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());

    if (incidentUpdates.length >= 500) {
      return { success: false, message: 'Update quota exceeded: Maximum 500 location updates allowed per incident' };
    }

    if (incidentUpdates.length > 0) {
      const lastUpdate = incidentUpdates[0];
      const timeSinceLast = Date.now() - new Date(lastUpdate.reported_at).getTime();
      if (timeSinceLast < 10000) {
        return { success: false, message: 'Rate limit exceeded: Location updates must be at least 10 seconds apart' };
      }
    }

    const hashedToken = updateInput.update_token_hash
      ? isSha256Hex(updateInput.update_token_hash)
        ? updateInput.update_token_hash
        : await hashBearerToken(updateInput.update_token_hash)
      : null;

    const newUpdate: LocationUpdateRecord = {
      ...updateInput,
      id: `loc-demo-${Date.now()}`,
      reported_at: new Date().toISOString(),
      update_token_hash: hashedToken,
    };
    setDemoStore(DEMO_LOCATION_KEY, [newUpdate, ...updates]);
    return { success: true, message: 'Location update recorded in demo store' };
  },

  // Fetch location updates for a specific incident (Scoped for citizen token or operator)
  async fetchLocationUpdates(sos_id: string, token?: string | null): Promise<LocationUpdateRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        // First try scoped RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'jeevascan_get_incident_location_history',
          {
            p_sos_id: sos_id,
            p_token: token || null,
          }
        );

        if (!rpcError && Array.isArray(rpcData)) {
          return rpcData as LocationUpdateRecord[];
        }

        // Fallback to direct query for operators
        const { data, error } = await supabase
          .from('jeevascan_location_updates')
          .select('id, sos_id, latitude, longitude, accuracy_meters, reported_at')
          .eq('sos_id', sos_id)
          .order('reported_at', { ascending: false });

        if (error) throw error;
        return (data || []) as LocationUpdateRecord[];
      } catch (err) {
        console.warn('Error fetching live location updates:', err);
        return [];
      }
    }

    // Demo store location updates (Omits internal update_token_hash from read payload)
    const updates = getDemoStore<LocationUpdateRecord>(DEMO_LOCATION_KEY, []);
    return updates
      .filter((u) => u.sos_id === sos_id)
      .map(({ update_token_hash: _omit, ...rest }) => rest as LocationUpdateRecord)
      .sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());
  },

  // Fetch incidents (Operators only in live mode)
  async fetchIncidents(): Promise<IncidentRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('jeevascan_incidents')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as IncidentRecord[];
      } catch (err) {
        console.error('Error fetching live incidents:', err);
        return [];
      }
    }

    return getDemoStore<IncidentRecord>(DEMO_INCIDENTS_KEY, []);
  },

  // Update incident status
  async updateIncidentStatus(sos_id, status, notes) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('jeevascan_incidents')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('sos_id', sos_id);

        if (error) throw error;

        // Note: The database trigger 'trg_jeevascan_incident_audit' automatically
        // records this change in 'jeevascan_audit_logs' securely.
        if (notes) {
          await supabase.from('jeevascan_audit_logs').insert([{
            action: `OPERATOR_NOTE`,
            target_entity: 'jeevascan_incidents',
            target_id: sos_id,
            details: { notes, status, timestamp: new Date().toISOString() }
          }]);
        }

        return { success: true, message: `Status updated to ${status}` };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Update failed';
        return { success: false, message: errorMsg };
      }
    }

    // Demo Mode update
    const incidents = getDemoStore<IncidentRecord>(DEMO_INCIDENTS_KEY, []);
    const index = incidents.findIndex((i) => i.sos_id === sos_id);

    if (index >= 0) {
      incidents[index].status = status;
      incidents[index].updated_at = new Date().toISOString();
      setDemoStore(DEMO_INCIDENTS_KEY, incidents);

      // Audit log in demo mode
      const audits = getDemoStore<AuditLogRecord>(DEMO_AUDIT_KEY, []);
      audits.unshift({
        id: `audit-${Date.now()}`,
        operator_id: 'demo-operator-1',
        action: `STATUS_UPDATE_${status.toUpperCase()}`,
        target_entity: 'jeevascan_incidents',
        target_id: sos_id,
        details: { notes, is_demo: true },
        created_at: new Date().toISOString(),
      });
      setDemoStore(DEMO_AUDIT_KEY, audits);

      return { success: true, message: `Demo store: Status updated to ${status}` };
    }

    return { success: false, message: 'Incident not found' };
  },

  // Shelters
  async fetchShelters(): Promise<ShelterRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('jeevascan_shelters_and_hospitals')
          .select('*')
          .order('name');
        if (error) throw error;
        return (data || []) as ShelterRecord[];
      } catch {
        return DEMO_SHELTERS;
      }
    }
    return DEMO_SHELTERS;
  },

  // Relief requests (Enforce 'pending' initial status)
  async submitReliefRequest(reqInput) {
    const payload = {
      ...reqInput,
      status: 'pending' as const, // Strict enforcement: clients cannot submit pre-approved requests
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('jeevascan_relief_requests').insert([payload]);
        return !error;
      } catch {
        return false;
      }
    }

    const requests = getDemoStore<ReliefRequestRecord>(DEMO_RELIEF_KEY, []);
    const newReq: ReliefRequestRecord = {
      ...payload,
      id: `relief-demo-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_demo_record: true,
    };
    setDemoStore(DEMO_RELIEF_KEY, [newReq, ...requests]);
    return true;
  },

  async fetchReliefRequests(): Promise<ReliefRequestRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('jeevascan_relief_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as ReliefRequestRecord[];
      } catch {
        return [];
      }
    }
    return getDemoStore<ReliefRequestRecord>(DEMO_RELIEF_KEY, []);
  },

  async fetchAuditLogs(): Promise<AuditLogRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('jeevascan_audit_logs')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as AuditLogRecord[];
      } catch {
        return [];
      }
    }
    return getDemoStore<AuditLogRecord>(DEMO_AUDIT_KEY, []);
  },
};
