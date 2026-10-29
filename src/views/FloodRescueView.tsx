// ==============================================================================
// JEEVASCAN AI — FLOOD RESCUE MODE VIEW
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Phase 12 — Dedicated high-water crisis triage and boat rescue coordination
// ==============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Waves,
  ShieldAlert,
  ArrowLeft,
  Search,
  Droplets,
  Activity,
  Radio,
  Map as MapIcon,
  Package,
  Building2,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type { IncidentRecord, LocationUpdateRecord } from '../types/database';
import { backend, DEMO_SHELTERS } from '../lib/supabase';
import { findNearestShelter, isValidCoordinate } from '../lib/map/mapUtils';

interface FloodRescueViewProps {
  t: TranslationDict;
  onNavigate: (view: NavView) => void;
  initialSelectedSosId?: string | null;
}

export const FloodRescueView: React.FC<FloodRescueViewProps> = ({
  t,
  onNavigate,
  initialSelectedSosId = null,
}) => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [liveLocationsMap, setLiveLocationsMap] = useState<Record<string, LocationUpdateRecord>>({});
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(initialSelectedSosId);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadLocationUpdates = useCallback(async (list: IncidentRecord[]) => {
    const map: Record<string, LocationUpdateRecord> = {};
    await Promise.all(
      list.map(async (inc) => {
        try {
          const updates = await backend.fetchLocationUpdates(inc.sos_id);
          if (updates.length > 0) {
            map[inc.sos_id] = updates[0];
          }
        } catch {
          // ignore
        }
      })
    );
    setLiveLocationsMap(map);
  }, []);

  useEffect(() => {
    let ignore = false;
    backend.fetchIncidents().then((list) => {
      if (!ignore) {
        // Filter flood-specific incidents or all if testing
        const floodList = list.filter((i) => i.emergency_type === 'flood');
        setIncidents(floodList.length > 0 ? floodList : list);
        if (!selectedIncidentId && list.length > 0) {
          setSelectedIncidentId(floodList.length > 0 ? floodList[0].sos_id : list[0].sos_id);
        }
        void loadLocationUpdates(list);
      }
    });

    return () => {
      ignore = true;
    };
  }, [selectedIncidentId, loadLocationUpdates]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (severityFilter !== 'all' && inc.priority !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mId = inc.sos_id.toLowerCase().includes(q);
        const mDesc = inc.description?.toLowerCase().includes(q);
        const mLandmark = inc.location_name?.toLowerCase().includes(q);
        if (!mId && !mDesc && !mLandmark) return false;
      }
      return true;
    });
  }, [incidents, severityFilter, searchQuery]);

  const selectedIncident = useMemo(() => {
    return incidents.find((i) => i.sos_id === selectedIncidentId) || null;
  }, [incidents, selectedIncidentId]);

  const nearestShelter = useMemo(() => {
    if (!selectedIncident || !isValidCoordinate(selectedIncident.latitude, selectedIncident.longitude)) {
      return null;
    }
    const live = liveLocationsMap[selectedIncident.sos_id];
    const srcLat = live && isValidCoordinate(live.latitude, live.longitude) ? live.latitude : selectedIncident.latitude;
    const srcLng = live && isValidCoordinate(live.latitude, live.longitude) ? live.longitude : selectedIncident.longitude;
    return findNearestShelter(srcLat, srcLng, DEMO_SHELTERS);
  }, [selectedIncident, liveLocationsMap]);

  // Extract water level observation from text heuristic
  const waterLevelObservation = useMemo(() => {
    if (!selectedIncident) return 'Observation not specified';
    const text = (selectedIncident.description || '').toLowerCase();
    if (text.includes('neck') || text.includes('chest') || text.includes('roof')) return 'Critical: Chest-deep / Rooftop Inundation';
    if (text.includes('waist')) return 'High: Waist-deep Water Inundation';
    if (text.includes('knee')) return 'Moderate: Knee-deep Standing Water';
    if (text.includes('ankle') || text.includes('rising')) return 'Developing: Rising Ankle-deep Water';
    return 'Reported flood emergency (Exact depth unconfirmed)';
  }, [selectedIncident]);

  const hasVulnerable = useMemo(() => {
    if (!selectedIncident) return false;
    const text = (selectedIncident.description || '').toLowerCase();
    return /\b(infant|baby|elderly|old|bedridden|grandmother|pregnant|children)\b/i.test(text);
  }, [selectedIncident]);

  return (
    <div className="container" style={{ padding: '1.5rem 1rem 4rem', maxWidth: '1440px' }}>
      {/* 1. HEADER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          onClick={() => onNavigate('home')}
          className="btn"
          style={{
            padding: '4px 8px',
            fontSize: '0.75rem',
            marginBottom: '0.65rem',
            backgroundColor: 'transparent',
            color: 'var(--color-navy)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} />
          <span>{t.nav.home || 'Home'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Waves size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
                {t.flood.pageTitle || 'Flood Rescue Mode'}
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                {t.flood.pageSubtitle || 'Specialized high-water response environment for stranded citizens, rooftop triage, and shallow-draft evacuation.'}
              </p>
            </div>
          </div>

          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              color: '#0284C7',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            Tactical Inundation Monitor
          </span>
        </div>

        {/* Mandatory Water Safety Alert */}
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            fontSize: '0.775rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            lineHeight: 1.4,
          }}
        >
          <ShieldAlert size={16} style={{ flexShrink: 0, color: '#D97706' }} />
          <span>
            <strong>Flood Transit Notice:</strong> All evacuation vectors represent geodesic straight-line distance to designated dry elevated shelters. They are NOT certified safe road corridors. Never attempt to drive or walk through flood currents exceeding ankle depth without rescue craft.
          </span>
        </div>
      </div>

      {/* 2. SPLIT WORKSPACE */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 420px) 1fr',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Flood Incident Feed */}
        <div
          className="glass-panel"
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-medium)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-navy)' }}>
              Flood SOS Reports ({filteredIncidents.length})
            </h3>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Live & Demo Telemetry
            </span>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter by SOS ID, landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: '32px', fontSize: '0.775rem' }}
            />
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="input-field"
            style={{ width: '100%', fontSize: '0.775rem', marginBottom: '0.85rem' }}
          >
            <option value="all">All Flood Severities</option>
            <option value="critical">Critical / Rooftop Submerged</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
          </select>

          {/* Incidents Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '560px', overflowY: 'auto' }}>
            {filteredIncidents.map((inc) => {
              const isSelected = inc.sos_id === selectedIncidentId;
              const isCritical = inc.priority === 'critical';
              const live = liveLocationsMap[inc.sos_id];

              return (
                <div
                  key={inc.sos_id}
                  onClick={() => setSelectedIncidentId(inc.sos_id)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${isSelected ? '#0284C7' : 'var(--border-subtle)'}`,
                    backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.06)' : '#FAFCFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-out',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Droplets size={14} color={isCritical ? '#DC2626' : '#0284C7'} />
                      <strong style={{ fontSize: '0.825rem', color: isSelected ? '#0284C7' : 'var(--color-navy)' }}>
                        {inc.sos_id.slice(0, 8)}
                      </strong>
                    </div>

                    <span
                      style={{
                        fontSize: '0.675rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: isCritical ? 'rgba(220, 38, 38, 0.12)' : 'rgba(234, 88, 12, 0.12)',
                        color: isCritical ? '#DC2626' : '#EA580C',
                      }}
                    >
                      {inc.priority.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                    {inc.description ? inc.description.slice(0, 75) + '...' : 'Flooded premises reported'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>{inc.location_name || 'Landmark unspecified'}</span>
                    {live ? (
                      <span style={{ color: '#0D9488', fontWeight: 600 }}>Live GPS Active</span>
                    ) : (
                      <span>Snapshot Only</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Flood Triage & Evacuation Panel */}
        <div>
          {selectedIncident ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Incident High-Water Summary Card */}
              <div
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--border-medium)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                      Flood Incident Triage: {selectedIncident.sos_id}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Reported: {new Date(selectedIncident.created_at).toLocaleTimeString()} • Status: <strong style={{ textTransform: 'uppercase' }}>{selectedIncident.status}</strong>
                    </span>
                  </div>

                  {hasVulnerable && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        border: '1px solid #FECACA',
                      }}
                    >
                      High-Vulnerability Occupants Reported
                    </span>
                  )}
                </div>

                {/* Flood Water Observations */}
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(2, 132, 199, 0.05)',
                    border: '1px solid rgba(2, 132, 199, 0.2)',
                    marginBottom: '0.85rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <strong style={{ color: '#0284C7', display: 'block', marginBottom: '0.2rem' }}>
                    Observed Water Level:
                  </strong>
                  <span>{waterLevelObservation}</span>
                </div>

                {/* Situation Description */}
                <div style={{ fontSize: '0.8rem', marginBottom: '0.85rem' }}>
                  <strong style={{ display: 'block', color: 'var(--color-navy)', marginBottom: '0.2rem' }}>
                    Citizen Situation Report:
                  </strong>
                  <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    {selectedIncident.description || 'No situation report provided.'}
                  </p>
                </div>

                {/* Coordinates & Accuracy Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Original SOS Coordinates</span>
                    <strong>
                      {isValidCoordinate(selectedIncident.latitude, selectedIncident.longitude)
                        ? `${selectedIncident.latitude?.toFixed(5)}° N, ${selectedIncident.longitude?.toFixed(5)}° E`
                        : 'None reported'}
                    </strong>
                  </div>

                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Reported Landmark</span>
                    <strong>{selectedIncident.location_name || 'None specified'}</strong>
                  </div>
                </div>

                {/* Action Buttons & Cross-Feature Links */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <button
                    onClick={() => onNavigate('rescue-map')}
                    className="btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.775rem',
                      backgroundColor: '#102A43',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <MapIcon size={14} color="#38BDF8" />
                    <span>View on Rescue Map</span>
                  </button>

                  <button
                    onClick={() => onNavigate('casualty-review')}
                    className="btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.775rem',
                      backgroundColor: 'rgba(13, 148, 136, 0.1)',
                      color: '#0D9488',
                      border: '1px solid rgba(13, 148, 136, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Activity size={14} />
                    <span>AI Review & Hazards</span>
                  </button>

                  <button
                    onClick={() => onNavigate('drone-simulator')}
                    className="btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.775rem',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      color: '#D97706',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Radio size={14} />
                    <span>Simulate Drone Delivery</span>
                  </button>

                  <button
                    onClick={() => onNavigate('jeeva-drop')}
                    className="btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.775rem',
                      backgroundColor: '#0284C7',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Package size={14} />
                    <span>Request Relief Supplies</span>
                  </button>
                </div>
              </div>

              {/* Nearest Elevated Shelter Evacuation Information Panel */}
              {nearestShelter && (
                <div
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(5, 150, 105, 0.3)',
                    backgroundColor: 'rgba(5, 150, 105, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#059669', fontWeight: 700 }}>
                      <Building2 size={18} />
                      <span style={{ fontSize: '0.95rem' }}>Nearest Elevated Dry Shelter</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                      {nearestShelter.distanceKm.toFixed(2)} km direct distance
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-navy)', fontSize: '0.9rem' }}>
                    {nearestShelter.shelter.name}
                  </h4>
                  <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Designated dry reception center • Current capacity: {nearestShelter.shelter.capacity} persons
                  </p>

                  <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', color: '#92400e', fontSize: '0.725rem', lineHeight: 1.35 }}>
                    <strong>Evacuation Notice:</strong> Route indicates direct line displacement to safe elevated dry ground. Flood currents and submerged obstacles may require boat assistance. Contact emergency boat rescue teams before attempting passage.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="glass-panel"
              style={{
                padding: '3rem 1.5rem',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <Waves size={32} style={{ margin: '0 auto 0.75rem', color: '#0284C7', opacity: 0.7 }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-navy)' }}>No Flood Incident Selected</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Select a reported high-water emergency from the left panel to inspect observations and shelter vectors.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
