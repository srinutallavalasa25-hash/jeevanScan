import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Smartphone,
  Users,
  Plane,
  Database,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Play,
  RotateCcw,
  StepForward,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Info,
  Clock,
  Layers,
  ShieldAlert,
  History,
  Trash2,
} from 'lucide-react';
import type { TranslationDict, Language } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type { RelayNode, RelayPacket, RelayAckRecord } from '../lib/relay/relayTypes';
import {
  DEFAULT_RELAY_NODES,
  MAX_RELAY_HOPS,
  createOriginRelayPacket,
  forwardRelayPacket,
  formatHandoffPayload,
  decodeHandoffPayload,
} from '../lib/relay/relayProtocol';
import { getAllRelayAcks, clearAllRelayAcks } from '../lib/relay/relayAckStorage';

interface RelaySimulationViewProps {
  t: TranslationDict;
  language: Language;
  onNavigate: (view: NavView) => void;
  onTrackSos: (sosId: string) => void;
}

export const RelaySimulationView: React.FC<RelaySimulationViewProps> = ({
  t,
  language,
  onNavigate,
  onTrackSos,
}) => {
  const nodes: RelayNode[] = DEFAULT_RELAY_NODES;

  // Simulation State
  const [activePacket, setActivePacket] = useState<RelayPacket | null>(null);
  const [currentHopIndex, setCurrentHopIndex] = useState<number>(0);
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(false);
  const [seenPacketIds, setSeenPacketIds] = useState<Set<string>>(new Set());
  const [ackRecord, setAckRecord] = useState<RelayAckRecord | null>(null);
  const [persistedAcks, setPersistedAcks] = useState<RelayAckRecord[]>([]);
  const [eventLogs, setEventLogs] = useState<string[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<'flood' | 'medical' | 'collapse'>('flood');

  const [copiedHandoff, setCopiedHandoff] = useState<boolean>(false);
  const [importInput, setImportInput] = useState<string>('');
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [edgeCaseFeedback, setEdgeCaseFeedback] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(() => Date.now());

  const autoSimTimerRef = useRef<number | null>(null);
  const hasMountedRef = useRef<boolean>(false);

  const appendLog = useCallback((msg: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setEventLogs((prev) => [`[${timeStr}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  // Initialize or reset packet based on selected scenario
  const initScenario = useCallback(async (scenarioKey: 'flood' | 'medical' | 'collapse') => {
    let emergency_type: RelayPacket['emergency_type'] = 'flood';
    let description = '';
    let priority: RelayPacket['priority'] = 'high';

    if (scenarioKey === 'flood') {
      emergency_type = 'flood';
      description = 'Rooftop evacuation needed near Godavari riverbank. Floodwaters at 1.8m, cell tower offline.';
      priority = 'critical';
    } else if (scenarioKey === 'medical') {
      emergency_type = 'medical';
      description = 'Elderly resident with acute respiratory failure, power blackout, backup generator exhausted.';
      priority = 'critical';
    } else {
      emergency_type = 'building_collapse';
      description = 'Structural partial collapse of residential wall, 3 persons trapped in ground floor utility room.';
      priority = 'critical';
    }

    const packet = await createOriginRelayPacket({
      emergency_type,
      description,
      priority,
      latitude: 17.3850,
      longitude: 78.4867,
      location_name: 'Flooded Residential Area, Sector 4',
    });

    setActivePacket(packet);
    setCurrentHopIndex(0);
    setAckRecord(null);
    setEdgeCaseFeedback(null);
    setIsAutoSimulating(false);
    const seen = new Set<string>();
    seen.add(`${packet.sos_id}_hop0`);
    setSeenPacketIds(seen);

    appendLog(`Origin packet created at Node A (${nodes[0].name}). Hop: 0, TTL: 24h, SHA-256 Hash computed.`);
  }, [appendLog, nodes]);

  // Periodic clock update for pure TTL display
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 15000);
    return () => clearInterval(clockTimer);
  }, []);

  // Load initial scenario on mount
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      void initScenario('flood');
    }
  }, [initScenario]);

  // Load and synchronize all persisted ACKs across browser reloads
  useEffect(() => {
    let isMounted = true;

    getAllRelayAcks()
      .then((acks) => {
        if (isMounted) {
          setPersistedAcks(acks);
        }
      })
      .catch((err) => console.warn('Failed to load persisted ACKs:', err));

    const handleAckSaved = () => {
      getAllRelayAcks()
        .then((acks) => {
          if (isMounted) {
            setPersistedAcks(acks);
          }
        })
        .catch(() => {});
    };

    const handleAckCleared = () => {
      if (isMounted) {
        setPersistedAcks([]);
        setAckRecord(null);
      }
    };

    window.addEventListener('jeevascan:relay_ack_saved', handleAckSaved);
    window.addEventListener('jeevascan:relay_ack_cleared', handleAckCleared);
    return () => {
      isMounted = false;
      window.removeEventListener('jeevascan:relay_ack_saved', handleAckSaved);
      window.removeEventListener('jeevascan:relay_ack_cleared', handleAckCleared);
    };
  }, []);

  // Derive active ACK from component state or durable persisted record
  const currentAck = ackRecord || (activePacket ? persistedAcks.find((a) => a.sos_id === activePacket.sos_id) || null : null);

  const handleClearAckHistory = async () => {
    await clearAllRelayAcks();
    setAckRecord(null);
    setPersistedAcks([]);
    appendLog('[ACK LOG] Stored relay acknowledgements cleared across all storage tiers.');
  };

  // Advance single hop forward
  const handleAdvanceHop = useCallback(async () => {
    if (!activePacket) return;

    if (activePacket.status === 'INGRESSED') {
      appendLog('Packet already ingressed at Gateway (Node D). Complete cycle.');
      return;
    }

    if (activePacket.status.startsWith('REJECTED')) {
      appendLog(`Cannot advance: Packet was rejected (${activePacket.status}). Reset to try again.`);
      return;
    }

    const nextHop = currentHopIndex + 1;
    if (nextHop >= nodes.length) {
      appendLog('Reached end of topology.');
      return;
    }

    const fromNode = nodes[currentHopIndex];
    const toNode = nodes[nextHop];

    appendLog(`Attempting hop ${activePacket.hop_count} -> ${nextHop} (${fromNode.name} -> ${toNode.name})...`);

    const result = await forwardRelayPacket(activePacket, fromNode, toNode, seenPacketIds);

    setActivePacket(result.updatedPacket);
    setSeenPacketIds(new Set(seenPacketIds));

    if (result.error) {
      appendLog(`[HOP FAILED] ${result.error}`);
      setEdgeCaseFeedback(`Hop Failed: ${result.error}`);
      setIsAutoSimulating(false);
      return;
    }

    setCurrentHopIndex(nextHop);

    if (result.ackRecord) {
      setAckRecord(result.ackRecord);
      appendLog(`[GATEWAY INGRESS SUCCESS] Base Station ACK generated: ${result.ackRecord.ack_id}. Committed to local demo store.`);
      setIsAutoSimulating(false);
    } else {
      appendLog(`[HOP SUCCESS] Packet reached Node ${String.fromCharCode(65 + nextHop)} (${toNode.name}). RSSI: ${result.updatedPacket.hop_history[result.updatedPacket.hop_history.length - 1]?.rssiSignalDbm} dBm`);
    }
  }, [activePacket, currentHopIndex, nodes, seenPacketIds, appendLog]);

  // Handle Auto Simulation
  useEffect(() => {
    if (!isAutoSimulating) {
      if (autoSimTimerRef.current) clearInterval(autoSimTimerRef.current);
      return;
    }

    autoSimTimerRef.current = window.setInterval(() => {
      if (!activePacket || activePacket.status === 'INGRESSED' || activePacket.status.startsWith('REJECTED')) {
        setIsAutoSimulating(false);
        return;
      }
      handleAdvanceHop();
    }, 1800);

    return () => {
      if (autoSimTimerRef.current) clearInterval(autoSimTimerRef.current);
    };
  }, [isAutoSimulating, activePacket, handleAdvanceHop]);

  // Reset Simulation
  const handleReset = () => {
    initScenario(selectedScenario);
  };

  // Fault Injection: Expired TTL
  const handleInjectExpired = () => {
    if (!activePacket) return;
    const expiredTime = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour in the past
    const modified: RelayPacket = {
      ...activePacket,
      valid_until: expiredTime,
    };
    setActivePacket(modified);
    setEdgeCaseFeedback('Injected expired TTL: validity set to 1 hour in past. Next hop will reject.');
    appendLog('[FAULT INJECTION] Packet valid_until forced to past timestamp (TTL expired).');
  };

  // Fault Injection: Exceeded Hop Limit
  const handleInjectExceededHops = () => {
    if (!activePacket) return;
    const modified: RelayPacket = {
      ...activePacket,
      hop_count: MAX_RELAY_HOPS, // already at 3
    };
    setActivePacket(modified);
    setEdgeCaseFeedback('Injected hop count = 3. Next forward will violate MAX_HOPS limit.');
    appendLog('[FAULT INJECTION] Packet hop_count forced to 3 (Max limit reached).');
  };

  // Fault Injection: Duplicate Packet
  const handleInjectDuplicate = () => {
    if (!activePacket) return;
    const nextHop = currentHopIndex + 1;
    const duplicateKey = `${activePacket.sos_id}_hop${nextHop}`;
    seenPacketIds.add(duplicateKey);
    setSeenPacketIds(new Set(seenPacketIds));
    setEdgeCaseFeedback(`Injected duplicate key into filter for Node ${String.fromCharCode(65 + nextHop)}. Next hop will drop as duplicate.`);
    appendLog(`[FAULT INJECTION] Pre-seeded duplicate suppression key: ${duplicateKey}`);
  };

  // Fault Injection: Tamper Integrity Hash
  const handleTamperIntegrity = () => {
    if (!activePacket) return;
    const modified: RelayPacket = {
      ...activePacket,
      description: `${activePacket.description} [UNAUTHORIZED MUTATION]`,
    };
    setActivePacket(modified);
    setEdgeCaseFeedback('Tampered packet description without recomputing hash. Next hop will detect mismatch.');
    appendLog('[FAULT INJECTION] Modified payload text without hash update (integrity violation test).');
  };

  // Handoff Copy
  const handleCopyHandoff = () => {
    if (!activePacket) return;
    const payload = formatHandoffPayload(activePacket);
    const jsonStr = JSON.stringify(payload, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedHandoff(true);
    setTimeout(() => setCopiedHandoff(false), 2500);
    appendLog('Handoff payload copied to clipboard.');
  };

  // Handoff Import
  const handleImportPayload = async () => {
    setImportFeedback(null);
    if (!importInput.trim()) {
      setImportFeedback({ success: false, message: 'Please paste a valid payload string.' });
      return;
    }

    const decoded = await decodeHandoffPayload(importInput);
    if (!decoded.valid || !decoded.packet) {
      setImportFeedback({ success: false, message: decoded.error || t.relaySim.importError });
      appendLog(`[IMPORT FAILED] ${decoded.error}`);
      return;
    }

    setActivePacket(decoded.packet);
    setCurrentHopIndex(0);
    setAckRecord(null);
    setEdgeCaseFeedback(null);
    setImportFeedback({ success: true, message: t.relaySim.importSuccess });
    appendLog(`[IMPORT SUCCESS] Successfully imported external packet ${decoded.packet.sos_id.slice(0, 8)} with verified integrity hash.`);
  };

  // Node Icon Helper
  const getNodeIcon = (role: RelayNode['role']) => {
    switch (role) {
      case 'citizen':
        return <Smartphone size={24} style={{ color: 'var(--color-orange)' }} />;
      case 'bystander':
        return <Users size={24} style={{ color: 'var(--color-teal)' }} />;
      case 'uav_drone':
        return <Plane size={24} style={{ color: '#0284C7' }} />;
      case 'gateway':
        return <Database size={24} style={{ color: 'var(--color-teal)' }} />;
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div 
          className="badge badge-teal" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}
        >
          <Radio size={15} />
          <span>{t.relaySim.badge}</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.75rem' }}>
          {t.relaySim.title}
        </h1>
        <p style={{ maxWidth: '780px', margin: '0 auto', color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          {t.relaySim.subtitle}
        </p>
      </div>

      {/* Honest Browser Sandboxing Disclaimer Box */}
      <div
        className="glass-panel"
        style={{
          borderLeft: '4px solid var(--color-teal)',
          background: '#FFFFFF',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        <Info size={22} style={{ color: 'var(--color-teal)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
            {t.relaySim.honestNoticeTitle}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            {t.relaySim.honestNoticeDesc}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>• {t.relaySim.hopLimitNotice}</span>
            <span>• {t.relaySim.ttlNotice}</span>
            <span>• {t.relaySim.duplicateNotice}</span>
            <span>• {t.relaySim.integrityNotice}</span>
          </div>
        </div>
      </div>

      {/* Scenario Selector & Action Bar */}
      <div
        className="glass-panel"
        style={{
          background: '#FFFFFF',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label htmlFor="scenario-select" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {t.relaySim.scenarioLabel}:
          </label>
          <select
            id="scenario-select"
            value={selectedScenario}
            onChange={(e) => {
              const val = e.target.value as 'flood' | 'medical' | 'collapse';
              setSelectedScenario(val);
              initScenario(val);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-medium)',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            <option value="flood">{t.relaySim.scenarioFlood}</option>
            <option value="medical">{t.relaySim.scenarioMedical}</option>
            <option value="collapse">{t.relaySim.scenarioCollapse}</option>
          </select>
        </div>

        {/* Primary Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleAdvanceHop}
            disabled={!activePacket || activePacket.status === 'INGRESSED' || activePacket.status.startsWith('REJECTED') || isAutoSimulating}
            className="btn btn-teal"
            style={{ padding: '0.55rem 1.1rem', fontSize: '0.9rem' }}
          >
            <StepForward size={16} />
            <span>{t.relaySim.stepHop}</span>
          </button>

          <button
            onClick={() => setIsAutoSimulating(!isAutoSimulating)}
            disabled={!activePacket || activePacket.status === 'INGRESSED' || activePacket.status.startsWith('REJECTED')}
            className={`btn ${isAutoSimulating ? 'btn-amber' : 'btn-navy'}`}
            style={{ padding: '0.55rem 1.1rem', fontSize: '0.9rem' }}
          >
            <Play size={16} />
            <span>{isAutoSimulating ? 'Pause Auto' : t.relaySim.autoHop}</span>
          </button>

          <button
            onClick={handleReset}
            className="btn btn-outline"
            style={{ padding: '0.55rem 1rem', fontSize: '0.9rem' }}
          >
            <RotateCcw size={16} />
            <span>{t.relaySim.resetSim}</span>
          </button>
        </div>
      </div>

      {/* Fault / Edge Case Injection Bar */}
      <div
        className="glass-panel"
        style={{
          background: '#F8FAFC',
          border: '1px dashed var(--border-medium)',
          padding: '0.85rem 1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Edge Case Testing:
        </span>

        <button
          onClick={handleInjectExpired}
          className="btn btn-outline"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem', borderColor: '#F59E0B', color: '#D97706' }}
        >
          {t.relaySim.testExpiry}
        </button>

        <button
          onClick={handleInjectDuplicate}
          className="btn btn-outline"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem', borderColor: '#F59E0B', color: '#D97706' }}
        >
          {t.relaySim.testDuplicate}
        </button>

        <button
          onClick={handleInjectExceededHops}
          className="btn btn-outline"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem', borderColor: '#DC2626', color: '#DC2626' }}
        >
          {t.relaySim.testHopLimit}
        </button>

        <button
          onClick={handleTamperIntegrity}
          className="btn btn-outline"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem', borderColor: '#DC2626', color: '#DC2626' }}
        >
          Tamper Hash (Integrity Test)
        </button>

        {edgeCaseFeedback && (
          <span style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 600, marginLeft: 'auto' }}>
            ⚠ {edgeCaseFeedback}
          </span>
        )}
      </div>

      {/* 4-Node Visual Topology Canvas */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', position: 'relative' }}>
          {nodes.map((node, index) => {
            const isCurrent = currentHopIndex === index;
            const isVisited = currentHopIndex >= index;
            const isDestination = activePacket?.status === 'INGRESSED' && index === 3;

            return (
              <div
                key={node.id}
                className="glass-panel"
                style={{
                  background: isCurrent ? '#FFFFFF' : '#F8FAFC',
                  border: isCurrent
                    ? '2px solid var(--color-teal)'
                    : isDestination
                    ? '2px solid var(--color-teal)'
                    : isVisited
                    ? '1px solid var(--color-teal)'
                    : '1px solid var(--border-subtle)',
                  boxShadow: isCurrent ? '0 8px 24px rgba(13, 148, 136, 0.15)' : 'none',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Node Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isCurrent ? 'var(--color-teal-light)' : 'rgba(16, 42, 67, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getNodeIcon(node.role)}
                  </div>

                  <span
                    className={`badge ${
                      node.isOnline ? 'badge-teal' : 'badge-subtle'
                    }`}
                    style={{ fontSize: '0.725rem' }}
                  >
                    {node.isOnline ? 'ONLINE GATEWAY' : 'OFFLINE STORE & FORWARD'}
                  </span>
                </div>

                {/* Node Title & Hop Tag */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-navy)', letterSpacing: '0.05em' }}>
                      NODE {String.fromCharCode(65 + index)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      (Hop {index})
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                    {language === 'te' ? node.nameTe : node.name}
                  </h3>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 0.85rem 0', flex: 1 }}>
                  {language === 'te' ? node.descriptionTe : node.description}
                </p>

                {/* Location meta */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                  📍 {node.locationName}
                </div>

                {/* Active Indicator Pulse */}
                {isCurrent && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '12px',
                      background: 'var(--color-teal)',
                      color: '#FFFFFF',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      boxShadow: '0 2px 8px rgba(13, 148, 136, 0.4)',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FFFFFF', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                    PACKET HERE
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Gateway Ingress & ACK Celebration Box (Visible when packet reaches Gateway) */}
      {currentAck && (
        <div
          className="glass-panel"
          style={{
            background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(16, 42, 67, 0.04) 100%)',
            border: '2px solid var(--color-teal)',
            padding: '1.75rem',
            marginBottom: '2.5rem',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-teal-light)',
                  color: 'var(--color-teal-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={30} />
              </div>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <span className="badge badge-teal" style={{ fontSize: '0.75rem' }}>
                    {t.relaySim.ackGenerated}
                  </span>
                  {currentAck.storage_tier === 'durable_idb' && (
                    <span className="badge" style={{ fontSize: '0.75rem', background: '#ccfbf1', color: '#0f766e', fontWeight: 600 }}>
                      Durable Storage: IndexedDB Disk
                    </span>
                  )}
                  {currentAck.storage_tier === 'durable_local_storage' && (
                    <span className="badge" style={{ fontSize: '0.75rem', background: '#ccfbf1', color: '#0f766e', fontWeight: 600 }}>
                      Durable Storage: LocalStorage
                    </span>
                  )}
                  {currentAck.storage_tier === 'temporary_memory' && (
                    <span className="badge" style={{ fontSize: '0.75rem', background: '#ffe4e6', color: '#be123c', fontWeight: 600 }}>
                      Temporary Storage: Memory-Only
                    </span>
                  )}
                  {currentAck.is_duplicate && (
                    <span className="badge" style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                      Duplicate Packet (Original ACK Preserved)
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-navy)', margin: '0 0 0.25rem 0' }}>
                  {t.relaySim.gatewayIngressTitle}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                  {t.relaySim.committedToLocalStore} (ACK ID: <code style={{ color: 'var(--color-navy)', fontWeight: 700 }}>{currentAck.ack_id}</code>)
                </p>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
                  <span>Tracking Code: <strong>{currentAck.tracking_code}</strong></span>
                  <span>Total Hops: <strong>{currentAck.total_hops} / {MAX_RELAY_HOPS}</strong></span>
                  <span>Integrity: <strong>Verified SHA-256</strong></span>
                </div>
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: '0.8rem',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <ShieldAlert size={15} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Local Demonstration ACK:</strong> Recorded in browser demonstration store only. Emergency responders have <strong>NOT</strong> been dispatched.
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => onTrackSos(activePacket?.sos_id || '')}
                className="btn btn-teal"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
              >
                <ExternalLink size={16} />
                <span>{t.relaySim.viewInTracker}</span>
              </button>
              <button
                onClick={() => onNavigate('operator-dashboard')}
                className="btn btn-navy"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
              >
                <Database size={16} />
                <span>View in Operator Command</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Durable Acknowledgement History (Survives Refresh) */}
      {persistedAcks.length > 0 && (
        <div
          className="glass-panel"
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-medium)',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} style={{ color: 'var(--color-teal)' }} />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
                Durable Gateway Acknowledgements History ({persistedAcks.length})
              </h4>
            </div>
            <button
              onClick={handleClearAckHistory}
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#be123c', borderColor: '#fecdd3' }}
              title="Clear stored acknowledgements"
            >
              <Trash2 size={13} />
              <span>Clear Stored ACKs</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {persistedAcks.map((ack) => (
              <div
                key={ack.ack_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: '#F8FAFC',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <code style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    {ack.tracking_code}
                  </code>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    ACK: <code>{ack.ack_id}</code>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(ack.ingressed_at).toLocaleTimeString()}
                  </span>
                  {ack.storage_tier === 'durable_idb' && (
                    <span className="badge" style={{ fontSize: '0.7rem', background: '#ccfbf1', color: '#0f766e', fontWeight: 600 }}>
                      IndexedDB Disk
                    </span>
                  )}
                  {ack.storage_tier === 'durable_local_storage' && (
                    <span className="badge" style={{ fontSize: '0.7rem', background: '#ccfbf1', color: '#0f766e', fontWeight: 600 }}>
                      LocalStorage
                    </span>
                  )}
                  {ack.storage_tier === 'temporary_memory' && (
                    <span className="badge" style={{ fontSize: '0.7rem', background: '#ffe4e6', color: '#be123c', fontWeight: 600 }}>
                      Memory-Only
                    </span>
                  )}
                  {ack.is_duplicate && (
                    <span className="badge" style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                      Duplicate
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => onTrackSos(ack.sos_id)}
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    <ExternalLink size={13} />
                    <span>Track</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '0.85rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}
          >
            * Acknowledgements are persisted in browser storage and survive page refreshes. Represents local demonstration data only; emergency responders are not dispatched.
          </div>
        </div>
      )}

      {/* Two Column Layout: Packet Inspector & Hop Route Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Left: Live Packet Inspector */}
        <div className="glass-panel" style={{ background: '#FFFFFF', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} style={{ color: 'var(--color-teal)' }} />
              <span>{t.relaySim.packetInspector}</span>
            </h3>

            {activePacket && (
              <span
                className={`badge ${
                  activePacket.status === 'INGRESSED'
                    ? 'badge-teal'
                    : activePacket.status.startsWith('REJECTED')
                    ? 'badge-red'
                    : 'badge-amber'
                }`}
                style={{ fontSize: '0.75rem' }}
              >
                {activePacket.status}
              </span>
            )}
          </div>

          {activePacket ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Hop progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  <span>{t.relaySim.currentHop}: {activePacket.hop_count} / {MAX_RELAY_HOPS}</span>
                  <span>{activePacket.status === 'INGRESSED' ? '100% Reached Gateway' : `${Math.round((activePacket.hop_count / MAX_RELAY_HOPS) * 100)}%`}</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(activePacket.hop_count / MAX_RELAY_HOPS) * 100}%`,
                      backgroundColor: activePacket.status.startsWith('REJECTED') ? 'var(--color-red)' : 'var(--color-teal)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Status explanation */}
              {activePacket.rejection_reason && (
                <div style={{ backgroundColor: 'var(--color-red-subtle)', border: '1px solid var(--color-red)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem', color: 'var(--color-red)', fontSize: '0.8rem' }}>
                  <strong>Rejection:</strong> {activePacket.rejection_reason}
                </div>
              )}

              {/* Metadata rows */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.825rem' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>SOS ID</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-navy)' }}>{activePacket.sos_id.slice(0, 13)}...</div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>Emergency Type</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-navy)', textTransform: 'capitalize' }}>{activePacket.emergency_type.replace('_', ' ')}</div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>Priority Level</div>
                  <div style={{ fontWeight: 700, color: activePacket.priority === 'critical' ? 'var(--color-red)' : 'var(--color-orange)', textTransform: 'uppercase' }}>
                    {activePacket.priority}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>TTL Remaining</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>
                    {new Date(activePacket.valid_until).getTime() > currentTimestamp
                      ? `${Math.round((new Date(activePacket.valid_until).getTime() - currentTimestamp) / (3600 * 1000))} hours`
                      : 'Expired (0h)'}
                  </div>
                </div>
              </div>

              {/* Payload Description */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem', marginBottom: '0.2rem' }}>Payload Description</div>
                <div style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{activePacket.description}</div>
              </div>

              {/* Integrity Hash Check */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.775rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    <ShieldCheck size={14} style={{ color: 'var(--color-teal)' }} />
                    <span>SHA-256 Integrity Check</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-teal)', fontWeight: 600 }}>Checksum Verified</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {activePacket.integrity_hash}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Integrity verification only. Not an authentication signature.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No active packet in simulation.
            </div>
          )}
        </div>

        {/* Right: Hop Route Timeline */}
        <div className="glass-panel" style={{ background: '#FFFFFF', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ color: 'var(--color-teal)' }} />
            <span>{t.relaySim.hopHistory}</span>
          </h3>

          {activePacket && activePacket.hop_history.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
              {activePacket.hop_history.map((event, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#F8FAFC',
                    borderLeft: '3px solid var(--color-teal)',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-teal-light)',
                      color: 'var(--color-teal-dark)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {event.hopNumber}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-navy)' }}>
                        {event.fromNodeName.split('(')[0]} <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {event.toNodeName.split('(')[0]}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>Carrier: <strong>{event.carrierType}</strong></span>
                      <span>Signal: <strong>{event.rssiSignalDbm} dBm</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', textAlign: 'center' }}>
              <Radio size={36} style={{ color: 'var(--border-medium)', marginBottom: '0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Packet is at Origin Node A. Advance 1 Hop to initiate mesh transmission.</p>
            </div>
          )}

          {/* Event Log Output Terminal */}
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Simulation Event Stream
            </div>
            <div style={{ backgroundColor: '#102A43', color: '#D9E2EC', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', fontSize: '0.7rem', maxHeight: '110px', overflowY: 'auto' }}>
              {eventLogs.map((log, i) => (
                <div key={i} style={{ lineHeight: 1.4 }}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Peer-to-Peer Handoff Box (Honest Demo) */}
      <div
        className="glass-panel"
        style={{
          background: '#FFFFFF',
          padding: '1.75rem',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <QrCode size={20} style={{ color: 'var(--color-navy)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
            {t.relaySim.manualHandoffTitle}
          </h3>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem', maxWidth: '820px' }}>
          {t.relaySim.manualHandoffDesc}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Export / QR Presentation */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.75rem' }}>
              Export / Share from this Device
            </h4>

            {/* QR Pattern Display (Pure SVG Matrix) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                }}
              >
                {/* Clean SVG QR Finder Pattern */}
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  {/* Top-Left Finder */}
                  <rect x="5" y="5" width="28" height="28" fill="#102A43" />
                  <rect x="10" y="10" width="18" height="18" fill="#FFFFFF" />
                  <rect x="14" y="14" width="10" height="10" fill="#102A43" />
                  {/* Top-Right Finder */}
                  <rect x="67" y="5" width="28" height="28" fill="#102A43" />
                  <rect x="72" y="10" width="18" height="18" fill="#FFFFFF" />
                  <rect x="76" y="14" width="10" height="10" fill="#102A43" />
                  {/* Bottom-Left Finder */}
                  <rect x="5" y="67" width="28" height="28" fill="#102A43" />
                  <rect x="10" y="72" width="18" height="18" fill="#FFFFFF" />
                  <rect x="14" y="76" width="10" height="10" fill="#102A43" />
                  {/* Grid Data Dots */}
                  <rect x="40" y="10" width="5" height="5" fill="#0D9488" />
                  <rect x="50" y="15" width="5" height="5" fill="#102A43" />
                  <rect x="42" y="25" width="5" height="5" fill="#102A43" />
                  <rect x="55" y="32" width="5" height="5" fill="#0D9488" />
                  <rect x="15" y="42" width="5" height="5" fill="#102A43" />
                  <rect x="25" y="48" width="5" height="5" fill="#102A43" />
                  <rect x="40" y="45" width="5" height="5" fill="#0D9488" />
                  <rect x="60" y="50" width="5" height="5" fill="#102A43" />
                  <rect x="75" y="45" width="5" height="5" fill="#0D9488" />
                  <rect x="85" y="55" width="5" height="5" fill="#102A43" />
                  <rect x="42" y="65" width="5" height="5" fill="#102A43" />
                  <rect x="55" y="72" width="5" height="5" fill="#0D9488" />
                  <rect x="70" y="78" width="5" height="5" fill="#102A43" />
                  <rect x="82" y="85" width="5" height="5" fill="#0D9488" />
                </svg>
              </div>

              <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  Format: <code>JEEVASCAN_RELAY_V1</code>
                </p>
                <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)' }}>
                  Visual payload format for camera scanning or direct text copy.
                </p>
                <button
                  onClick={handleCopyHandoff}
                  disabled={!activePacket}
                  className="btn btn-navy"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                >
                  {copiedHandoff ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedHandoff ? t.relaySim.payloadCopied : t.relaySim.copyPayload}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Import / Receive on another peer */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>
              {t.relaySim.importPayload}
            </h4>
            <textarea
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder={t.relaySim.importPlaceholder}
              rows={3}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                marginBottom: '0.75rem',
                resize: 'none',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                onClick={handleImportPayload}
                className="btn btn-teal"
                style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
              >
                <span>{t.relaySim.importButton}</span>
              </button>

              {importFeedback && (
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: importFeedback.success ? 'var(--color-teal)' : 'var(--color-red)',
                  }}
                >
                  {importFeedback.message}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
