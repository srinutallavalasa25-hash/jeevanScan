// ==============================================================================
// JEEVASCAN AI — JEEVACARE DONATION & PLEDGE STORE
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Phase 12 — Transparent donation coordination, pledge tracking, and sample campaigns
// ==============================================================================

import type {
  DonationCategory,
  PledgeStatus,
  ReliefCampaign,
  JeevaCarePledge,
} from '../../types/phase12';

export const JEEVACARE_PLEDGES_KEY = 'jeevascan_demo_care_pledges';
export const JEEVACARE_CAMPAIGNS_KEY = 'jeevascan_demo_care_campaigns';

export const DEMO_PLEDGE_NOTICE =
  'DEMO PLEDGE ONLY — NO PAYMENT HAS BEEN PROCESSED. JeevaCare demonstrates disaster relief pledge tracking for transparent resource coordination. It never collects bank credentials, card numbers, or UPI PINs, and executes zero real financial transactions.';

export const SAMPLE_RELIEF_CAMPAIGNS: ReliefCampaign[] = [
  {
    id: 'camp_musi_2026',
    campaignCode: 'CAMP-FLD-01',
    title: 'Musi River Flood Emergency Rations & Water Drive',
    description: 'Providing sterile drinking water and high-calorie rations to families marooned along the low-lying Musi river basin.',
    targetCategory: 'food_water',
    monetaryTargetInr: 500000,
    monetaryPledgedInr: 185000,
    physicalTargetUnits: 1500,
    physicalPledgedUnits: 620,
    itemUnitName: 'Water & Ration Kits',
    is_sample_campaign: true,
    isActive: true,
    startDate: '2026-10-25T00:00:00Z',
    endDate: '2026-11-15T00:00:00Z',
  },
  {
    id: 'camp_med_supplies',
    campaignCode: 'CAMP-MED-02',
    title: 'Flood Trauma First Aid & Antiseptic Relief Pool',
    description: 'Procuring trauma bandages, sterile antiseptic swabs, and water purification packets for relief camps.',
    targetCategory: 'first_aid_medical',
    monetaryTargetInr: 300000,
    monetaryPledgedInr: 120000,
    physicalTargetUnits: 500,
    physicalPledgedUnits: 210,
    itemUnitName: 'First Aid Packs',
    is_sample_campaign: true,
    isActive: true,
    startDate: '2026-10-26T00:00:00Z',
    endDate: '2026-11-20T00:00:00Z',
  },
  {
    id: 'camp_thermal_blankets',
    campaignCode: 'CAMP-MAT-03',
    title: 'Rooftop Evacuee Thermal Blanket & Dry Sheets',
    description: 'Distributing reflective thermal mylar foil blankets to prevent hypothermia among evacuated children and elders.',
    targetCategory: 'relief_materials',
    monetaryTargetInr: 200000,
    monetaryPledgedInr: 95000,
    physicalTargetUnits: 800,
    physicalPledgedUnits: 430,
    itemUnitName: 'Thermal Blankets',
    is_sample_campaign: true,
    isActive: true,
    startDate: '2026-10-27T00:00:00Z',
    endDate: '2026-11-10T00:00:00Z',
  },
];

export const INITIAL_DEMO_PLEDGES: JeevaCarePledge[] = [
  {
    id: 'pledge_demo_01',
    pledgeCode: 'PLG-WTR-2041',
    campaignId: 'camp_musi_2026',
    campaignTitle: 'Musi River Flood Emergency Rations & Water Drive',
    category: 'food_water',
    physicalQuantity: 50,
    physicalUnit: 'Water & Ration Kits',
    itemDescription: '50 packs of sealed drinking water bottles and dry biscuits.',
    donorDisplayName: 'Hyderabad Volunteer Circle',
    donorCity: 'Secunderabad',
    status: 'verified',
    isVerified: true,
    verifiedByOperatorId: 'OP-COORD-1',
    fulfillmentNotes: 'Staged at Government High School Relief Camp store.',
    is_demo_pledge: true,
    no_payment_processed: true,
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    verifiedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'pledge_demo_02',
    pledgeCode: 'PLG-INR-7712',
    campaignId: 'camp_med_supplies',
    campaignTitle: 'Flood Trauma First Aid & Antiseptic Relief Pool',
    category: 'money_pledge',
    monetaryAmountInr: 5000,
    itemDescription: 'Pledged financial contribution for medical restocking (Demo simulation).',
    donorDisplayName: 'Ravi Teja M.',
    donorCity: 'Kukatpally, Hyderabad',
    status: 'pledged',
    isVerified: false,
    is_demo_pledge: true,
    no_payment_processed: true,
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
];

function getStoredCampaigns(): ReliefCampaign[] {
  try {
    const raw = localStorage.getItem(JEEVACARE_CAMPAIGNS_KEY);
    if (!raw) {
      persistCampaigns(SAMPLE_RELIEF_CAMPAIGNS);
      return SAMPLE_RELIEF_CAMPAIGNS;
    }
    return JSON.parse(raw);
  } catch {
    return SAMPLE_RELIEF_CAMPAIGNS;
  }
}

function persistCampaigns(camps: ReliefCampaign[]): void {
  try {
    localStorage.setItem(JEEVACARE_CAMPAIGNS_KEY, JSON.stringify(camps));
  } catch (err) {
    console.warn('LocalStorage error saving campaigns:', err);
  }
}

function getStoredPledges(): JeevaCarePledge[] {
  try {
    const raw = localStorage.getItem(JEEVACARE_PLEDGES_KEY);
    if (!raw) {
      persistPledges(INITIAL_DEMO_PLEDGES);
      return INITIAL_DEMO_PLEDGES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_PLEDGES;
  }
}

function persistPledges(pledges: JeevaCarePledge[]): void {
  try {
    localStorage.setItem(JEEVACARE_PLEDGES_KEY, JSON.stringify(pledges));
  } catch (err) {
    console.warn('LocalStorage error saving pledges:', err);
  }
}

/**
 * Creates a new donation pledge.
 */
export function createCarePledge(params: {
  campaignId: string;
  category: DonationCategory;
  donorDisplayName: string;
  donorCity?: string;
  donorContactPhone?: string;
  monetaryAmountInr?: number;
  physicalQuantity?: number;
  physicalUnit?: string;
  itemDescription?: string;
}): JeevaCarePledge {
  if (!params.donorDisplayName?.trim()) {
    throw new Error('Donor display name is required');
  }

  // Validate values
  if (params.category === 'money_pledge') {
    if (!params.monetaryAmountInr || params.monetaryAmountInr <= 0) {
      throw new Error('Pledged amount must be greater than ₹0');
    }
    if (params.monetaryAmountInr > 500000) {
      throw new Error('Pledge amount exceeds demonstration threshold of ₹5,00,000');
    }
  } else {
    if (!params.physicalQuantity || params.physicalQuantity <= 0 || !Number.isInteger(params.physicalQuantity)) {
      throw new Error('Pledged physical quantity must be a positive integer');
    }
    if (!params.itemDescription?.trim()) {
      throw new Error('Item description is required for physical goods pledge');
    }
  }

  const campaigns = getStoredCampaigns();
  const campaign = campaigns.find((c) => c.id === params.campaignId) || campaigns[0];

  const pledgeId = `pledge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const pledgeCode = `PLG-${params.category.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newPledge: JeevaCarePledge = {
    id: pledgeId,
    pledgeCode,
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    category: params.category,
    monetaryAmountInr: params.category === 'money_pledge' ? params.monetaryAmountInr : undefined,
    physicalQuantity: params.category !== 'money_pledge' ? params.physicalQuantity : undefined,
    physicalUnit: params.physicalUnit || campaign.itemUnitName || 'Units',
    itemDescription: params.itemDescription?.trim() || 'Emergency relief contribution',
    donorDisplayName: params.donorDisplayName.trim(),
    donorCity: params.donorCity?.trim() || 'Telangana / Andhra Pradesh',
    donorContactPhone: params.donorContactPhone?.trim(),
    status: 'pledged',
    isVerified: false,
    is_demo_pledge: true,
    no_payment_processed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const all = getStoredPledges();
  persistPledges([newPledge, ...all]);

  // Update campaign running totals
  if (params.category === 'money_pledge' && params.monetaryAmountInr) {
    campaign.monetaryPledgedInr = (campaign.monetaryPledgedInr || 0) + params.monetaryAmountInr;
  } else if (params.physicalQuantity) {
    campaign.physicalPledgedUnits = (campaign.physicalPledgedUnits || 0) + params.physicalQuantity;
  }
  persistCampaigns(campaigns);

  return newPledge;
}

/**
 * State machine validator for allowed pledge transitions:
 * pledged -> under_verification -> verified -> fulfilled
 * Any active state -> cancelled
 */
export function updateCarePledgeStatus(
  pledgeId: string,
  newStatus: PledgeStatus,
  operatorId?: string,
  notes?: string
): JeevaCarePledge {
  const pledges = getStoredPledges();
  const index = pledges.findIndex((p) => p.id === pledgeId);
  if (index === -1) throw new Error('Pledge not found');

  const current = pledges[index];

  if (current.status === 'fulfilled' || current.status === 'cancelled') {
    throw new Error(`Cannot modify pledge in terminal status: ${current.status}`);
  }

  const allowedTransitions: Record<PledgeStatus, PledgeStatus[]> = {
    pledged: ['under_verification', 'verified', 'cancelled'],
    under_verification: ['verified', 'cancelled'],
    verified: ['fulfilled', 'cancelled'],
    fulfilled: [],
    cancelled: [],
  };

  if (!allowedTransitions[current.status].includes(newStatus)) {
    throw new Error(`Invalid state transition: Cannot change pledge from ${current.status} to ${newStatus}`);
  }

  const isVerified = newStatus === 'verified' || newStatus === 'fulfilled' ? true : current.isVerified;

  const updated: JeevaCarePledge = {
    ...current,
    status: newStatus,
    isVerified,
    verifiedByOperatorId: operatorId || current.verifiedByOperatorId,
    fulfillmentNotes: notes || current.fulfillmentNotes,
    verifiedAt: newStatus === 'verified' ? new Date().toISOString() : current.verifiedAt,
    fulfilledAt: newStatus === 'fulfilled' ? new Date().toISOString() : current.fulfilledAt,
    updatedAt: new Date().toISOString(),
  };

  pledges[index] = updated;
  persistPledges(pledges);
  return updated;
}

/**
 * Cancels a donation pledge.
 */
export function cancelCarePledge(pledgeId: string, reason: string): JeevaCarePledge {
  return updateCarePledgeStatus(pledgeId, 'cancelled', undefined, reason);
}

/**
 * Lists all active relief campaigns.
 */
export function listReliefCampaigns(): ReliefCampaign[] {
  return getStoredCampaigns();
}

/**
 * Lists all donation pledges.
 */
export function listCarePledges(): JeevaCarePledge[] {
  return getStoredPledges();
}

export const listJeevaCarePledges = listCarePledges;

/**
 * Reset helper for testing.
 */
export function resetCareStoreForTesting(): void {
  try {
    localStorage.removeItem(JEEVACARE_PLEDGES_KEY);
    localStorage.removeItem(JEEVACARE_CAMPAIGNS_KEY);
  } catch {
    // ignore
  }
}
