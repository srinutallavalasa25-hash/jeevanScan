/**
 * JEEVASCAN AI — DETERMINISTIC BROWSER RELAY SIMULATION PROTOCOL
 * Tagline: Find Faster. Rescue Smarter.
 *
 * MISSION SPECIFICATIONS:
 * 1. Maximum 3 hops strictly enforced (Hop 0 -> 1 -> 2 -> 3).
 * 2. 24-hour TTL validity period from origin creation.
 * 3. Duplicate packet suppression cache.
 * 4. Integrity hash check (SHA-256 integrity verification; NOT digital signatures or authentication).
 * 5. Deterministic 4-node topology:
 *      Node A (Offline Citizen, hop 0)
 *      Node B (Relay Bystander, hop 1)
 *      Node C (RakshaFly AI UAV Drone, hop 2)
 *      Node D (Base Station Gateway, hop 3 - Online)
 * 6. Gateway Ingress commits directly to browser-local demo store with ACK generation.
 * 7. Zero remote API calls, zero Supabase writes, zero background radio claims.
 */

import type { RelayNode, RelayPacket, RelayHopEvent, RelayAckRecord, BrowserHandoffPayload } from './relayTypes';
import { commitToLocalDemoStore } from '../offline/localDemoStore';
import { saveRelayAck, getRelayAckBySosId } from './relayAckStorage';
import type { CreateIncidentPayload } from '../../types/database';

export const MAX_RELAY_HOPS = 3;
export const TTL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours

/**
 * Standard 4-node deterministic topology modeling citizen-to-gateway path.
 */
export const DEFAULT_RELAY_NODES: RelayNode[] = [
  {
    id: 'node-a-citizen',
    name: 'Citizen Device (Originator)',
    nameTe: 'పౌరుడి పరికరం (మూలం)',
    role: 'citizen',
    isOnline: false,
    hopIndex: 0,
    locationName: 'Flooded Residential Area, Sector 4',
    coordinates: { lat: 17.3850, lng: 78.4867 },
    description: 'Disconnected citizen smartphone in blackout disaster zone with zero cellular coverage.',
    descriptionTe: 'సెల్లులర్ నెట్‌వర్క్ లేని బ్లాక్‌అవుట్ విపత్తు జోన్‌లో ఆఫ్‌లైన్ పౌరుడి స్మార్ట్‌ఫోన్.',
  },
  {
    id: 'node-b-bystander',
    name: 'Bystander Smartphone (Local Relay)',
    nameTe: 'సహాయకుడి స్మార్ట్‌ఫోన్ (స్థానిక రిలే)',
    role: 'bystander',
    isOnline: false,
    hopIndex: 1,
    locationName: 'Community Relief Shelter Periphery',
    coordinates: { lat: 17.3910, lng: 78.4920 },
    description: 'Bystander device executing store-and-forward hopping within peer perimeter.',
    descriptionTe: 'సమీప పరిధిలో సమాచారాన్ని నిల్వ చేసి ముందుకు పంపే సహాయకుడి పరికరం.',
  },
  {
    id: 'node-c-uav-drone',
    name: 'RakshaFly AI UAV Drone Relay',
    nameTe: 'రక్షాఫ్లై AI UAV డ్రోన్ రిలే',
    role: 'uav_drone',
    isOnline: false,
    hopIndex: 2,
    locationName: 'Airborne Sector 4 Patrol (Altitude 120m)',
    coordinates: { lat: 17.4020, lng: 78.5050 },
    description: 'Autonomous airborne relay drone collecting packets over disaster perimeter.',
    descriptionTe: 'విపత్తు జోన్ మీదుగా సమాచారాన్ని సేకరించే స్వయంప్రతిపత్తి గల గగనతల రిలే డ్రోన్.',
  },
  {
    id: 'node-d-gateway',
    name: 'Emergency Ops Base Station (Gateway)',
    nameTe: 'ఎమర్జెన్సీ ఆప్స్ బేస్ స్టేషన్ (గేట్‌వే)',
    role: 'gateway',
    isOnline: true,
    hopIndex: 3,
    locationName: 'District Disaster Management Command Center',
    coordinates: { lat: 17.4200, lng: 78.5200 },
    description: 'Connected operations gateway with fiber satellite uplink to incident response teams.',
    descriptionTe: 'రెస్క్యూ బృందాలకు కనెక్ట్ చేయబడిన ఆపరేషన్స్ గేట్‌వే మరియు బేస్ స్టేషన్.',
  },
];

/**
 * Calculates a SHA-256 integrity hash across immutable fields of the packet.
 * NOTE: This is an integrity check to detect transmission corruption,
 * NOT a cryptographic digital signature or proof of identity.
 */
export async function calculateIntegrityHash(fields: {
  sos_id: string;
  emergency_type: string;
  description: string;
  created_at: string;
  valid_until: string;
  origin_device_id: string;
}): Promise<string> {
  const payloadString = `${fields.sos_id}|${fields.emergency_type}|${fields.description}|${fields.created_at}|${fields.valid_until}|${fields.origin_device_id}`;
  
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const msgBuffer = new TextEncoder().encode(payloadString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Deterministic FNV-1a 64-bit hex hash fallback for restricted contexts
  let h1 = 0x811c9dc5;
  for (let i = 0; i < payloadString.length; i++) {
    h1 ^= payloadString.charCodeAt(i);
    h1 = (h1 * 0x01000193) >>> 0;
  }
  return `int_${h1.toString(16).padStart(8, '0')}${Date.now().toString(16).slice(-8)}`;
}

/**
 * Verifies that the packet contents have not been modified since creation.
 */
export async function verifyPacketIntegrity(packet: RelayPacket): Promise<boolean> {
  const computedHash = await calculateIntegrityHash({
    sos_id: packet.sos_id,
    emergency_type: packet.emergency_type,
    description: packet.description,
    created_at: packet.created_at,
    valid_until: packet.valid_until,
    origin_device_id: packet.origin_device_id,
  });
  return computedHash === packet.integrity_hash;
}

/**
 * Creates an initial origin packet at Node A (Citizen Device, Hop 0).
 */
export async function createOriginRelayPacket(params: {
  emergency_type: RelayPacket['emergency_type'];
  description: string;
  priority: RelayPacket['priority'];
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  accuracy_meters?: number | null;
  ttlDurationMs?: number;
}): Promise<RelayPacket> {
  const sos_id = crypto.randomUUID();
  const origin_device_id = `dev_${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date();
  const created_at = now.toISOString();
  const valid_until = new Date(now.getTime() + (params.ttlDurationMs ?? TTL_DURATION_MS)).toISOString();

  const integrity_hash = await calculateIntegrityHash({
    sos_id,
    emergency_type: params.emergency_type,
    description: params.description,
    created_at,
    valid_until,
    origin_device_id,
  });

  return {
    sos_id,
    payload_version: 1,
    emergency_type: params.emergency_type,
    description: params.description,
    priority: params.priority,
    latitude: params.latitude ?? 17.3850,
    longitude: params.longitude ?? 78.4867,
    accuracy_meters: params.accuracy_meters ?? 15,
    location_name: params.location_name ?? 'Flooded Residential Area, Sector 4',
    origin_device_id,
    created_at,
    valid_until,
    hop_count: 0,
    hop_history: [],
    integrity_hash,
    status: 'ORIGINATED',
  };
}

export interface HopValidationResult {
  allowed: boolean;
  reason?: string;
  status: RelayPacket['status'];
}

/**
 * Validates whether a packet can be forwarded to the next hop.
 * Enforces:
 *   - Maximum 3 hops limit
 *   - 24-hour expiration TTL
 *   - Packet integrity verification
 */
export async function validateForwardingStep(
  packet: RelayPacket, 
  targetNode: RelayNode
): Promise<HopValidationResult> {
  // 1. Check TTL expiry
  const now = Date.now();
  const expiryTime = new Date(packet.valid_until).getTime();
  if (now > expiryTime) {
    return {
      allowed: false,
      reason: 'Packet expired: 24-hour Time-to-Live (TTL) threshold exceeded.',
      status: 'REJECTED_EXPIRED',
    };
  }

  // 2. Check hop count limit
  // A packet already at hop_count >= 3 cannot be forwarded further.
  if (packet.hop_count >= MAX_RELAY_HOPS) {
    return {
      allowed: false,
      reason: `Exceeded maximum allowable hop count (${MAX_RELAY_HOPS}). Packet dropped by mesh boundary filter.`,
      status: 'REJECTED_HOP_LIMIT',
    };
  }

  // 3. Verify integrity hash
  const isIntact = await verifyPacketIntegrity(packet);
  if (!isIntact) {
    return {
      allowed: false,
      reason: 'Integrity check failed: Packet contents do not match origin integrity hash.',
      status: 'REJECTED_INTEGRITY_FAIL',
    };
  }

  // Target node must be the expected next step
  if (targetNode.hopIndex !== packet.hop_count + 1) {
    return {
      allowed: false,
      reason: `Out-of-sequence hop: target node index ${targetNode.hopIndex} does not follow current hop count ${packet.hop_count}.`,
      status: 'REJECTED_HOP_LIMIT',
    };
  }

  return {
    allowed: true,
    status: targetNode.role === 'gateway' ? 'INGRESSED' : 'IN_TRANSIT',
  };
}

/**
 * Deterministically forwards the packet to the next node in the topology.
 */
export async function forwardRelayPacket(
  packet: RelayPacket,
  fromNode: RelayNode,
  toNode: RelayNode,
  seenPacketIds: Set<string>
): Promise<{
  updatedPacket: RelayPacket;
  ackRecord: RelayAckRecord | null;
  error?: string;
}> {
  // Check for duplicate suppression
  const duplicateKey = `${packet.sos_id}_hop${toNode.hopIndex}`;
  if (seenPacketIds.has(duplicateKey)) {
    return {
      updatedPacket: {
        ...packet,
        status: 'REJECTED_DUPLICATE',
        rejection_reason: 'Duplicate packet transmission detected and dropped by receiver suppression filter.',
      },
      ackRecord: null,
      error: 'Duplicate packet suppressed by relay node.',
    };
  }

  const validation = await validateForwardingStep(packet, toNode);
  if (!validation.allowed) {
    return {
      updatedPacket: {
        ...packet,
        status: validation.status,
        rejection_reason: validation.reason,
      },
      ackRecord: null,
      error: validation.reason,
    };
  }

  // Record hop event
  const newHopNumber = packet.hop_count + 1;
  const carrierType: RelayHopEvent['carrierType'] = 
    toNode.role === 'gateway' ? 'GATEWAY_FIBER_DEMO' :
    toNode.role === 'uav_drone' ? 'UAV_LORA_DEMO' : 'BLE_DEMO';

  const hopEvent: RelayHopEvent = {
    hopNumber: newHopNumber,
    fromNodeId: fromNode.id,
    fromNodeName: fromNode.name,
    toNodeId: toNode.id,
    toNodeName: toNode.name,
    timestamp: new Date().toISOString(),
    rssiSignalDbm: -55 - Math.floor(Math.random() * 25), // -55 to -80 dBm
    carrierType,
  };

  const updatedPacket: RelayPacket = {
    ...packet,
    hop_count: newHopNumber,
    hop_history: [...packet.hop_history, hopEvent],
    status: validation.status,
  };

  seenPacketIds.add(duplicateKey);

  // If arrived at Gateway, perform local demo store ingress and generate ACK
  let ackRecord: RelayAckRecord | null = null;
  if (toNode.role === 'gateway' && validation.status === 'INGRESSED') {
    const ingressResult = await ingressPacketToGateway(updatedPacket, toNode);
    if (!ingressResult.success) {
      return {
        updatedPacket: {
          ...updatedPacket,
          status: 'REJECTED_INGRESS_FAIL',
          rejection_reason: `Gateway ingress commit failed: ${ingressResult.error || 'Unknown storage error'}`,
        },
        ackRecord: null,
        error: `Gateway ingress failed: ${ingressResult.error || 'Local commit rejected'}`,
      };
    }
    ackRecord = ingressResult.ackRecord;
  }

  return { updatedPacket, ackRecord };
}

export interface GatewayIngressResult {
  success: boolean;
  ackRecord: RelayAckRecord | null;
  isDuplicate: boolean;
  error?: string;
}

/**
 * Commits the successfully arrived packet to the browser-local demo store,
 * making it visible in the Citizen Tracker and Operator Dashboard.
 * Generates an ACK record ONLY if local store commit succeeds.
 * Persists the ACK to durable storage.
 */
export async function ingressPacketToGateway(
  packet: RelayPacket,
  gatewayNode: RelayNode
): Promise<GatewayIngressResult> {
  const tracking_code = `JS-${packet.sos_id.slice(0, 4).toUpperCase()}`;

  // 1. Validate payload fields & structure
  if (!packet.sos_id || typeof packet.sos_id !== 'string' || !packet.sos_id.trim()) {
    return {
      success: false,
      ackRecord: null,
      isDuplicate: false,
      error: 'Missing or invalid packet sos_id',
    };
  }

  const rawDesc = packet.description?.trim();
  if (!rawDesc || !packet.emergency_type) {
    return {
      success: false,
      ackRecord: null,
      isDuplicate: false,
      error: 'Missing required incident description or emergency category in packet',
    };
  }

  // 2. Enforce TTL pre-check: expired packets must never ingress
  if (new Date(packet.valid_until).getTime() <= Date.now()) {
    return {
      success: false,
      ackRecord: null,
      isDuplicate: false,
      error: 'Packet valid_until has expired; rejected at gateway ingress',
    };
  }

  // 3. Construct incident payload for browser-local store
  const localPayload: CreateIncidentPayload = {
    sos_id: packet.sos_id,
    payload_version: packet.payload_version,
    emergency_type: packet.emergency_type,
    description: `[RELAY INGRESS via ${packet.hop_count} Hops] ${rawDesc}`,
    status: 'pending',
    priority: packet.priority,
    latitude: packet.latitude,
    longitude: packet.longitude,
    accuracy_meters: packet.accuracy_meters,
    location_name: packet.location_name,
    hop_count: packet.hop_count,
    device_fingerprint_hash: packet.origin_device_id,
    update_token_hash: `tok_${crypto.randomUUID().replace(/-/g, '')}`,
    valid_until: packet.valid_until,
  };

  // 4. Commit locally first (no external API calls, strictly local demo storage)
  const commitResult = await commitToLocalDemoStore(localPayload);

  // 5. Enforce: if commit fails, do NOT generate success ACK. Return explicit failure.
  if (!commitResult.success) {
    return {
      success: false,
      ackRecord: null,
      isDuplicate: false,
      error: commitResult.message || 'Local demo store commit rejected',
    };
  }

  // 6. Check if an ACK already exists in durable storage for this confirmed sos_id (Deduplication)
  const existingAck = await getRelayAckBySosId(packet.sos_id);
  if (existingAck) {
    return {
      success: true,
      ackRecord: { ...existingAck, is_duplicate: true },
      isDuplicate: true,
    };
  }

  // 7. Generate fresh ACK record
  const rawAck: RelayAckRecord = {
    ack_id: `ack_${crypto.randomUUID().slice(0, 8)}`,
    sos_id: packet.sos_id,
    gateway_node_id: gatewayNode.id,
    ingressed_at: new Date().toISOString(),
    total_hops: packet.hop_count,
    integrity_verified: true,
    committed_local_id: commitResult.incidentId || packet.sos_id,
    tracking_code,
    is_duplicate: commitResult.isDuplicate,
  };

  // 8. Persist to durable storage (IndexedDB -> localStorage -> Memory)
  const savedAck = await saveRelayAck(rawAck);

  return {
    success: true,
    ackRecord: savedAck,
    isDuplicate: commitResult.isDuplicate,
  };
}

/**
 * Formats a packet into a compact browser handoff payload
 * suitable for manual QR code or clipboard sharing between demo devices.
 */
export function formatHandoffPayload(packet: RelayPacket): BrowserHandoffPayload {
  return {
    format: 'JEEVASCAN_RELAY_V1',
    sos_id: packet.sos_id,
    emergency_type: packet.emergency_type,
    description: packet.description,
    priority: packet.priority,
    location_name: packet.location_name,
    latitude: packet.latitude,
    longitude: packet.longitude,
    hop_count: packet.hop_count,
    valid_until: packet.valid_until,
    integrity_hash: packet.integrity_hash,
    origin_device_id: packet.origin_device_id,
    created_at: packet.created_at,
  };
}

/**
 * Decodes and validates a raw handoff string (JSON or base64).
 */
export async function decodeHandoffPayload(rawInput: string): Promise<{
  valid: boolean;
  packet?: RelayPacket;
  error?: string;
}> {
  try {
    let jsonString = rawInput.trim();
    if (jsonString.startsWith('ey')) {
      // Base64 decode attempt
      try {
        jsonString = atob(jsonString);
      } catch {
        // use raw
      }
    }

    const parsed = JSON.parse(jsonString) as BrowserHandoffPayload;
    if (parsed.format !== 'JEEVASCAN_RELAY_V1' || !parsed.sos_id || !parsed.integrity_hash) {
      return { valid: false, error: 'Invalid JeevaScan handoff payload schema.' };
    }

    const reconstructed: RelayPacket = {
      sos_id: parsed.sos_id,
      payload_version: 1,
      emergency_type: parsed.emergency_type,
      description: parsed.description,
      priority: parsed.priority,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      accuracy_meters: 10,
      location_name: parsed.location_name,
      origin_device_id: parsed.origin_device_id,
      created_at: parsed.created_at,
      valid_until: parsed.valid_until,
      hop_count: parsed.hop_count,
      hop_history: [],
      integrity_hash: parsed.integrity_hash,
      status: 'IN_TRANSIT',
    };

    const isIntact = await verifyPacketIntegrity(reconstructed);
    if (!isIntact) {
      return { valid: false, error: 'Integrity check failed: payload data corrupted or tampered.' };
    }

    return { valid: true, packet: reconstructed };
  } catch (e) {
    return { valid: false, error: `Failed to parse handoff payload: ${(e as Error).message}` };
  }
}
