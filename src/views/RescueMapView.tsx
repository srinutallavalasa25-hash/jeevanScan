import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Map as MapIcon,
  Search,
  ShieldAlert,
  Navigation,
  CheckCircle2,
  Building2,
  Truck,
  RotateCcw,
  Route,
  Crosshair,
  CheckCheck,
  Activity,
  Radio,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type { IncidentRecord, ShelterRecord, LocationUpdateRecord, IncidentStatus } from '../types/database';
import { backend, DEMO_SHELTERS } from '../lib/supabase';
import { RescueMap } from '../components/RescueMap';
import { getCitizenToken } from '../lib/location/liveLocationManager';
import { filterIncidents, findNearestShelter } from '../lib/map/mapUtils';

interface RescueMapViewProps {
  t: TranslationDict;
  onNavigate: (view: NavView) => void;
  initialSelectedSosId?: string | null;
}

export const RescueMapView: React.FC<RescueMapViewProps> = ({
  t,
  onNavigate: _onNavigate,
  initialSelectedSosId = null,
}) => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [shelters, setShelters] = useState<ShelterRecord[]>(DEMO_SHELTERS);
  const [liveLocationsMap, setLiveLocationsMap] = useState<Record<string, LocationUpdateRecord>>({});
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(initialSelectedSosId);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Evacuation route simulation toggle
  const [showEvacRoute, setShowEvacRoute] = useState<boolean>(false);

  // Load telemetry updates for all incidents using authorized scoped adapter
  const loadLocationUpdates = useCallback(async (list: IncidentRecord[]) => {
    const map: Record<string, LocationUpdateRecord> = {};
    await Promise.all(
      list.map(async (inc) => {
        try {
          const citizenToken = getCitizenToken(inc.sos_id) || inc.update_token_hash;
          const updates = await backend.fetchLocationUpdates(inc.sos_id, citizenToken);
          if (updates.length > 0) {
            map[inc.sos_id] = updates[0];
          }
        } catch {
          // ignore error to keep map operational
        }
      })
    );
    setLiveLocationsMap(map);
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.all([backend.fetchIncidents(), backend.fetchShelters()])
      .then(([incidentData, shelterData]) => {
        if (!ignore) {
          setIncidents(incidentData);
          setShelters(shelterData.length > 0 ? shelterData : DEMO_SHELTERS);
          void loadLocationUpdates(incidentData);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.warn('Error fetching crisis map data:', err);
        }
      });

    const handleLocationUpdate = () => {
      backend.fetchIncidents().then((list) => {
        if (!ignore) {
          setIncidents(list);
          void loadLocationUpdates(list);
        }
      });
    };

    window.addEventListener('jeevascan:location_sharing_updated', handleLocationUpdate);
    return () => {
      ignore = true;
      window.removeEventListener('jeevascan:location_sharing_updated', handleLocationUpdate);
    };
  }, [loadLocationUpdates]);

  // Filtered incidents calculation
  const filteredIncidents = useMemo(() => {
    return filterIncidents(incidents, {
      priority: selectedPriority,
      status: selectedStatus,
      category: selectedCategory,
      searchQuery,
    });
  }, [incidents, selectedPriority, selectedStatus, selectedCategory, searchQuery]);

  // Selected incident reference
  const selectedIncident = useMemo(
    () => incidents.find((i) => i.sos_id === selectedIncidentId) || null,
    [incidents, selectedIncidentId]
  );

  // Nearest shelter calculation for selected incident
  const nearestShelter = useMemo<{ shelter: ShelterRecord; distanceKm: number } | null>(() => {
    if (!selectedIncident) return null;
    const live = liveLocationsMap[selectedIncident.sos_id];
    const srcLat = live && typeof live.latitude === 'number' ? live.latitude : selectedIncident.latitude;
    const srcLng = live && typeof live.longitude === 'number' ? live.longitude : selectedIncident.longitude;
    return findNearestShelter(srcLat, srcLng, shelters);
  }, [selectedIncident, shelters, liveLocationsMap]);

  // Status transition handler
  const handleUpdateStatus = async (newStatus: IncidentStatus) => {
    if (!selectedIncident) return;
    setActionMessage(null);
    try {
      const result = await backend.updateIncidentStatus(
        selectedIncident.sos_id,
        newStatus,
        `Status updated to ${newStatus} via Interactive Rescue Map`
      );
      if (result.success) {
        setActionMessage(t.map.actionUpdateSuccess);
        // Refresh incidents
        const updated = await backend.fetchIncidents();
        setIncidents(updated);
      } else {
        setActionMessage(result.message || 'Status update failed');
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Update failed');
    }
  };

  // Real dataset counts
  const totalCount = incidents.length;
  const criticalCount = incidents.filter((i) => i.priority === 'critical').length;
  const pendingCount = incidents.filter((i) => i.status === 'pending').length;
  const liveCount = Object.keys(liveLocationsMap).length;
  const sheltersTotal = shelters.length;

  return (
    <div className="container" style={{ padding: '1.5rem 1rem 4rem', maxWidth: '1440px' }}>
      {/* 1. HEADER & MANDATORY OPERATIONAL DISCLAIMER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
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
                <MapIcon size={22} />
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
                {t.map.pageTitle}
              </h1>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0 0' }}>
              {t.map.pageSubtitle}
            </p>
          </div>

          {/* Mode Badge */}
          <div>
            <span
              className="badge"
              style={{
                fontSize: '0.75rem',
                padding: '6px 12px',
                backgroundColor: backend.isConfigured ? 'rgba(5, 150, 105, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: backend.isConfigured ? '#059669' : '#D97706',
                border: `1px solid ${backend.isConfigured ? 'rgba(5, 150, 105, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              }}
            >
              {backend.isConfigured ? t.map.liveNotice : t.map.demoNotice}
            </span>
          </div>
        </div>

        {/* Mandatory Emergency Triage Disclaimer */}
        <div
          style={{
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
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
            <strong>Emergency Notice:</strong> {t.map.disclaimer}
          </span>
        </div>
      </div>

      {/* 2. REAL METRIC TILES */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block' }}>{t.map.totalIncidents}</span>
          <strong style={{ fontSize: '1.35rem', color: 'var(--color-navy)' }}>{totalCount}</strong>
        </div>

        <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '0.725rem', color: '#DC2626', display: 'block' }}>{t.map.criticalCount}</span>
          <strong style={{ fontSize: '1.35rem', color: '#DC2626' }}>{criticalCount}</strong>
        </div>

        <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '0.725rem', color: '#D97706', display: 'block' }}>{t.map.pendingCount}</span>
          <strong style={{ fontSize: '1.35rem', color: '#D97706' }}>{pendingCount}</strong>
        </div>

        <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '0.725rem', color: '#0D9488', display: 'block' }}>{t.map.liveTrackingCount}</span>
          <strong style={{ fontSize: '1.35rem', color: '#0D9488' }}>{liveCount}</strong>
        </div>

        <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '0.725rem', color: '#0284C7', display: 'block' }}>{t.map.sheltersCount}</span>
          <strong style={{ fontSize: '1.35rem', color: '#0284C7' }}>{sheltersTotal}</strong>
        </div>
      </div>

      {/* 3. SEARCH & TACTICAL FILTERS */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        {/* Keyword Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder={t.map.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem', width: '100%' }}
          />
        </div>

        {/* Priority Filter */}
        <select
          className="input-field"
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          style={{ flex: '0 1 150px', fontSize: '0.85rem' }}
        >
          <option value="all">{t.map.allPriorities}</option>
          <option value="critical">{t.map.priorityCritical}</option>
          <option value="high">{t.map.priorityHigh}</option>
          <option value="medium">{t.map.priorityMedium}</option>
          <option value="low">{t.map.priorityLow}</option>
        </select>

        {/* Status Filter */}
        <select
          className="input-field"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{ flex: '0 1 150px', fontSize: '0.85rem' }}
        >
          <option value="all">{t.map.allStatuses}</option>
          <option value="pending">{t.map.statusPending}</option>
          <option value="acknowledged">{t.map.statusAcknowledged}</option>
          <option value="dispatched">{t.map.statusDispatched}</option>
          <option value="resolved">{t.map.statusResolved}</option>
        </select>

        {/* Category Filter */}
        <select
          className="input-field"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ flex: '0 1 170px', fontSize: '0.85rem' }}
        >
          <option value="all">{t.map.allCategories}</option>
          <option value="flood">{t.sosForm.categories.flood}</option>
          <option value="trapped">{t.sosForm.categories.trapped}</option>
          <option value="medical">{t.sosForm.categories.medical}</option>
          <option value="fire">{t.sosForm.categories.fire}</option>
          <option value="building_collapse">{t.sosForm.categories.building_collapse}</option>
        </select>

        {/* Reset Filters */}
        {(selectedPriority !== 'all' || selectedStatus !== 'all' || selectedCategory !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedPriority('all');
              setSelectedStatus('all');
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="btn btn-outline"
            style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* 4. MAIN SPLIT INTERACTIVE WORKSPACE */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.35fr) minmax(320px, 0.95fr)',
          gap: '1.25rem',
          alignItems: 'start',
        }}
        className="rescue-map-split-grid"
      >
        {/* Left Column: Interactive Geospatial Rescue Map */}
        <div style={{ height: '620px', minHeight: '480px', position: 'relative' }}>
          <RescueMap
            t={t}
            incidents={filteredIncidents}
            shelters={shelters}
            liveLocationsMap={liveLocationsMap}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(inc) => setSelectedIncidentId(inc ? inc.sos_id : null)}
            onSelectShelter={(s) => {
              if (s) {
                alert(`Shelter: ${s.name}\nType: ${s.type}\nCapacity: ${s.current_occupancy}/${s.capacity}\nContact: ${s.contact_number || 'N/A'}`);
              }
            }}
            showEvacRoute={showEvacRoute}
          />
        </div>

        {/* Right Column: Tactical Rescue Coordination Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '620px', overflowY: 'auto' }}>
          {/* Selected Incident Detail Card */}
          {selectedIncident ? (
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--color-teal)',
                backgroundColor: '#FFFFFF',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: selectedIncident.priority === 'critical' ? '#FEE2E2' : '#FEF3C7',
                        color: selectedIncident.priority === 'critical' ? '#DC2626' : '#D97706',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedIncident.priority}
                    </span>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#F1F5F9',
                        color: 'var(--color-navy)',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                      }}
                    >
                      {selectedIncident.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-navy)', margin: '0.4rem 0 0 0' }}>
                    {t.sosForm.categories[selectedIncident.emergency_type] || selectedIncident.emergency_type}
                  </h3>
                  <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ID: {selectedIncident.sos_id}
                  </code>
                </div>

                <button
                  onClick={() => setSelectedIncidentId(null)}
                  className="btn btn-outline"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  {t.map.clearSelection}
                </button>
              </div>

              {actionMessage && (
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    border: '1px solid rgba(5, 150, 105, 0.3)',
                    color: '#059669',
                    fontSize: '0.775rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  {actionMessage}
                </div>
              )}

              {/* Coordinates Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.65rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#F8FAFC',
                  fontSize: '0.8rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.725rem' }}>
                    {t.map.originalLocationTitle}
                  </span>
                  <code style={{ fontWeight: 700, color: 'var(--color-navy)' }}>
                    {typeof selectedIncident.latitude === 'number'
                      ? `${selectedIncident.latitude.toFixed(4)}, ${selectedIncident.longitude?.toFixed(4)}`
                      : 'Unspecified'}
                  </code>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    ±{Math.round(selectedIncident.accuracy_meters || 15)}m
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.725rem' }}>
                    {t.map.latestLocationTitle}
                  </span>
                  {liveLocationsMap[selectedIncident.sos_id] ? (
                    (() => {
                      const live = liveLocationsMap[selectedIncident.sos_id];
                      return (
                        <>
                          <code style={{ fontWeight: 700, color: '#0D9488' }}>
                            {live.latitude.toFixed(4)}, {live.longitude.toFixed(4)}
                          </code>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#0D9488' }}>
                            ±{Math.round(live.accuracy_meters || 10)}m (Active)
                          </span>
                        </>
                      );
                    })()
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {t.liveLocation.noLiveUpdates}
                    </span>
                  )}
                </div>
              </div>

              {/* Situation & Landmark */}
              <div style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.2rem' }}>
                  {t.map.landmarkLabel}:
                </strong>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>
                  {selectedIncident.location_name || t.map.noLandmark}
                </p>

                <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.2rem' }}>
                  {t.map.descriptionLabel}:
                </strong>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {selectedIncident.description || 'No detailed situation report provided.'}
                </p>
              </div>

              {/* Nearest Shelter Evacuation Vector Card */}
              {nearestShelter && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(2, 132, 199, 0.06)',
                    border: '1px solid rgba(2, 132, 199, 0.25)',
                    marginBottom: '0.75rem',
                    fontSize: '0.775rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284C7', fontWeight: 700 }}>
                      <Building2 size={16} />
                      <span>{nearestShelter.shelter.name}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--color-navy)' }}>
                      {nearestShelter.distanceKm.toFixed(1)} km
                    </span>
                  </div>

                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {t.map.simulatedRouteNotice}
                  </p>

                  <button
                    onClick={() => setShowEvacRoute((v) => !v)}
                    className="btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: showEvacRoute ? '#0284C7' : '#FFFFFF',
                      color: showEvacRoute ? '#FFFFFF' : '#0284C7',
                      border: '1px solid #0284C7',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Route size={14} />
                    <span>{showEvacRoute ? t.map.hideRouteBtn : t.map.showRouteBtn}</span>
                  </button>
                </div>
              )}

              {/* Triage Status Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedIncident.status === 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus('acknowledged')}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#0284C7' }}
                  >
                    <CheckCheck size={14} />
                    <span>{t.map.actionAcknowledge}</span>
                  </button>
                )}

                {selectedIncident.status !== 'dispatched' && selectedIncident.status !== 'resolved' && (
                  <button
                    onClick={() => handleUpdateStatus('dispatched')}
                    className="btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      backgroundColor: '#EA580C',
                      color: '#FFFFFF',
                    }}
                  >
                    <Truck size={14} />
                    <span>{t.map.actionDispatch}</span>
                  </button>
                )}

                {selectedIncident.status !== 'resolved' && (
                  <button
                    onClick={() => handleUpdateStatus('resolved')}
                    className="btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{t.map.actionResolve}</span>
                  </button>
                )}
              </div>

              {/* Phase 11 Decision Support & Drone Sim Shortcuts */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px dashed var(--border-subtle)' }}>
                <button
                  onClick={() => _onNavigate('casualty-review')}
                  className="btn"
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(13, 148, 136, 0.1)',
                    color: '#0D9488',
                    border: '1px solid rgba(13, 148, 136, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  title="Run automated AI decision-support review"
                >
                  <Activity size={13} />
                  <span>AI Review</span>
                </button>

                <button
                  onClick={() => _onNavigate('drone-simulator')}
                  className="btn"
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    color: '#D97706',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  title="Simulate relief drone delivery mission"
                >
                  <Radio size={13} />
                  <span>Simulate Drone</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              <Crosshair size={32} style={{ margin: '0 auto 0.5rem auto', color: 'var(--color-teal)' }} />
              <strong style={{ display: 'block', color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
                {t.map.incidentDetails}
              </strong>
              <span>{t.map.selectIncidentPrompt}</span>
            </div>
          )}

          {/* Incident List Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '0.9rem', color: 'var(--color-navy)' }}>
              Filtered Incidents ({filteredIncidents.length})
            </strong>
          </div>

          {/* Incident List Cards */}
          {filteredIncidents.length === 0 ? (
            <div
              className="glass-panel"
              style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}
            >
              {t.map.noIncidentsFound}
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const isSelected = inc.sos_id === selectedIncidentId;
              const hasLive = Boolean(liveLocationsMap[inc.sos_id]);

              return (
                <div
                  key={`list-inc-${inc.sos_id}`}
                  onClick={() => setSelectedIncidentId(inc.sos_id)}
                  className="glass-panel"
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--color-teal)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, transform 0.15s',
                    backgroundColor: isSelected ? '#FFFFFF' : '#F8FAFC',
                    boxShadow: isSelected ? '0 4px 16px rgba(13, 148, 136, 0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor:
                            inc.priority === 'critical'
                              ? '#DC2626'
                              : inc.priority === 'high'
                              ? '#EA580C'
                              : '#2563EB',
                        }}
                      />
                      <strong style={{ fontSize: '0.85rem', color: 'var(--color-navy)' }}>
                        {t.sosForm.categories[inc.emergency_type] || inc.emergency_type}
                      </strong>
                    </div>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: inc.status === 'resolved' ? '#DCFCE7' : '#FEF3C7',
                        color: inc.status === 'resolved' ? '#166534' : '#92400E',
                      }}
                    >
                      {inc.status}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                    {inc.description?.slice(0, 85) || 'No description provided.'}
                    {inc.description && inc.description.length > 85 ? '...' : ''}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    <span>
                      {typeof inc.latitude === 'number'
                        ? `${inc.latitude.toFixed(3)}, ${inc.longitude?.toFixed(3)}`
                        : 'No GPS'}
                    </span>

                    {hasLive && (
                      <span style={{ color: '#0D9488', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Navigation size={12} />
                        <span>Live Telemetry</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
