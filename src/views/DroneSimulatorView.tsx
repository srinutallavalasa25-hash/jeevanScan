// ==============================================================================
// JEEVASCAN AI — DRONE RESCUE SIMULATOR VIEW
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Phase 11 — Tactical drone mission coordination and simulated flight execution
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Play,
  XCircle,
  Check,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type { IncidentRecord } from '../types/database';
import type {
  SimulatedDroneMission,
  DronePayloadCategory,
} from '../types/phase11';
import { backend } from '../lib/supabase';
import {
  DEMO_DRONE_BASES,
  PAYLOAD_SPECIFICATIONS,
  createDraftDroneMission,
  approveAndLaunchSimulation,
  advanceSimulationStep,
  cancelSimulatedMission,
  listSimulatedMissions,
} from '../lib/drone/droneSimulatorEngine';
import { RescueMap } from '../components/RescueMap';
import { isValidCoordinate } from '../lib/map/mapUtils';

interface DroneSimulatorViewProps {
  t: TranslationDict;
  onNavigate: (view: NavView) => void;
  initialSelectedSosId?: string | null;
}

export const DroneSimulatorView: React.FC<DroneSimulatorViewProps> = ({
  t,
  onNavigate,
  initialSelectedSosId = null,
}) => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(initialSelectedSosId);
  const [selectedBaseId, setSelectedBaseId] = useState<string>(DEMO_DRONE_BASES[0].id);
  const [selectedPayload, setSelectedPayload] = useState<DronePayloadCategory>('drinking_water');
  const [activeMission, setActiveMission] = useState<SimulatedDroneMission | null>(null);
  const [_missionList, setMissionList] = useState<SimulatedDroneMission[]>(() => listSimulatedMissions());
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    backend
      .fetchIncidents()
      .then((data) => {
        setIncidents(data);
        if (!selectedIncidentId && data.length > 0) {
          setSelectedIncidentId(data[0].sos_id);
        }
      })
      .catch((err) => {
        console.warn('Error loading incidents for drone simulator:', err);
      });
  }, [selectedIncidentId]);

  const selectedIncident = useMemo(() => {
    return incidents.find((i) => i.sos_id === selectedIncidentId) || null;
  }, [incidents, selectedIncidentId]);

  const selectedBase = useMemo(() => {
    return DEMO_DRONE_BASES.find((b) => b.id === selectedBaseId) || DEMO_DRONE_BASES[0];
  }, [selectedBaseId]);

  // Handle draft mission creation
  const handleCreateDraft = () => {
    if (!selectedIncident) return;
    try {
      const mission = createDraftDroneMission(selectedIncident, selectedBase, selectedPayload);
      setActiveMission(mission);
      setMissionList(listSimulatedMissions());
      setActionMessage(`Draft mission ${mission.missionCode} created. Awaiting operator approval.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating draft mission';
      setActionMessage(`Error: ${msg}`);
    }
  };

  // Handle human operator approval & launch
  const handleApproveFlight = () => {
    if (!activeMission) return;
    try {
      const launched = approveAndLaunchSimulation(activeMission.id, 'Operator approved for simulation exercise');
      setActiveMission(launched);
      setMissionList(listSimulatedMissions());
      setActionMessage(`Simulated mission ${launched.missionCode} approved and launched.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      setActionMessage(`Approval Error: ${msg}`);
    }
  };

  // Handle flight progression step
  const handleAdvanceFlight = () => {
    if (!activeMission || activeMission.status !== 'in_progress') return;
    try {
      const nextStep = advanceSimulationStep(activeMission.id, 25);
      setActiveMission(nextStep);
      setMissionList(listSimulatedMissions());
      if (nextStep.status === 'completed') {
        setActionMessage(`Simulated mission ${nextStep.missionCode} successfully reached target coordinates. Payload released (Simulation).`);
      } else {
        setActionMessage(`Simulated flight advanced to ${nextStep.progressPercent}% along flight vector.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error advancing flight';
      setActionMessage(`Simulation Error: ${msg}`);
    }
  };

  // Handle mission cancellation
  const handleCancelMission = () => {
    if (!activeMission) return;
    try {
      const cancelled = cancelSimulatedMission(activeMission.id, 'Operator cancelled simulation');
      setActiveMission(cancelled);
      setMissionList(listSimulatedMissions());
      setActionMessage(`Simulated mission ${cancelled.missionCode} cancelled.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cancelling mission';
      setActionMessage(`Cancellation Error: ${msg}`);
    }
  };

  // Drone flight vector for map projection
  const simulatedDroneVector = useMemo(() => {
    if (!activeMission) return null;
    return {
      base: { lat: activeMission.baseStation.latitude, lng: activeMission.baseStation.longitude, name: activeMission.baseStation.name },
      target: { lat: activeMission.targetLocation.latitude, lng: activeMission.targetLocation.longitude, name: activeMission.targetLocation.name || 'Target' },
      droneProgressPercent: activeMission.progressPercent,
    };
  }, [activeMission]);

  const targetCoordsValid = selectedIncident
    ? isValidCoordinate(selectedIncident.latitude, selectedIncident.longitude)
    : false;

  return (
    <div className="container" style={{ padding: '1.5rem 1rem 4rem', maxWidth: '1440px' }}>
      {/* 1. HEADER & MANDATORY SIMULATION NOTICE */}
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
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
                {t.drone.pageTitle || 'Tactical Drone Rescue Simulator'}
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                {t.drone.pageSubtitle || 'Simulate UAV relief airdrops, straight-line flight vectors, and operator approvals.'}
              </p>
            </div>
          </div>

          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#D97706',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            DEMO SIMULATION — NO DRONE DEPLOYED
          </span>
        </div>

        {/* Mandatory Simulation Notice Banner */}
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
            <strong>Simulation Guardrail:</strong> All flight vectors, telemetry, and payload releases are simulated software demonstrations. No physical drones are connected, controlled, or dispatched. Actual emergency incidents remain unaffected.
          </span>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          style={{
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.3)',
            color: '#0284C7',
            fontSize: '0.775rem',
            marginBottom: '1rem',
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* 2. SIMULATOR SPLIT-SCREEN WORKSPACE */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 440px) 1fr',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Mission Setup, Controls, & Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Mission Configuration Card */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-medium)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--color-navy)' }}>
              1. Simulated Mission Parameters
            </h3>

            {/* Target Incident Selector */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Target SOS Incident
              </label>
              <select
                value={selectedIncidentId || ''}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.8rem' }}
              >
                {incidents.map((i) => (
                  <option key={i.sos_id} value={i.sos_id}>
                    {i.sos_id.slice(0, 8)} ({i.emergency_type} - {i.priority.toUpperCase()})
                  </option>
                ))}
              </select>

              {!targetCoordsValid && (
                <span style={{ fontSize: '0.7rem', color: '#DC2626', display: 'block', marginTop: '0.25rem' }}>
                  Warning: Selected incident lacks valid GPS coordinates. Cannot fly.
                </span>
              )}
            </div>

            {/* Drone Base Station Selector */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Drone Launch Staging Base
              </label>
              <select
                value={selectedBaseId}
                onChange={(e) => setSelectedBaseId(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.8rem' }}
              >
                {DEMO_DRONE_BASES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Max: {b.maxPayloadKg} kg)
                  </option>
                ))}
              </select>
            </div>

            {/* Payload Category Selector */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Airdrop Payload Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem' }}>
                {(Object.keys(PAYLOAD_SPECIFICATIONS) as DronePayloadCategory[]).map((cat) => {
                  const spec = PAYLOAD_SPECIFICATIONS[cat];
                  const isSelected = selectedPayload === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedPayload(cat)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${isSelected ? '#D97706' : 'var(--border-subtle)'}`,
                        backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.08)' : '#FAFCFF',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.725rem',
                      }}
                    >
                      <strong style={{ display: 'block', color: isSelected ? '#D97706' : 'var(--color-navy)' }}>
                        {spec.name}
                      </strong>
                      <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>{spec.weightKg} kg</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Create Draft Mission Button */}
            <button
              onClick={handleCreateDraft}
              disabled={!targetCoordsValid}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.825rem',
                backgroundColor: targetCoordsValid ? '#102A43' : '#94A3B8',
                cursor: targetCoordsValid ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <Radio size={16} />
              <span>Initialize Simulated Mission</span>
            </button>
          </div>

          {/* Active Mission Controls & Pre-Flight Constraints */}
          {activeMission && (
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid rgba(245, 158, 11, 0.3)',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-navy)' }}>
                    {activeMission.missionCode}
                  </strong>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block' }}>
                    Status: <strong style={{ textTransform: 'uppercase', color: '#D97706' }}>{activeMission.status.replace('_', ' ')}</strong>
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(2, 132, 199, 0.1)',
                    color: '#0284C7',
                  }}
                >
                  {activeMission.distanceKm} km flight
                </span>
              </div>

              {/* Pre-Flight Checklist */}
              <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem', fontSize: '0.725rem' }}>
                <strong style={{ display: 'block', color: 'var(--color-navy)', marginBottom: '0.35rem' }}>
                  Pre-Flight Safety Checklist:
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={13} color="#059669" />
                    <span>Simulated Wind: {activeMission.flightConstraints.currentWindKph} km/h (Limit: 35 km/h)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={13} color="#059669" />
                    <span>Payload: {activeMission.payloadWeightKg} kg (Capacity: {activeMission.flightConstraints.maxPayloadKg} kg)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={13} color="#059669" />
                    <span>Target Coordinates: Validated</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {activeMission.flightConstraints.operatorApproved ? (
                      <CheckCircle2 size={13} color="#059669" />
                    ) : (
                      <AlertTriangle size={13} color="#D97706" />
                    )}
                    <span>Human Operator Authorization: {activeMission.flightConstraints.operatorApproved ? 'CONFIRMED' : 'AWAITING APPROVAL'}</span>
                  </div>
                </div>
              </div>

              {/* Live Telemetry Display (If in progress or completed) */}
              {activeMission.telemetry && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-navy)' }}>Simulated Flight Progress:</span>
                    <strong style={{ color: '#0D9488' }}>{activeMission.progressPercent}%</strong>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#E2E8F0', overflow: 'hidden', marginBottom: '0.65rem' }}>
                    <div style={{ height: '100%', width: `${activeMission.progressPercent}%`, backgroundColor: '#0D9488', transition: 'width 0.3s ease-out' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', fontSize: '0.7rem', textAlign: 'center' }}>
                    <div style={{ padding: '4px', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Altitude</span>
                      <strong>{activeMission.telemetry.altitudeMeters.toFixed(0)}m</strong>
                    </div>
                    <div style={{ padding: '4px', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Speed</span>
                      <strong>{activeMission.telemetry.speedMps} m/s</strong>
                    </div>
                    <div style={{ padding: '4px', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Battery</span>
                      <strong>{activeMission.telemetry.batteryPercent}%</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(activeMission.status === 'draft' || activeMission.status === 'awaiting_approval') && (
                  <button
                    onClick={handleApproveFlight}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '0.775rem',
                      backgroundColor: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Check size={14} />
                    <span>Approve Simulated Flight</span>
                  </button>
                )}

                {activeMission.status === 'in_progress' && (
                  <button
                    onClick={handleAdvanceFlight}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '0.775rem',
                      backgroundColor: '#0284C7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Play size={14} />
                    <span>Advance Flight (+25%)</span>
                  </button>
                )}

                {activeMission.status !== 'completed' && activeMission.status !== 'cancelled' && (
                  <button
                    onClick={handleCancelMission}
                    className="btn"
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.775rem',
                      backgroundColor: 'transparent',
                      color: '#DC2626',
                      border: '1px solid #DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <XCircle size={14} />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Map with Drone Flight Vector */}
        <div style={{ height: '620px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-medium)', position: 'relative' }}>
          <RescueMap
            t={t}
            incidents={incidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(inc) => {
              if (inc) setSelectedIncidentId(inc.sos_id);
            }}
            simulatedDroneVector={simulatedDroneVector}
          />
        </div>
      </div>
    </div>
  );
};
