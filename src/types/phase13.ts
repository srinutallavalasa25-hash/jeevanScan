// ==============================================================================
// JEEVASCAN AI — PHASE 13 DISASTER HISTORY & RETROSPECTIVE ARCHIVE TYPES
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Phase 13 — Historical Case Studies, Authoritative Sources & Resilience Lessons
// ==============================================================================

export type DisasterType = 'flood' | 'cyclone' | 'glof' | 'earthquake' | 'other';

export interface SourceCitation {
  id: string;
  title: string;
  agency: string; // e.g. "National Disaster Management Authority (NDMA)"
  reportReference?: string; // e.g. "Report No. 8 of 2017 (Performance Audit)"
  publicationYear: number;
  url: string; // Clickable link to official government/agency domain
  isExternalGovernmentLink: boolean;
}

export interface DocumentedFacts {
  meteorologicalCause: string;
  peakPrecipitationOrIntensity: string;
  officialImpactSummary: string;
  documentedCasualtiesEstimate: string;
  inundationAndDisplacement: string;
}

export interface HistoricalDisasterRecord {
  id: string;
  title: string;
  disasterType: DisasterType;
  year: number;
  dateRange: string;
  stateRegion: string;
  affectedRegions: string[];
  approximateCoordinates?: {
    latitude: number;
    longitude: number;
  };
  documentedFacts: DocumentedFacts;
  responseMeasures: string[];
  lessonsLearned: string[];
  sources: SourceCitation[];
  isVerifiedOfficialRecord: boolean;
}

export interface DisasterHistoryFilters {
  searchQuery: string;
  disasterType: string; // 'all' | DisasterType
  year: string; // 'all' | '2023' | '2020' | '2015'
}

