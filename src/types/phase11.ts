// ==============================================================================
// JEEVASCAN AI — PHASE 11 DOMAIN TYPES
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Types for AI-assisted incident review and simulated drone rescue coordination
// ==============================================================================

import type { EmergencyType, IncidentPriority } from './database';

// ------------------------------------------------------------------------------
// AI-Assisted Incident Review Types
// ------------------------------------------------------------------------------

export interface ExtractedHazard {
  id: string;
  hazard: string;
  severity: 'critical' | 'high' | 'medium';
  evidenceText: string;
  category: 'structural' | 'environmental' | 'medical' | 'electrical' | 'access';
}

export interface UrgencyRationaleRule {
  ruleId: string;
  title: string;
  description: string;
  priorityImplication: IncidentPriority;
  isTriggered: boolean;
}

export interface ImageDecisionSupport {
  hasImage: boolean;
  imageUrl?: string | null;
  observationSummary: string;
  potentialObstacles: string[];
  survivabilityAssessmentDisclaimer: string;
  isMedicalDiagnosis: false;
}

export interface IncidentReviewReport {
  incidentId: string;
  sosId: string;
  generatedAt: string;
  summary: string;
  
  // Categorized Information Isolation
  reportedFacts: string[];
  inferredPossibilities: string[];
  missingInformation: string[];
  
  // Hazard & Urgency Extraction
  extractedHazards: ExtractedHazard[];
  urgencyRationale: UrgencyRationaleRule[];
  originalPriorityPreserved: IncidentPriority;
  suggestedPriorityReview?: IncidentPriority;
  
  // Human Operator Guidance
  suggestedVerifications: string[];
  recommendedCoordinationSteps: string[];
  
  // Decision Support & Medical Safety
  imageDecisionSupport?: ImageDecisionSupport | null;
  safetyNotice: string;
  isDecisionSupportOnly: true;
}

// ------------------------------------------------------------------------------
// Drone Rescue Simulator Types
// ------------------------------------------------------------------------------

export type DronePayloadCategory =
  | 'drinking_water'
  | 'first_aid'
  | 'essential_medicine'
  | 'survival_rations'
  | 'thermal_recon';

export type DroneMissionStatus =
  | 'draft'
  | 'awaiting_approval'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface DroneBaseStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  availableDrones: number;
  maxPayloadKg: number;
}

export interface FlightConstraintsCheck {
  windAcceptable: boolean;
  currentWindKph: number;
  maxWindKph: number;
  payloadAcceptable: boolean;
  payloadWeightKg: number;
  maxPayloadKg: number;
  targetCoordsValid: boolean;
  operatorApproved: boolean;
  allClear: boolean;
}

export interface SimulatedDroneTelemetry {
  altitudeMeters: number;
  speedMps: number;
  batteryPercent: number;
  simulatedWindKph: number;
  distanceRemainingKm: number;
  currentLatitude: number;
  currentLongitude: number;
}

export interface SimulatedDroneMission {
  id: string;
  missionCode: string;
  incidentId: string;
  targetSosId: string;
  emergencyType: EmergencyType;
  objective: string;
  
  // Location & Flight Math
  baseStation: DroneBaseStation;
  targetLocation: {
    latitude: number;
    longitude: number;
    name?: string | null;
  };
  distanceKm: number;
  estimatedFlightDurationMinutes: number;
  
  // Payload
  payloadCategory: DronePayloadCategory;
  payloadWeightKg: number;
  payloadDescription: string;
  
  // State & Governance
  status: DroneMissionStatus;
  progressPercent: number;
  telemetry?: SimulatedDroneTelemetry;
  flightConstraints: FlightConstraintsCheck;
  
  // Operator Approvals & Audit
  operatorApprovedAt?: string | null;
  operatorNotes?: string | null;
  cancellationReason?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Invariant Markers
  is_simulation: true;
  no_real_hardware_deployed: true;
}

