// ==============================================================================
// JEEVASCAN AI — DRONE RESCUE SIMULATOR ENGINE
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Demonstration-only tactical drone mission coordinator and flight simulator
// ==============================================================================

import type { IncidentRecord } from '../../types/database';
import type {
  SimulatedDroneMission,
  DroneBaseStation,
  DronePayloadCategory,
  FlightConstraintsCheck,
  SimulatedDroneTelemetry,
} from '../../types/phase11';
import { calculateDirectDistanceKm } from '../location/liveLocationManager';
import { isValidCoordinate } from '../map/mapUtils';

export const SIMULATION_NOTICE_BANNER =
  'DEMO SIMULATION — NO DRONE DEPLOYED. All flight vectors, telemetry, and payload releases are simulated software demonstrations. No physical unmanned aerial vehicles are controlled, connected, or dispatched.';

export const DEMO_DRONE_BASES: DroneBaseStation[] = [
  {
    id: 'base-alpha',
    name: 'District Disaster Drone Hub Alpha (Central Command)',
    latitude: 17.398,
    longitude: 78.475,
    availableDrones: 4,
    maxPayloadKg: 3.5,
  },
  {
    id: 'base-beta',
    name: 'Secunderabad Elevated Relief Base Beta',
    latitude: 17.4399,
    longitude: 78.4983,
    availableDrones: 2,
    maxPayloadKg: 4.0,
  },
  {
    id: 'base-gamma',
    name: 'Dilsukhnagar Staging Station Gamma',
    latitude: 17.3688,
    longitude: 78.5247,
    availableDrones: 3,
    maxPayloadKg: 3.0,
  },
];

export const PAYLOAD_SPECIFICATIONS: Record<
  DronePayloadCategory,
  { name: string; weightKg: number; description: string }
> = {
  drinking_water: {
    name: 'Potable Water Packets',
    weightKg: 1.5,
    description: 'Triple-sealed emergency drinking water packets (3x 500ml).',
  },
  first_aid: {
    name: 'Trauma & First Aid Kit',
    weightKg: 0.9,
    description: 'Hemostatic bandages, tourniquet, antiseptic, and burn dressing.',
  },
  essential_medicine: {
    name: 'Life-Sustaining Medicine Pack',
    weightKg: 0.4,
    description: 'Cold-pack insulin, asthma inhaler, and oral rehydration salts.',
  },
  survival_rations: {
    name: 'Ready-to-Eat Survival Rations',
    weightKg: 1.2,
    description: 'High-calorie nutrient bars and thermal electrolyte mix.',
  },
  thermal_recon: {
    name: 'Thermal Aerial Reconnaissance',
    weightKg: 0.0,
    description: 'FLIR thermal imaging payload for roof and water sweep (no cargo).',
  },
};

const DRONE_STORE_KEY = 'jeevascan_demo_drone_missions';

function getStoredMissions(): SimulatedDroneMission[] {
  try {
    const raw = localStorage.getItem(DRONE_STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistMissions(missions: SimulatedDroneMission[]): void {
  try {
    localStorage.setItem(DRONE_STORE_KEY, JSON.stringify(missions));
  } catch (err) {
    console.warn('LocalStorage error while saving simulated drone missions:', err);
  }
}

/**
 * Calculates pre-flight safety constraints for a proposed mission.
 */
export function evaluateFlightConstraints(
  base: DroneBaseStation,
  targetLat: number | null | undefined,
  targetLng: number | null | undefined,
  payloadWeightKg: number,
  operatorApproved: boolean
): FlightConstraintsCheck {
  const currentWindKph = 16.5; // Simulated nominal breeze
  const maxWindKph = 35.0; // Safe UAV operating limit
  const windAcceptable = currentWindKph <= maxWindKph;
  const payloadAcceptable = payloadWeightKg <= base.maxPayloadKg;
  const targetCoordsValid = isValidCoordinate(targetLat, targetLng);
  const allClear = windAcceptable && payloadAcceptable && targetCoordsValid && operatorApproved;

  return {
    windAcceptable,
    currentWindKph,
    maxWindKph,
    payloadAcceptable,
    payloadWeightKg,
    maxPayloadKg: base.maxPayloadKg,
    targetCoordsValid,
    operatorApproved,
    allClear,
  };
}

/**
 * Creates a new Draft Simulated Drone Mission.
 */
export function createDraftDroneMission(
  incident: IncidentRecord,
  baseStation: DroneBaseStation = DEMO_DRONE_BASES[0],
  payloadCategory: DronePayloadCategory = 'drinking_water',
  targetCoordsOverride?: { latitude: number; longitude: number; name?: string }
): SimulatedDroneMission {
  const targetLat = targetCoordsOverride ? targetCoordsOverride.latitude : incident.latitude;
  const targetLng = targetCoordsOverride ? targetCoordsOverride.longitude : incident.longitude;

  const validCoords = isValidCoordinate(targetLat, targetLng);
  const distanceKm = validCoords
    ? calculateDirectDistanceKm(baseStation.latitude, baseStation.longitude, targetLat as number, targetLng as number)
    : 0;

  // Average cruising speed 12 m/s (~43.2 km/h) plus 2 mins prep/climb/descend
  const estimatedFlightDurationMinutes = validCoords
    ? Math.max(3, Math.round((distanceKm / 43.2) * 60 + 2))
    : 0;

  const payloadSpec = PAYLOAD_SPECIFICATIONS[payloadCategory];
  const constraints = evaluateFlightConstraints(
    baseStation,
    targetLat,
    targetLng,
    payloadSpec.weightKg,
    false
  );

  const missionId = `sim_mission_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const missionCode = `UAV-SIM-${incident.sos_id.slice(0, 6).toUpperCase()}`;

  const mission: SimulatedDroneMission = {
    id: missionId,
    missionCode,
    incidentId: incident.id,
    targetSosId: incident.sos_id,
    emergencyType: incident.emergency_type,
    objective: `Simulated aerial delivery of ${payloadSpec.name} to stranded citizen (${incident.sos_id.slice(0, 8)})`,
    baseStation,
    targetLocation: {
      latitude: validCoords ? (targetLat as number) : 0,
      longitude: validCoords ? (targetLng as number) : 0,
      name: incident.location_name || 'Designated Incident Coordinates',
    },
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    estimatedFlightDurationMinutes,
    payloadCategory,
    payloadWeightKg: payloadSpec.weightKg,
    payloadDescription: payloadSpec.description,
    status: 'draft',
    progressPercent: 0,
    flightConstraints: constraints,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    is_simulation: true,
    no_real_hardware_deployed: true,
  };

  const all = getStoredMissions();
  persistMissions([mission, ...all]);
  return mission;
}

/**
 * Transitions mission from 'draft' to 'awaiting_approval'.
 */
export function requestOperatorApproval(missionId: string): SimulatedDroneMission {
  const missions = getStoredMissions();
  const index = missions.findIndex((m) => m.id === missionId);
  if (index === -1) throw new Error('Mission not found');

  const mission = missions[index];
  if (mission.status !== 'draft') {
    throw new Error(`Cannot request approval from status: ${mission.status}`);
  }

  const updated: SimulatedDroneMission = {
    ...mission,
    status: 'awaiting_approval',
    updatedAt: new Date().toISOString(),
  };

  missions[index] = updated;
  persistMissions(missions);
  return updated;
}

/**
 * Explicit Human Operator Approval to launch simulated flight.
 */
export function approveAndLaunchSimulation(
  missionId: string,
  operatorNotes?: string
): SimulatedDroneMission {
  const missions = getStoredMissions();
  const index = missions.findIndex((m) => m.id === missionId);
  if (index === -1) throw new Error('Mission not found');

  const mission = missions[index];
  if (mission.status !== 'awaiting_approval' && mission.status !== 'draft') {
    throw new Error(`Cannot approve mission from status: ${mission.status}`);
  }

  // Pre-flight validation
  if (!mission.flightConstraints.targetCoordsValid) {
    throw new Error('Pre-flight check failed: Target coordinates are invalid');
  }
  if (!mission.flightConstraints.payloadAcceptable) {
    throw new Error('Pre-flight check failed: Payload weight exceeds drone capacity');
  }

  const updatedConstraints: FlightConstraintsCheck = {
    ...mission.flightConstraints,
    operatorApproved: true,
    allClear: true,
  };

  const initialTelemetry: SimulatedDroneTelemetry = {
    altitudeMeters: 45,
    speedMps: 12.0,
    batteryPercent: 100,
    simulatedWindKph: 16.5,
    distanceRemainingKm: mission.distanceKm,
    currentLatitude: mission.baseStation.latitude,
    currentLongitude: mission.baseStation.longitude,
  };

  const updated: SimulatedDroneMission = {
    ...mission,
    status: 'in_progress',
    progressPercent: 0,
    flightConstraints: updatedConstraints,
    operatorApprovedAt: new Date().toISOString(),
    operatorNotes: operatorNotes || 'Approved by operator for simulation exercise',
    telemetry: initialTelemetry,
    updatedAt: new Date().toISOString(),
  };

  missions[index] = updated;
  persistMissions(missions);
  return updated;
}

/**
 * Steps the simulated flight forward by deltaPercent (e.g. 25%).
 */
export function advanceSimulationStep(
  missionId: string,
  deltaPercent: number = 25
): SimulatedDroneMission {
  const missions = getStoredMissions();
  const index = missions.findIndex((m) => m.id === missionId);
  if (index === -1) throw new Error('Mission not found');

  const mission = missions[index];
  if (mission.status !== 'in_progress') {
    throw new Error(`Cannot advance simulation for mission in status: ${mission.status}`);
  }

  const nextProgress = Math.min(100, mission.progressPercent + deltaPercent);
  const ratio = nextProgress / 100;

  // Interpolate simulated drone position
  const currentLat =
    mission.baseStation.latitude +
    (mission.targetLocation.latitude - mission.baseStation.latitude) * ratio;
  const currentLng =
    mission.baseStation.longitude +
    (mission.targetLocation.longitude - mission.baseStation.longitude) * ratio;

  const isCompleted = nextProgress >= 100;

  const nextTelemetry: SimulatedDroneTelemetry = {
    altitudeMeters: isCompleted ? 0 : 45 + Math.sin(ratio * Math.PI) * 10,
    speedMps: isCompleted ? 0 : 12.0,
    batteryPercent: Math.max(15, Math.round(100 - ratio * 35)),
    simulatedWindKph: 16.5 + (Math.random() * 2 - 1),
    distanceRemainingKm: parseFloat((mission.distanceKm * (1 - ratio)).toFixed(2)),
    currentLatitude: parseFloat(currentLat.toFixed(5)),
    currentLongitude: parseFloat(currentLng.toFixed(5)),
  };

  const updated: SimulatedDroneMission = {
    ...mission,
    status: isCompleted ? 'completed' : 'in_progress',
    progressPercent: nextProgress,
    telemetry: nextTelemetry,
    completedAt: isCompleted ? new Date().toISOString() : undefined,
    updatedAt: new Date().toISOString(),
  };

  missions[index] = updated;
  persistMissions(missions);
  return updated;
}

/**
 * Cancels a simulated mission from any state.
 */
export function cancelSimulatedMission(
  missionId: string,
  reason: string = 'Cancelled by operator'
): SimulatedDroneMission {
  const missions = getStoredMissions();
  const index = missions.findIndex((m) => m.id === missionId);
  if (index === -1) throw new Error('Mission not found');

  const mission = missions[index];
  if (mission.status === 'completed' || mission.status === 'cancelled') {
    throw new Error(`Mission is already in terminal state: ${mission.status}`);
  }

  const updated: SimulatedDroneMission = {
    ...mission,
    status: 'cancelled',
    cancellationReason: reason,
    updatedAt: new Date().toISOString(),
  };

  missions[index] = updated;
  persistMissions(missions);
  return updated;
}

/**
 * Retrieves all stored simulated drone missions.
 */
export function listSimulatedMissions(): SimulatedDroneMission[] {
  return getStoredMissions();
}

/**
 * Clears demo missions (for test resets).
 */
export function resetDroneMissionsForTesting(): void {
  try {
    localStorage.removeItem(DRONE_STORE_KEY);
  } catch {
    // ignore
  }
}

