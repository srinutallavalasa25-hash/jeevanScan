// ==============================================================================
// JEEVASCAN AI — JEEVADROP RELIEF SUPPLY STORE & LIFECYCLE MANAGER
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Phase 12 — Relief supply request workflow, state transitions, and simulated fulfillment
// ==============================================================================

import type { IncidentPriority } from '../../types/database';
import type {
  JeevaDropRequest,
  JeevaDropStatus,
  ReliefItemCategory,
} from '../../types/phase12';
import { isValidCoordinate } from '../map/mapUtils';

export const JEEVADROP_STORAGE_KEY = 'jeevascan_demo_relief_drops';

export const SIMULATED_FULFILLMENT_NOTICE =
  'DEMO RELIEF SIMULATION: All supply requests and fulfillment stages are simulated software workflows for operator demonstration. No vehicles, drones, volunteers, or emergency medicines have been physically dispatched.';

export const MEDICINE_SAFETY_WARNING =
  'MEDICATION NOTICE: JeevaScan AI facilitates supply logistics coordination only. It does NOT provide medication dosing, clinical advice, or medical treatment plans. Always consult certified medical practitioners in life-threatening scenarios.';

export const RELIEF_ITEM_CATALOG: Record<
  ReliefItemCategory,
  { name: string; defaultUnit: string; maxPerRequest: number; description: string }
> = {
  potable_water: {
    name: 'Potable Drinking Water',
    defaultUnit: 'liters',
    maxPerRequest: 50,
    description: 'Clean drinking water bottles or foil packets for immediate hydration.',
  },
  survival_rations: {
    name: 'Ready-to-Eat Survival Rations',
    defaultUnit: 'packets',
    maxPerRequest: 30,
    description: 'High-calorie nutrient bars, roasted grains, and dry emergency rations.',
  },
  first_aid_kit: {
    name: 'Emergency Trauma First Aid Kit',
    defaultUnit: 'kits',
    maxPerRequest: 5,
    description: 'Bandages, antiseptic swabs, hemostatic dressing, and burn treatment supplies.',
  },
  essential_medicines: {
    name: 'Prescribed Life-Sustaining Medicines',
    defaultUnit: 'doses',
    maxPerRequest: 10,
    description: 'Emergency supply of pre-prescribed insulin, asthma inhalers, or ORS packets.',
  },
  thermal_blankets: {
    name: 'Thermal Blankets & Dry Sheets',
    defaultUnit: 'units',
    maxPerRequest: 15,
    description: 'Reflective foil mylar blankets to prevent hypothermia after water exposure.',
  },
  infant_supplies: {
    name: 'Infant Food & Hygiene Pack',
    defaultUnit: 'kits',
    maxPerRequest: 10,
    description: 'Baby formula, clean feeding bottles, and sterile infant diapers.',
  },
  hygiene_sanitation: {
    name: 'Water Purification & Sanitation Pack',
    defaultUnit: 'packets',
    maxPerRequest: 25,
    description: 'Chlorine purification tablets and sanitation disinfectant.',
  },
  other_supplies: {
    name: 'General Emergency Survival Supplies',
    defaultUnit: 'units',
    maxPerRequest: 20,
    description: 'Flashlights, whistle signals, and utility rope for flood extraction.',
  },
};

// Initial realistic demo relief requests for operator demonstration
export const INITIAL_DEMO_RELIEF_DROPS: JeevaDropRequest[] = [
  {
    id: 'req_drop_demo_01',
    requestCode: 'DROP-WTR-8491',
    sosId: 'SOS-HYD-001',
    itemCategory: 'potable_water',
    itemName: 'Potable Drinking Water',
    quantityRequested: 15,
    quantityUnit: 'liters',
    deliveryLocation: {
      latitude: 17.385,
      longitude: 78.4867,
      locationName: 'Moosarambagh Bridge, House #4-21',
      floorLevel: 'Terrace (Rooftop)',
      landmark: 'Near Water Tank',
    },
    urgency: 'critical',
    priority: 'critical',
    justification: 'Ground floor submerged by floodwaters. 4 residents trapped on roof without clean drinking water for 14 hours.',
    status: 'under_review',
    isHumanVerified: false,
    is_simulation: true,
    no_real_delivery_claim: true,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
  },
  {
    id: 'req_drop_demo_02',
    requestCode: 'DROP-MED-3920',
    sosId: 'SOS-HYD-002',
    itemCategory: 'essential_medicines',
    itemName: 'Prescribed Life-Sustaining Medicines',
    quantityRequested: 3,
    quantityUnit: 'doses',
    deliveryLocation: {
      latitude: 17.392,
      longitude: 78.472,
      locationName: 'Chaderghat Market Area',
      floorLevel: 'First Floor',
      landmark: 'Above Pharmacy Gate',
    },
    urgency: 'critical',
    priority: 'critical',
    justification: 'Insulin required for diabetic patient. Flood currents prevent pedestrian access to medical store.',
    status: 'approved',
    isHumanVerified: true,
    verifiedByOperatorId: 'OP-UNIT-7',
    operatorNotes: 'Approved for simulated drone delivery corridor B.',
    is_simulation: true,
    no_real_delivery_claim: true,
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'req_drop_demo_03',
    requestCode: 'DROP-RAT-1104',
    sosId: null,
    itemCategory: 'survival_rations',
    itemName: 'Ready-to-Eat Survival Rations',
    quantityRequested: 10,
    quantityUnit: 'packets',
    deliveryLocation: {
      latitude: 17.375,
      longitude: 78.495,
      locationName: 'Dilsukhnagar Colony Ward 8',
      floorLevel: 'Community Hall Steps',
      landmark: 'Old Municipal Office',
    },
    urgency: 'urgent',
    priority: 'high',
    justification: 'Local power cuts and gas shutdown. Family of 5 needs dry rations until water recedes.',
    status: 'submitted',
    isHumanVerified: false,
    is_simulation: true,
    no_real_delivery_claim: true,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
];

function getStoredRequests(): JeevaDropRequest[] {
  try {
    const raw = localStorage.getItem(JEEVADROP_STORAGE_KEY);
    if (!raw) {
      persistRequests(INITIAL_DEMO_RELIEF_DROPS);
      return INITIAL_DEMO_RELIEF_DROPS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_RELIEF_DROPS;
  }
}

function persistRequests(requests: JeevaDropRequest[]): void {
  try {
    localStorage.setItem(JEEVADROP_STORAGE_KEY, JSON.stringify(requests));
  } catch (err) {
    console.warn('LocalStorage error saving JeevaDrop requests:', err);
  }
}

/**
 * Creates and registers a new JeevaDrop relief supply request.
 */
export function createJeevaDropRequest(params: {
  sosId?: string | null;
  itemCategory: ReliefItemCategory;
  quantity: number;
  deliveryLocation: {
    latitude?: number | null;
    longitude?: number | null;
    locationName?: string | null;
    floorLevel?: string | null;
    landmark?: string | null;
  };
  urgency: 'critical' | 'urgent' | 'standard';
  priority?: IncidentPriority;
  justification: string;
  startAsDraft?: boolean;
}): JeevaDropRequest {
  const spec = RELIEF_ITEM_CATALOG[params.itemCategory] || RELIEF_ITEM_CATALOG.other_supplies;

  // Validation
  if (params.quantity <= 0 || !Number.isInteger(params.quantity)) {
    throw new Error('Requested quantity must be a positive whole integer');
  }
  if (params.quantity > spec.maxPerRequest) {
    throw new Error(`Quantity exceeds maximum allowable limit of ${spec.maxPerRequest} ${spec.defaultUnit} per request`);
  }
  if (!params.justification?.trim()) {
    throw new Error('Justification / situation details are required for supply allocation');
  }

  // Location validation if coordinates provided
  if (params.deliveryLocation.latitude != null || params.deliveryLocation.longitude != null) {
    if (!isValidCoordinate(params.deliveryLocation.latitude, params.deliveryLocation.longitude)) {
      throw new Error('Coordinates provided are invalid or outside Earth boundaries');
    }
  }

  const reqCode = `DROP-${params.itemCategory.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const id = `req_drop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const newRequest: JeevaDropRequest = {
    id,
    requestCode: reqCode,
    sosId: params.sosId || null,
    itemCategory: params.itemCategory,
    itemName: spec.name,
    quantityRequested: params.quantity,
    quantityUnit: spec.defaultUnit,
    deliveryLocation: {
      latitude: params.deliveryLocation.latitude ?? null,
      longitude: params.deliveryLocation.longitude ?? null,
      locationName: params.deliveryLocation.locationName?.trim() || 'Designated Delivery Area',
      floorLevel: params.deliveryLocation.floorLevel?.trim() || 'Ground Floor',
      landmark: params.deliveryLocation.landmark?.trim() || null,
    },
    urgency: params.urgency,
    priority: params.priority || (params.urgency === 'critical' ? 'critical' : params.urgency === 'urgent' ? 'high' : 'medium'),
    justification: params.justification.trim(),
    status: params.startAsDraft ? 'draft' : 'submitted',
    isHumanVerified: false,
    is_simulation: true,
    no_real_delivery_claim: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const all = getStoredRequests();
  persistRequests([newRequest, ...all]);
  return newRequest;
}

/**
 * State machine validator for allowed JeevaDrop transitions:
 * draft -> submitted -> under_review -> approved -> simulated_fulfillment -> completed
 * Any non-terminal state -> cancelled
 */
export function updateJeevaDropStatus(
  requestId: string,
  newStatus: JeevaDropStatus,
  operatorId?: string,
  notes?: string
): JeevaDropRequest {
  const requests = getStoredRequests();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) throw new Error('Relief request not found');

  const current = requests[index];

  // Disallow transitions from terminal states
  if (current.status === 'completed' || current.status === 'cancelled') {
    throw new Error(`Cannot transition relief request from terminal status: ${current.status}`);
  }

  // State machine transition verification
  const allowedTransitions: Record<JeevaDropStatus, JeevaDropStatus[]> = {
    draft: ['submitted', 'cancelled'],
    submitted: ['under_review', 'approved', 'cancelled'],
    under_review: ['approved', 'submitted', 'cancelled'],
    approved: ['simulated_fulfillment', 'completed', 'cancelled'],
    simulated_fulfillment: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  if (!allowedTransitions[current.status].includes(newStatus)) {
    throw new Error(`Invalid state transition: Cannot change from ${current.status} to ${newStatus}`);
  }

  const isVerified = newStatus === 'approved' || newStatus === 'simulated_fulfillment' || newStatus === 'completed'
    ? true
    : current.isHumanVerified;

  const updated: JeevaDropRequest = {
    ...current,
    status: newStatus,
    isHumanVerified: isVerified,
    verifiedByOperatorId: operatorId || current.verifiedByOperatorId,
    operatorNotes: notes || current.operatorNotes,
    fulfillmentNotes: newStatus === 'simulated_fulfillment' || newStatus === 'completed'
      ? (notes || 'Simulated delivery completed under demonstration conditions.')
      : current.fulfillmentNotes,
    completedAt: newStatus === 'completed' ? new Date().toISOString() : current.completedAt,
    cancelledAt: newStatus === 'cancelled' ? new Date().toISOString() : current.cancelledAt,
    updatedAt: new Date().toISOString(),
  };

  requests[index] = updated;
  persistRequests(requests);
  return updated;
}

/**
 * Cancels a relief request from any active state.
 */
export function cancelJeevaDropRequest(requestId: string, reason: string): JeevaDropRequest {
  return updateJeevaDropStatus(requestId, 'cancelled', undefined, reason);
}

/**
 * Returns all stored JeevaDrop relief requests.
 */
export function listJeevaDropRequests(): JeevaDropRequest[] {
  return getStoredRequests();
}

/**
 * Reset helper for testing.
 */
export function resetJeevaDropStoreForTesting(): void {
  try {
    localStorage.removeItem(JEEVADROP_STORAGE_KEY);
  } catch {
    // ignore
  }
}

