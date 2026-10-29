// ==============================================================================
// JEEVASCAN AI — PHASE 12 DOMAIN TYPES
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Types for Flood Rescue Mode, JeevaDrop Relief Supply, and JeevaCare Donations
// ==============================================================================

import type { IncidentPriority } from './database';

// ------------------------------------------------------------------------------
// 1. Flood Rescue Mode Types
// ------------------------------------------------------------------------------

export type FloodWaterLevel = 'ankle_deep' | 'knee_deep' | 'waist_deep' | 'chest_deep' | 'submerged_roof';

export interface FloodObservation {
  id: string;
  sosId: string;
  waterLevel: FloodWaterLevel;
  waterRisingTrend: 'rising_fast' | 'rising_slow' | 'stable' | 'receding';
  vulnerablePersonsReported: {
    hasInfants: boolean;
    hasElderly: boolean;
    hasBedridden: boolean;
    countEstimate?: number;
  };
  floorLevel: 'ground' | 'first_floor' | 'second_plus' | 'roof_terrace';
  hazardsPresent: string[];
  reportedAt: string;
  isCitizenReport: boolean;
}

// ------------------------------------------------------------------------------
// 2. JeevaDrop Relief Supply Coordination Types
// ------------------------------------------------------------------------------

export type ReliefItemCategory =
  | 'potable_water'
  | 'survival_rations'
  | 'first_aid_kit'
  | 'essential_medicines'
  | 'thermal_blankets'
  | 'infant_supplies'
  | 'hygiene_sanitation'
  | 'other_supplies';

export type JeevaDropStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'simulated_fulfillment'
  | 'completed'
  | 'cancelled';

export interface JeevaDropRequest {
  id: string;
  requestCode: string;
  sosId?: string | null;
  itemCategory: ReliefItemCategory;
  itemName: string;
  quantityRequested: number;
  quantityUnit: string;
  
  // Delivery Location Details
  deliveryLocation: {
    latitude?: number | null;
    longitude?: number | null;
    locationName?: string | null;
    floorLevel?: string | null;
    landmark?: string | null;
  };
  
  // Priority & Justification
  urgency: 'critical' | 'urgent' | 'standard';
  priority: IncidentPriority;
  justification: string;
  
  // Lifecycle & Governance
  status: JeevaDropStatus;
  isHumanVerified: boolean;
  verifiedByOperatorId?: string | null;
  operatorNotes?: string | null;
  fulfillmentNotes?: string | null;
  
  // Safety & Simulation Flags
  is_simulation: true;
  no_real_delivery_claim: true;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
}

// ------------------------------------------------------------------------------
// 3. JeevaCare Donation Coordination Types
// ------------------------------------------------------------------------------

export type DonationCategory =
  | 'money_pledge'
  | 'food_water'
  | 'first_aid_medical'
  | 'relief_materials';

export type PledgeStatus =
  | 'pledged'
  | 'under_verification'
  | 'verified'
  | 'fulfilled'
  | 'cancelled';

export interface ReliefCampaign {
  id: string;
  campaignCode: string;
  title: string;
  description: string;
  targetCategory: DonationCategory;
  monetaryTargetInr?: number;
  monetaryPledgedInr?: number;
  physicalTargetUnits?: number;
  physicalPledgedUnits?: number;
  itemUnitName?: string;
  is_sample_campaign: true;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface JeevaCarePledge {
  id: string;
  pledgeCode: string;
  campaignId: string;
  campaignTitle: string;
  category: DonationCategory;
  
  // Pledge Quantities (strictly pledges, never card/bank credentials)
  monetaryAmountInr?: number;
  physicalQuantity?: number;
  physicalUnit?: string;
  itemDescription?: string;
  
  // Donor Metadata (voluntary contact, no financial secrets)
  donorDisplayName: string;
  donorCity?: string;
  donorContactPhone?: string; // Optional for delivery logistics
  
  // Verification & Status
  status: PledgeStatus;
  isVerified: boolean;
  verifiedByOperatorId?: string | null;
  fulfillmentNotes?: string | null;
  
  // Invariant Markers
  is_demo_pledge: true;
  no_payment_processed: true;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string | null;
  fulfilledAt?: string | null;
}

// ------------------------------------------------------------------------------
// 4. Shared Coordination Dashboard Summary Types
// ------------------------------------------------------------------------------

export interface CoordinationDashboardStats {
  openFloodIncidents: number;
  criticalFloodIncidents: number;
  reliefRequestsAwaitingReview: number;
  reliefRequestsApproved: number;
  reliefRequestsFulfilledSimulated: number;
  donationPledgesAwaitingVerification: number;
  donationPledgesVerified: number;
  totalPledgedInr: number;
  completedDemoWorkflows: number;
  isDemoStore: boolean;
}

