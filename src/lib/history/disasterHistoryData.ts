// ==============================================================================
// JEEVASCAN AI — DISASTER HISTORY DATA STORE
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Phase 13 — Authoritative disaster archives, verified government sources & lessons
// ==============================================================================

import type { HistoricalDisasterRecord, DisasterHistoryFilters } from '../../types/phase13';

export const HISTORICAL_DISASTER_DATA: HistoricalDisasterRecord[] = [
  {
    id: 'disaster_chennai_2015',
    title: '2015 Chennai Metropolitan & Coromandel Floods',
    disasterType: 'flood',
    year: 2015,
    dateRange: 'November 8 – December 14, 2015 (Peak Crisis: Dec 1–4)',
    stateRegion: 'Tamil Nadu & Puducherry',
    affectedRegions: ['Chennai', 'Kanchipuram', 'Tiruvallur', 'Cuddalore'],
    approximateCoordinates: {
      latitude: 13.0827,
      longitude: 80.2707,
    },
    documentedFacts: {
      meteorologicalCause:
        'Vigorous Northeast Monsoon combined with a deep depression in the Bay of Bengal, amplified by one of the strongest El Niño oscillations on record.',
      peakPrecipitationOrIntensity:
        'Extreme single-day downpour on December 1, 2015: Tambaram recorded 494 mm in 24 hours; Chennai airport recorded 345 mm. Chennai received 1,049 mm in November 2015, highest in over 100 years.',
      officialImpactSummary:
        'Sudden emergency release of up to 29,000 cusecs from Chembarambakkam reservoir into the Adyar River submerged riverbanks, residential colonies, and the Chennai International Airport runway. Telecommunication towers submerged, cutting off mobile connectivity for 72+ hours.',
      documentedCasualtiesEstimate:
        'Official Government and NDMA audit reports recorded over 400 fatalities across Tamil Nadu, with economic damage exceeding ₹20,000 crore.',
      inundationAndDisplacement:
        'More than 1.8 million residents displaced; 4 million people marooned without drinking water, power, or operational telephone networks across metropolitan Chennai.',
    },
    responseMeasures: [
      'Tri-service military mobilization: Indian Navy launched "Operation Madad", Indian Army executed "Operation Sahayog", and Indian Air Force air-dropped 100+ tons of survival rations.',
      'NDRF mobilized 50+ specialized disaster teams with inflatable motorized boats for building-to-building extractions.',
      'Citizen volunteer networks and amateur HAM radio operators coordinated emergency food packets and SOS locations when commercial telecom collapsed.',
    ],
    lessonsLearned: [
      'Critical vulnerability of centralized telecom infrastructure: Cell towers submerge quickly, proving the life-saving requirement for browser-cached offline SOS logging and local mesh relays.',
      'Reservoir management protocols: Emphasized the urgent need for automated, rule-based inflow telemetry at reservoirs rather than manual delayed floodgate releases.',
      'Urban wetland preservation: Encroachment on natural pallikaranai marshlands and lake outflow channels severely degraded the city’s natural drainage capacity.',
    ],
    sources: [
      {
        id: 'src_cag_2017',
        title: 'Performance Audit of Flood Management and Response in Chennai and its Suburban Areas (Report No. 4 of 2017)',
        agency: 'Comptroller and Auditor General of India (CAG)',
        reportReference: 'CAG Report No. 4 of 2017 - Government of Tamil Nadu',
        publicationYear: 2017,
        url: 'https://cag.gov.in/en/audit-report/details/45722',
        isExternalGovernmentLink: true,
      },
      {
        id: 'src_imd_chennai_2015',
        title: 'Report on Extremely Heavy Rainfall Event over Chennai and Environs (December 2015)',
        agency: 'India Meteorological Department (IMD)',
        reportReference: 'IMD Hydromet Division Monograph',
        publicationYear: 2015,
        url: 'https://mausam.imd.gov.in',
        isExternalGovernmentLink: true,
      },
      {
        id: 'src_ndma_chennai',
        title: 'National Disaster Response Operations Annual Review 2015-16',
        agency: 'National Disaster Management Authority (NDMA)',
        reportReference: 'NDMA Operational Record Case File',
        publicationYear: 2016,
        url: 'https://ndma.gov.in',
        isExternalGovernmentLink: true,
      },
    ],
    isVerifiedOfficialRecord: true,
  },
  {
    id: 'disaster_hyderabad_2020',
    title: '2020 Hyderabad Deluge & Musi River Basin Flash Floods',
    disasterType: 'flood',
    year: 2020,
    dateRange: 'October 13 – 19, 2020 (Peak Deluge: Oct 13–14)',
    stateRegion: 'Telangana',
    affectedRegions: ['Hyderabad', 'Ranga Reddy', 'Medchal-Malkajgiri'],
    approximateCoordinates: {
      latitude: 17.3850,
      longitude: 78.4867,
    },
    documentedFacts: {
      meteorologicalCause:
        'Deep Depression BOB 02 crossed the Andhra Pradesh coast near Kakinada and tracked inland directly across central Telangana, maintaining deep depression intensity and generating intense mesoscale convective bands over the Musi River basin.',
      peakPrecipitationOrIntensity:
        'The primary IMD observatory at Begumpet recorded 191.8 mm (19.2 cm) in the 24 hours ending 08:30 IST on October 14, 2020, breaking Hyderabad’s all-time October 24-hour rainfall record set in 1903. Automated weather stations in Greater Hyderabad (TSDPS network) recorded localized 24-hour peaks of 324.8 mm at Ghatkesar and 290–300 mm across the Hayathnagar mandal.',
      officialImpactSummary:
        'Flash inundation overwhelmed stormwater nallas and urban lake chains; the Musi River burst its banks, submerging causeways like Moosarambagh and Chaderghat. Water levels reached 8–10 feet in low-lying localities such as Al-Jubail Colony, Hafiz Baba Nagar, and Tolichowki.',
      documentedCasualtiesEstimate:
        'State authorities initially confirmed 50 fatalities in the GHMC urban area during the peak flash flood (primarily structural wall collapses), with consolidated statewide casualties reaching 72 to 80+ across two successive rain spells in October 2020. The state government submitted a preliminary memorandum estimating damages at ₹5,000 crore (later detailed sector-wise assessments estimated over ₹8,000 crore).',
      inundationAndDisplacement:
        'Over 40,000 families were impacted by floodwaters in low-lying localities; municipal authorities evacuated more than 15,000 residents to emergency relief camps.',
    },
    responseMeasures: [
      'GHMC Disaster Response Force (DRF), Telangana State Police, and NDRF mobilized inflatable boats to extract residents marooned on rooftops.',
      'Indian Army deployed columns to Bandlaguda, Chandrayangutta, and Gaganpahad for rescue and distribution of dry rations.',
      'Telangana Government initiated emergency direct financial relief and decentralized health camps to prevent water-borne disease outbreaks.',
    ],
    lessonsLearned: [
      'Urban nalla and surplus weir encroachment: Natural cascades connecting urban water bodies (cheruvus) were constricted, converting slow drainage paths into sudden flash torrents.',
      'Rooftop triage coordination: High water velocity in narrow streets made vehicle entry impossible, demonstrating the critical value of aerial drone surveillance and rooftop location marking.',
      'Micro-level shelter guidance: Citizens required immediate geodesic orientation to the closest elevated dry civic buildings before access roads flooded.',
    ],
    sources: [
      {
        id: 'src_imd_bob02',
        title: 'Deep Depression BOB 02 over Bay of Bengal and Inland Passage Summary (October 2020)',
        agency: 'India Meteorological Department (IMD)',
        reportReference: 'RSMC Technical Bulletin BOB-02/2020',
        publicationYear: 2020,
        url: 'https://mausam.imd.gov.in',
        isExternalGovernmentLink: true,
      },
      {
        id: 'src_tsdma_hyderabad',
        title: 'Telangana State Disaster Management Authority Hyderabad Flood Assessment Report',
        agency: 'Telangana State Disaster Management Authority (TSDMA)',
        reportReference: 'Revenue (Disaster Management) Dept Documentation',
        publicationYear: 2020,
        url: 'https://tsdma.telangana.gov.in',
        isExternalGovernmentLink: true,
      },
      {
        id: 'src_nidm_urban_floods',
        title: 'Case Study on Urban Flash Floods in Hyderabad Metropolitan Area',
        agency: 'National Institute of Disaster Management (NIDM)',
        reportReference: 'NIDM Training & Research Monograph',
        publicationYear: 2021,
        url: 'https://nidm.gov.in',
        isExternalGovernmentLink: true,
      },
    ],
    isVerifiedOfficialRecord: true,
  },
  {
    id: 'disaster_sikkim_glof_2023',
    title: '2023 Sikkim South Lhonak Glacial Lake Outburst Flood (GLOF)',
    disasterType: 'glof',
    year: 2023,
    dateRange: 'October 3 – 4, 2023 (Midnight Flash Surge)',
    stateRegion: 'Sikkim',
    affectedRegions: ['South Lhonak Lake', 'Chungthang', 'Mangan', 'Gangtok', 'Pakyong'],
    approximateCoordinates: {
      latitude: 27.6900,
      longitude: 88.2000,
    },
    documentedFacts: {
      meteorologicalCause:
        'Moraine dam failure at the high-altitude South Lhonak glacial lake (~5,200 meters above sea level), triggered by lateral moraine collapse and compounded by intense localized cloudburst rainfall in the upper Teesta catchment.',
      peakPrecipitationOrIntensity:
        'Tens of millions of cubic meters of water emptied from the glacial lake within hours; downstream river discharge surged by over 15 to 20 meters above normal levels at speeds exceeding 50 km/h.',
      officialImpactSummary:
        'The surging torrent completely breached and washed away the 1,200 MW Teesta-III Hydroelectric Project dam at Chungthang in minutes. Bridges along NH-10 collapsed, severing land transit between Sikkim and West Bengal. Military cantonments at Bardang were washed away.',
      documentedCasualtiesEstimate:
        'During initial search operations in October 2023, authorities reported over 100 casualties and missing persons, including 22 Indian Army personnel lost at Bardang (1 of 23 swept away was rescued alive). The official joint Government of Sikkim and NDMA Post-Disaster Needs Assessment (PDNA, 2024) confirmed a baseline toll of 55 lives lost, with over 70 individuals remaining untraced in downstream river reaches.',
      inundationAndDisplacement:
        'Approximately 88,000 citizens were directly affected across four mountainous districts (Mangan, Gangtok, Pakyong, Namchi); over 2,500 tourists marooned in high-altitude Lachen and Lachung valleys were evacuated by Indian Air Force helicopter airlifts and army rescue teams.',
    },
    responseMeasures: [
      'Indian Army, Indo-Tibetan Border Police (ITBP), SDRF, and NDRF carried out dangerous high-angle ropeway rescues across raging torrents.',
      'Indian Air Force launched helicopter airlifts (Mi-17 and Chinook) to evacuate stranded tourists and drop emergency medical payloads once cloud cover lifted.',
      'Emergency satellite internet terminals were air-dropped to establish incident communication hubs in cut-off valleys.',
    ],
    lessonsLearned: [
      'Extreme velocity of GLOF surges: Flash floods travel down narrow Himalayan valleys with zero warning for downstream settlements, demanding automated early warning water level sensors.',
      'Need for autonomous UAV relief: When mountain highways and bridges are erased, vertical drone delivery becomes the sole method to deliver plasma, insulin, and potable water.',
      'Satellite and SAR monitoring: Emphasized regular satellite synthetic aperture radar tracking of glacial lake surface area expansion in high-altitude permafrost zones.',
    ],
    sources: [
      {
        id: 'src_ndma_sikkim_2023',
        title: 'Official Status Bulletin on South Lhonak Lake GLOF & Teesta Basin Disaster',
        agency: 'National Disaster Management Authority (NDMA)',
        reportReference: 'NDMA Special Incident Bulletin No. GLOF-SKM-01',
        publicationYear: 2023,
        url: 'https://ndma.gov.in',
        isExternalGovernmentLink: true,
      },
      {
        id: 'src_cwc_teesta',
        title: 'Teesta Basin Hydrograph and Chungthang Dam Outflow Analysis',
        agency: 'Central Water Commission (CWC)',
        reportReference: 'CWC Hydrological Studies Division Report',
        publicationYear: 2023,
        url: 'https://cwc.gov.in',
        isExternalGovernmentLink: true,
      },
      {
        id: 'src_ssdma_glof',
        title: 'Post-Disaster Needs Assessment (PDNA) Sikkim Glacial Lake Outburst Flood (GLOF)',
        agency: 'Sikkim State Disaster Management Authority (SSDMA)',
        reportReference: 'Joint Assessment Report of Government of Sikkim (SSDMA) & NDMA (2024)',
        publicationYear: 2024,
        url: 'https://ssdma.nic.in',
        isExternalGovernmentLink: true,
      },
    ],
    isVerifiedOfficialRecord: true,
  },
  {
    id: 'disaster_michaung_2023',
    title: '2023 Severe Cyclonic Storm Michaung (Coromandel Coast)',
    disasterType: 'cyclone',
    year: 2023,
    dateRange: 'December 3 – 6, 2023 (Landfall: December 5 at Bapatla)',
    stateRegion: 'Tamil Nadu & Coastal Andhra Pradesh',
    affectedRegions: ['Chennai', 'Tiruvallur', 'Chengalpattu', 'Bapatla', 'Nellore'],
    approximateCoordinates: {
      latitude: 15.9042,
      longitude: 80.4674,
    },
    documentedFacts: {
      meteorologicalCause:
        'Severe Cyclonic Storm "Michaung" formed in the Southwest Bay of Bengal, tracked northward parallel to the north Tamil Nadu coast, and stalled ~90 km east-northeast of Chennai for over 16 hours before making landfall near Bapatla in Andhra Pradesh with sustained surface winds of 90–100 km/h and gusts to 110 km/h.',
      peakPrecipitationOrIntensity:
        'Chennai metropolitan region recorded intense rainfall on December 3–4, 2023: Perungudi recorded a 24-hour peak of 290 mm and Meenambakkam recorded 240 mm, with 48-hour cumulative totals reaching 450–470 mm across northern suburban stations in Tiruvallur district.',
      officialImpactSummary:
        'Widespread inundation of industrial hubs, transport terminals, and residential suburbs in Chennai (Velachery, Tambaram, Perumbakkam, Manali). Storm surge flooded coastal fishing settlements and standing crops across coastal Andhra Pradesh.',
      documentedCasualtiesEstimate:
        'State disaster management authorities documented 17 storm-related fatalities in Tamil Nadu. Timely pre-emptive evacuation to designated relief camps—32,158 people in Tamil Nadu and 9,454 people in Andhra Pradesh (combined total of 41,612 evacuees)—prevented catastrophic loss of life at landfall.',
      inundationAndDisplacement:
        'Over 41,600 evacuees were sheltered in government relief centers across Tamil Nadu and Andhra Pradesh. Severe inundation disrupted over 350,000 MSME industrial and manufacturing units in Chennai’s industrial corridors; Chennai airport flight operations and suburban railway services were suspended for 48 hours.',
    },
    responseMeasures: [
      'Tamil Nadu State Disaster Management Authority and APSDMA deployed thousands of civic workers, tractor-mounted pumps, and mobile healthcare teams.',
      'NDRF and SDRF conducted rescue operations in inundated low-lying residential sectors using motorized boats.',
      'Community kitchens established by municipal authorities served over 1.5 million meals during the height of the storm.',
    ],
    lessonsLearned: [
      'Compounding hazards of cyclonic stalling: When a cyclonic storm stalls adjacent to a coastal metropolis, gale-force winds coincide with continuous torrential rainfall, paralyzing surface transport.',
      'Citizen status tracking transparency: Transparent digital status tracking provides essential psychological assurance to marooned citizens, preventing panicked saturation of 112 emergency phone lines.',
      'Decentralized relief staging: Emphasized pre-positioning water, rations, and generators in elevated municipal wards prior to cyclone landfall.',
    ],
    sources: [
      {
        id: 'src_imd_michaung',
        title: 'Severe Cyclonic Storm "MICHAUNG" over Southwest Bay of Bengal: A Preliminary Report',
        agency: 'India Meteorological Department (IMD)',
        reportReference: 'RSMC Cyclone Warning Division Monograph No. 23/2023',
        publicationYear: 2023,
        url: 'https://rsmcnewdelhi.imd.gov.in',
        isExternalGovernmentLink: true,
      },
      {
        id: 'src_tnsdma_michaung',
        title: 'Tamil Nadu Comprehensive Response Operations Review for Cyclone Michaung',
        agency: 'Tamil Nadu State Disaster Management Authority (TNSDMA)',
        reportReference: 'TNSDMA Relief & Rehabilitation Directorate Record',
        publicationYear: 2024,
        url: 'https://tnsdma.tn.gov.in',
        isExternalGovernmentLink: true,
      },
      {
        id: 'src_moes_cyclone',
        title: 'Ministry of Earth Sciences Cyclone Michaung Track & Precipitation Verification',
        agency: 'Ministry of Earth Sciences (MoES)',
        reportReference: 'Press Information Bureau Government of India Notification',
        publicationYear: 2023,
        url: 'https://moes.gov.in',
        isExternalGovernmentLink: true,
      },
    ],
    isVerifiedOfficialRecord: true,
  },
];

/**
 * Pure filter function for historical disaster records.
 */
export function filterDisasterRecords(
  records: HistoricalDisasterRecord[],
  filters: DisasterHistoryFilters
): HistoricalDisasterRecord[] {
  const { searchQuery, disasterType, year } = filters;
  const q = searchQuery.toLowerCase().trim();

  return records.filter((rec) => {
    // Type filter
    if (disasterType !== 'all' && rec.disasterType !== disasterType) {
      return false;
    }

    // Year filter
    if (year !== 'all' && String(rec.year) !== year) {
      return false;
    }

    // Text search filter
    if (q) {
      const matchTitle = rec.title.toLowerCase().includes(q);
      const matchState = rec.stateRegion.toLowerCase().includes(q);
      const matchRegions = rec.affectedRegions.some((r) => r.toLowerCase().includes(q));
      const matchCause = rec.documentedFacts.meteorologicalCause.toLowerCase().includes(q);
      if (!matchTitle && !matchState && !matchRegions && !matchCause) {
        return false;
      }
    }

    return true;
  });
}

