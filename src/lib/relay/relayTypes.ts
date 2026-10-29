/**
 * JEEVASCAN AI — RELAY & MESH PROTOCOL TYPES
 * Tagline: Find Faster. Rescue Smarter.
 *
 * Defines data structures for the deterministic browser-local relay simulation.
 * Complies with Phase 7 specifications:
 *   - Maximum 3 hops
 *   - 24-hour TTL expiration
 *   - Duplicate suppression
 *   - Gateway ingress into local demo store
 *   - Integrity check verification (hash-based, not digital signature)
 *   - Honest browser sandboxing disclaimers
 */

import type { EmergencyType, IncidentPriority } from '../../types/database';

export type RelayNodeRole = 'citizen' | 'bystander' | 'uav_drone' | 'gateway';

export interface RelayNode {
  id: string;
  name: string;
  nameTe: string;
  role: RelayNodeRole;
  isOnline: boolean;
  hopIndex: number; // 0: Citizen, 1: Bystander, 2: UAV Drone, 3: Gateway
  locationName: string;
  coordinates: { lat: number; lng: number };
  description: string;
  descriptionTe: string;
}

export interface RelayHopEvent {
  hopNumber: number;
  fromNodeId: string;
  fromNodeName: string;
  toNodeId: string;
  toNodeName: string;
  timestamp: string;
  rssiSignalDbm: number; // Simulated signal strength (-45 to -90 dBm)
  carrierType: 'BLE_DEMO' | 'UAV_LORA_DEMO' | 'WIFI_DIRECT_DEMO' | 'GATEWAY_FIBER_DEMO';
}

export type RelayPacketStatus = 
  | 'ORIGINATED'
  | 'IN_TRANSIT'
  | 'INGRESSED'
  | 'REJECTED_HOP_LIMIT'
  | 'REJECTED_EXPIRED'
  | 'REJECTED_DUPLICATE'
  | 'REJECTED_INTEGRITY_FAIL'
  | 'REJECTED_INGRESS_FAIL';

export type RelayAckStorageTier = 'durable_idb' | 'durable_local_storage' | 'temporary_memory';

export interface RelayPacket {
  sos_id: string;
  payload_version: number;
  emergency_type: EmergencyType;
  description: string;
  priority: IncidentPriority;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  location_name: string | null;
  origin_device_id: string;
  created_at: string;
  valid_until: string; // 24-hour TTL
  hop_count: number; // 0, 1, 2, 3 (max 3)
  hop_history: RelayHopEvent[];
  integrity_hash: string; // SHA-256 integrity check (not digital signature)
  status: RelayPacketStatus;
  rejection_reason?: string;
}

export interface RelayAckRecord {
  ack_id: string;
  sos_id: string;
  gateway_node_id: string;
  ingressed_at: string;
  total_hops: number;
  integrity_verified: boolean;
  committed_local_id: string;
  tracking_code: string;
  is_duplicate?: boolean;
  storage_tier?: RelayAckStorageTier;
  is_temporary?: boolean;
}

export interface RelaySimulationState {
  nodes: RelayNode[];
  activePacket: RelayPacket | null;
  currentHopIndex: number;
  ackRecord: RelayAckRecord | null;
  seenPacketIds: string[];
  eventLog: string[];
  isSimulating: boolean;
}

export interface BrowserHandoffPayload {
  format: 'JEEVASCAN_RELAY_V1';
  sos_id: string;
  emergency_type: EmergencyType;
  description: string;
  priority: IncidentPriority;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  hop_count: number;
  valid_until: string;
  integrity_hash: string;
  origin_device_id: string;
  created_at: string;
}
