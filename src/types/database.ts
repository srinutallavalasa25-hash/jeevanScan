// ==============================================================================
// JEEVASCAN AI — DATABASE & DOMAIN TYPES
// Safe, strongly typed models for incidents, roles, receipts, and relief requests
// ==============================================================================

export type UserRole = 'citizen' | 'operator' | 'coordinator' | 'admin';

export type EmergencyType =
  | 'flood'
  | 'trapped'
  | 'medical'
  | 'fire'
  | 'building_collapse'
  | 'missing_person'
  | 'food_water_shortage'
  | 'other';

export type IncidentStatus = 'pending' | 'acknowledged' | 'dispatched' | 'resolved' | 'cancelled';

export type IncidentPriority = 'critical' | 'high' | 'medium' | 'low';

export interface IncidentRecord {
  id: string;
  sos_id: string;
  payload_version: number;
  reporter_user_id?: string | null;
  emergency_type: EmergencyType;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  latitude?: number | null;
  longitude?: number | null;
  accuracy_meters?: number | null;
  location_name?: string | null;
  hop_count: number;
  device_fingerprint_hash?: string | null;
  update_token_hash?: string | null;
  encrypted_payload?: string | null;
  integrity_hash?: string | null;
  valid_until: string;
  created_at: string;
  updated_at: string;
  is_demo_record?: boolean;
}
 
export type CreateIncidentPayload = Omit<IncidentRecord, 'id' | 'created_at' | 'updated_at'>;
export interface LocationUpdateRecord {
  id: string;
  sos_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  update_token_hash?: string | null;
  reported_at: string;
}

export interface AcknowledgementReceipt {
  id: string;
  sos_id: string;
  operator_id: string;
  receipt_signature: string;
  operator_notes?: string | null;
  acknowledged_at: string;
}

export interface ReliefRequestRecord {
  id: string;
  sos_id?: string | null;
  requester_user_id?: string | null;
  item_type: 'drinking_water' | 'food' | 'first_aid' | 'blankets' | 'hygiene' | 'other';
  quantity: number;
  urgency: 'critical' | 'urgent' | 'standard';
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered';
  delivery_notes?: string | null;
  created_at: string;
  updated_at: string;
  is_demo_record?: boolean;
}

export interface ShelterRecord {
  id: string;
  name: string;
  type: 'shelter' | 'hospital' | 'relief_camp' | 'boat_dock';
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  contact_number?: string | null;
  is_verified: boolean;
  is_demo_data: boolean;
}

export interface CasualtyReviewRecord {
  id: string;
  incident_id?: string | null;
  image_url: string;
  model_confidence: number;
  review_status: 'pending_review' | 'verified_casualty' | 'false_positive';
  reviewer_id?: string | null;
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  is_simulated: boolean;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  operator_id?: string | null;
  action: string;
  target_entity: string;
  target_id: string;
  details?: Record<string, unknown> | null;
  created_at: string;
}
