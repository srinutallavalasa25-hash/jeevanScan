import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Search, 
  RefreshCw, 
  Check, 
  Truck, 
  CheckCheck,
  Filter,
  Plus,
  Radio,
  Navigation,
  Waves,
  Package,
  HeartHandshake,
  Eye,
  Map as MapIcon,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type { IncidentRecord, IncidentStatus, LocationUpdateRecord } from '../types/database';
import type { JeevaDropRequest, JeevaCarePledge } from '../types/phase12';
import { backend } from '../lib/supabase';
import { listJeevaDropRequests } from '../lib/relief/jeevaDropStore';
import { listJeevaCarePledges } from '../lib/care/jeevaCareStore';

interface OperatorDashboardViewProps {
  t: TranslationDict;
  onNavigate: (view: NavView) => void;
}

export const OperatorDashboardView: React.FC<OperatorDashboardViewProps> = ({ t, onNavigate }) => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Modal State for notes / status update
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<IncidentStatus>('acknowledged');
  const [operatorNotes, setOperatorNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [liveLocationsMap, setLiveLocationsMap] = useState<Record<string, LocationUpdateRecord>>({});

  // Phase 12: JeevaDrop and JeevaCare Shared Coordination State
  const [dropRequests, setDropRequests] = useState<JeevaDropRequest[]>(() => {
    try {
      return listJeevaDropRequests();
    } catch {
      return [];
    }
  });
  const [carePledges, setCarePledges] = useState<JeevaCarePledge[]>(() => {
    try {
      return listJeevaCarePledges();
    } catch {
      return [];
    }
  });

  const loadReliefAndCareData = useCallback(() => {
    try {
      setDropRequests(listJeevaDropRequests());
    } catch {
      // ignore
    }
    try {
      setCarePledges(listJeevaCarePledges());
    } catch {
      // ignore
    }
  }, []);

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

  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await backend.fetchIncidents();
      setIncidents(data);
      void loadLocationUpdates(data);
      loadReliefAndCareData();
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadLocationUpdates, loadReliefAndCareData]);

  useEffect(() => {
    let ignore = false;
    backend.fetchIncidents()
      .then((data) => {
        if (!ignore) {
          setIncidents(data);
          setIsLoading(false);
          void loadLocationUpdates(data);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load incidents:', err);
          setIsLoading(false);
        }
      });

    const handleLocationUpdate = () => {
      backend.fetchIncidents().then((data) => {
        if (!ignore) {
          void loadLocationUpdates(data);
        }
      });
    };

    window.addEventListener('jeevascan:location_sharing_updated', handleLocationUpdate);
    return () => {
      ignore = true;
      window.removeEventListener('jeevascan:location_sharing_updated', handleLocationUpdate);
    };
  }, [loadLocationUpdates]);

  // Filtered incidents
  const filteredIncidents = incidents.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.emergency_type === categoryFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      !query || 
      item.sos_id.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.location_name && item.location_name.toLowerCase().includes(query));

    return matchesStatus && matchesCategory && matchesQuery;
  });

  // Tally counts
  const totalCount = incidents.length;
  const pendingCount = incidents.filter((i) => i.status === 'pending').length;
  const ackCount = incidents.filter((i) => i.status === 'acknowledged').length;
  const dispatchedCount = incidents.filter((i) => i.status === 'dispatched').length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;

  // Phase 12: Shared Coordination Dashboard Metrics
  const openFloodCount = incidents.filter(
    (i) => i.emergency_type === 'flood' && i.status !== 'resolved'
  ).length;
  const reliefAwaitingReviewCount = dropRequests.filter(
    (r) => r.status === 'submitted' || r.status === 'under_review'
  ).length;
  const approvedAwaitingFulfillmentCount = dropRequests.filter(
    (r) => r.status === 'approved' || r.status === 'simulated_fulfillment'
  ).length;
  const pledgesAwaitingVerificationCount = carePledges.filter(
    (p) => p.status === 'pledged' || p.status === 'under_verification'
  ).length;
  const completedDemoWorkflowsCount =
    resolvedCount +
    dropRequests.filter((r) => r.status === 'completed').length +
    carePledges.filter((p) => p.status === 'fulfilled').length;

  const handleOpenStatusModal = (incident: IncidentRecord, status: IncidentStatus) => {
    setSelectedIncident(incident);
    setTargetStatus(status);
    setOperatorNotes('');
    setUpdateMessage(null);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedIncident) return;
    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const result = await backend.updateIncidentStatus(
        selectedIncident.sos_id,
        targetStatus,
        operatorNotes.trim() || undefined
      );

      if (result.success) {
        setUpdateMessage(result.message);
        // Refresh incidents in view
        await loadIncidents();
        setTimeout(() => {
          setSelectedIncident(null);
          setUpdateMessage(null);
        }, 1200);
      } else {
        setUpdateMessage(`Error: ${result.message}`);
      }
    } catch (err: unknown) {
      setUpdateMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="badge badge-red">{t.operatorDashboard.priorityCritical}</span>;
      case 'high':
        return <span className="badge badge-amber">{t.operatorDashboard.priorityHigh}</span>;
      case 'medium':
        return <span className="badge badge-cyan">{t.operatorDashboard.priorityMedium}</span>;
      default:
        return <span className="badge badge-subtle">{t.operatorDashboard.priorityLow}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="badge badge-red" style={{ gap: '0.4rem' }}>
            <span className="pulse-dot pulse-dot-red" />
            PENDING
          </span>
        );
      case 'acknowledged':
        return (
          <span className="badge badge-amber" style={{ gap: '0.4rem' }}>
            <span className="pulse-dot pulse-dot-amber" />
            ACKNOWLEDGED
          </span>
        );
      case 'dispatched':
        return (
          <span className="badge badge-cyan">
            <Truck size={12} />
            DISPATCHED
          </span>
        );
      case 'resolved':
        return (
          <span className="badge badge-emerald">
            <CheckCheck size={12} />
            RESOLVED
          </span>
        );
      default:
        return <span className="badge badge-subtle">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 4rem' }}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
            <ShieldAlert size={26} style={{ color: '#06B6D4' }} />
            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', margin: 0 }}>
              {t.operatorDashboard.title}
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t.operatorDashboard.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadIncidents} 
            className="btn btn-outline" 
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
            title="Refresh Incidents"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onNavigate('send-sos')}
            className="btn btn-sos"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>{t.operatorDashboard.createSosCta}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Demo Tactical Notice Banner */}
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: '#FBBF24',
        }}
      >
        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
        <span>{t.operatorDashboard.demoNoticeBanner}</span>
      </div>

      {/* Phase 12: Shared Coordination Dashboard Overview */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(16, 42, 67, 0.05) 0%, rgba(14, 165, 233, 0.05) 100%)',
          border: '1px solid var(--border-medium)',
        }}
      >
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} style={{ color: '#0284C7' }} />
              <span>{t.dashboardSummary?.title || 'Crisis Coordination Command Overview'}</span>
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t.dashboardSummary?.subtitle || 'Unified operational stats across flood triage, JeevaDrop supplies, and JeevaCare donations.'}
            </p>
          </div>
        </div>

        {/* 5 Phase 12 Coordination Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          <div
            onClick={() => onNavigate('flood-rescue')}
            style={{
              background: '#FFFFFF',
              border: '1px solid #BAE6FD',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 600 }}>
                {t.dashboardSummary?.openFloodIncidents || 'Open Flood Incidents'}
              </span>
              <Waves size={15} style={{ color: '#0284C7' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0369A1', marginTop: '0.25rem' }}>
              {openFloodCount}
            </div>
          </div>

          <div
            onClick={() => onNavigate('jeeva-drop')}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FED7AA',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 600 }}>
                {t.dashboardSummary?.reliefAwaitingReview || 'Relief Awaiting Review'}
              </span>
              <Package size={15} style={{ color: '#D97706' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#B45309', marginTop: '0.25rem' }}>
              {reliefAwaitingReviewCount}
            </div>
          </div>

          <div
            onClick={() => onNavigate('jeeva-drop')}
            style={{
              background: '#FFFFFF',
              border: '1px solid #99F6E4',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '0.75rem', color: '#0F766E', fontWeight: 600 }}>
                {t.dashboardSummary?.approvedAwaitingFulfillment || 'Approved Pending Delivery'}
              </span>
              <Truck size={15} style={{ color: '#0F766E' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F766E', marginTop: '0.25rem' }}>
              {approvedAwaitingFulfillmentCount}
            </div>
          </div>

          <div
            onClick={() => onNavigate('jeeva-care')}
            style={{
              background: '#FFFFFF',
              border: '1px solid #DDD6FE',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '0.75rem', color: '#7C3AED', fontWeight: 600 }}>
                {t.dashboardSummary?.pledgesAwaitingVerification || 'Pledges For Verification'}
              </span>
              <HeartHandshake size={15} style={{ color: '#7C3AED' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6D28D9', marginTop: '0.25rem' }}>
              {pledgesAwaitingVerificationCount}
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #A7F3D0',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                {t.dashboardSummary?.completedWorkflows || 'Completed Workflows'}
              </span>
              <CheckCheck size={15} style={{ color: '#059669' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857', marginTop: '0.25rem' }}>
              {completedDemoWorkflowsCount}
            </div>
          </div>
        </div>

        {/* Quick Navigation Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>
            Quick Modules:
          </span>
          <button
            onClick={() => onNavigate('flood-rescue')}
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.775rem', gap: '0.35rem' }}
          >
            <Waves size={13} style={{ color: '#0284C7' }} />
            <span>Flood Rescue</span>
          </button>
          <button
            onClick={() => onNavigate('jeeva-drop')}
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.775rem', gap: '0.35rem' }}
          >
            <Package size={13} style={{ color: '#D97706' }} />
            <span>JeevaDrop Relief</span>
          </button>
          <button
            onClick={() => onNavigate('jeeva-care')}
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.775rem', gap: '0.35rem' }}
          >
            <HeartHandshake size={13} style={{ color: '#7C3AED' }} />
            <span>JeevaCare Donations</span>
          </button>
          <button
            onClick={() => onNavigate('rescue-map')}
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.775rem', gap: '0.35rem' }}
          >
            <MapIcon size={13} style={{ color: '#10B981' }} />
            <span>Rescue Map</span>
          </button>
          <button
            onClick={() => onNavigate('casualty-review')}
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.775rem', gap: '0.35rem' }}
          >
            <Eye size={13} style={{ color: '#06B6D4' }} />
            <span>AI Review</span>
          </button>
          <button
            onClick={() => onNavigate('drone-simulator')}
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.775rem', gap: '0.35rem' }}
          >
            <Radio size={13} style={{ color: '#F59E0B' }} />
            <span>Drone Sim</span>
          </button>
        </div>
      </div>

      {/* Statistics Tally Cards */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}
      >
        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.operatorDashboard.totalIncidents}
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {totalCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderTop: '3px solid var(--color-red)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.operatorDashboard.pendingIncidents}
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-red)', marginTop: '0.25rem' }}>
            {pendingCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderTop: '3px solid var(--color-orange)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-orange-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.operatorDashboard.acknowledgedIncidents}
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-orange-dark)', marginTop: '0.25rem' }}>
            {ackCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderTop: '3px solid var(--color-teal)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-teal-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.operatorDashboard.dispatchedIncidents}
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-teal-dark)', marginTop: '0.25rem' }}>
            {dispatchedCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderTop: '3px solid #0D9488' }}>
          <span style={{ fontSize: '0.8rem', color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.operatorDashboard.resolvedIncidents}
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F766E', marginTop: '0.25rem' }}>
            {resolvedCount}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '1rem 1.25rem', 
          marginBottom: '1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}
      >
        {/* Search Input */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.operatorDashboard.searchPlaceholder}
            style={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              padding: '0.55rem 0.85rem 0.55rem 2.4rem',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2">
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '0.5rem 0.75rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">{t.operatorDashboard.filterStatus}</option>
              <option value="pending">Pending</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="dispatched">Dispatched</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '0.5rem 0.75rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">{t.operatorDashboard.filterAll}</option>
              <option value="flood">Flood</option>
              <option value="trapped">Trapped</option>
              <option value="medical">Medical</option>
              <option value="fire">Fire</option>
              <option value="building_collapse">Building Collapse</option>
              <option value="missing_person">Missing Person</option>
              <option value="food_water_shortage">Food / Water</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Stream */}
      {isLoading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', color: '#06B6D4' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading tactical dispatch queue...</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <AlertTriangle size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{t.operatorDashboard.noIncidentsTitle}</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            {t.operatorDashboard.noIncidentsDesc}
          </p>
          <button
            onClick={() => onNavigate('send-sos')}
            className="btn btn-sos"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
          >
            <span>{t.operatorDashboard.createSosCta}</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredIncidents.map((incident) => {
            const reportedTime = new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const reportedDate = new Date(incident.created_at).toLocaleDateString();

            return (
              <div 
                key={incident.id} 
                className="glass-panel" 
                style={{ 
                  padding: '1.25rem', 
                  borderLeft: incident.status === 'pending' ? '4px solid #EF4444' : incident.status === 'acknowledged' ? '4px solid #F59E0B' : '4px solid #10B981',
                }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="flex items-center gap-2">
                    <span 
                      className="badge badge-amber" 
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', letterSpacing: '0.025em' }}
                    >
                      {t.operatorDashboard.demoBadge}
                    </span>
                    {getPriorityBadge(incident.priority)}
                    {getStatusBadge(incident.status)}
                    <span className="badge badge-subtle" style={{ textTransform: 'capitalize' }}>
                      {incident.emergency_type.replace('_', ' ')}
                    </span>
                    {incident.hop_count && incident.hop_count > 0 ? (
                      <span 
                        className="badge badge-teal" 
                        style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Radio size={11} />
                        <span>{incident.hop_count} Hops Relay</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Clock size={13} />
                    <span>{reportedDate} {reportedTime}</span>
                  </div>
                </div>

                {/* Body / Description */}
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                  {incident.description}
                </p>

                {/* Location / Meta row */}
                <div 
                  className="flex items-center justify-between" 
                  style={{ 
                    flexWrap: 'wrap', 
                    gap: '0.75rem', 
                    paddingTop: '0.75rem', 
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.825rem',
                  }}
                >
                  <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                    {/* SOS ID */}
                    <div style={{ color: 'var(--text-muted)' }}>
                      ID: <span style={{ fontFamily: 'monospace', color: '#38BDF8' }}>{incident.sos_id.slice(0, 8)}...</span>
                    </div>

                    {/* Landmark / Coords */}
                    <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <MapPin size={14} style={{ color: '#F59E0B' }} />
                      <span>
                        {incident.location_name 
                          ? incident.location_name 
                          : incident.latitude && incident.longitude 
                            ? `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`
                            : 'No Coordinates Provided'}
                      </span>
                    </div>

                    {/* Live Location Update badge if present */}
                    {liveLocationsMap[incident.sos_id] && (
                      <div className="flex items-center gap-1" style={{ color: '#0F766E', fontSize: '0.775rem', background: '#F0FDFA', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #99F6E4' }}>
                        <Navigation size={12} style={{ color: '#0D9488' }} />
                        <span>
                          <strong>Live:</strong> {liveLocationsMap[incident.sos_id].latitude.toFixed(4)}, {liveLocationsMap[incident.sos_id].longitude.toFixed(4)}
                          {typeof liveLocationsMap[incident.sos_id].accuracy_meters === 'number' && ` (±${Math.round(liveLocationsMap[incident.sos_id].accuracy_meters as number)}m)`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Operator Action Buttons & Contextual Cross-Links */}
                  <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                    {incident.status === 'pending' && (
                      <button
                        onClick={() => handleOpenStatusModal(incident, 'acknowledged')}
                        className="btn btn-amber"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <Check size={14} />
                        <span>{t.operatorDashboard.actionAcknowledge}</span>
                      </button>
                    )}

                    {incident.status !== 'dispatched' && incident.status !== 'resolved' && (
                      <button
                        onClick={() => handleOpenStatusModal(incident, 'dispatched')}
                        className="btn btn-cyan"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <Truck size={14} />
                        <span>{t.operatorDashboard.actionDispatch}</span>
                      </button>
                    )}

                    {incident.status !== 'resolved' && (
                      <button
                        onClick={() => handleOpenStatusModal(incident, 'resolved')}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#34D399', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                      >
                        <CheckCheck size={14} />
                        <span>{t.operatorDashboard.actionResolve}</span>
                      </button>
                    )}

                    {/* Contextual Modules Cross-Links */}
                    <button
                      onClick={() => onNavigate('jeeva-drop')}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', color: '#D97706', borderColor: '#FED7AA' }}
                      title="Request JeevaDrop supplies for this incident"
                    >
                      <Package size={12} />
                      <span>Supplies</span>
                    </button>

                    {incident.emergency_type === 'flood' && (
                      <button
                        onClick={() => onNavigate('flood-rescue')}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', color: '#0284C7', borderColor: '#BAE6FD' }}
                        title="View in Flood Rescue Mode"
                      >
                        <Waves size={12} />
                        <span>Flood Mode</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigate('casualty-review')}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', color: '#06B6D4', borderColor: '#A5F3FC' }}
                      title="Open AI Incident Review panel"
                    >
                      <Eye size={12} />
                      <span>AI Review</span>
                    </button>

                    <button
                      onClick={() => onNavigate('drone-simulator')}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', color: '#F59E0B', borderColor: '#FDE68A' }}
                      title="Simulate Drone Delivery"
                    >
                      <Radio size={12} />
                      <span>Drone</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Status Update Dialog */}
      {selectedIncident && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', 
              maxWidth: '500px', 
              padding: '1.75rem', 
              border: '1px solid var(--border-medium)',
              position: 'relative',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              {t.operatorDashboard.updateStatusModal}
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Updating SOS ID: <span style={{ color: 'var(--color-teal)', fontFamily: 'monospace' }}>{selectedIncident.sos_id}</span>
            </p>

            {/* Coordinate Comparison in Triage Modal */}
            <div style={{ padding: '0.65rem 0.85rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '1rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', marginBottom: liveLocationsMap[selectedIncident.sos_id] ? '0.35rem' : '0' }}>
                <MapPin size={13} style={{ color: '#F59E0B' }} />
                <span>
                  <strong>Original SOS:</strong> {selectedIncident.latitude && selectedIncident.longitude ? `${selectedIncident.latitude.toFixed(4)}, ${selectedIncident.longitude.toFixed(4)}` : 'None provided'}
                </span>
              </div>
              {liveLocationsMap[selectedIncident.sos_id] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F766E' }}>
                  <Navigation size={13} style={{ color: '#0D9488' }} />
                  <span>
                    <strong>Latest Live:</strong> {liveLocationsMap[selectedIncident.sos_id].latitude.toFixed(4)}, {liveLocationsMap[selectedIncident.sos_id].longitude.toFixed(4)}
                    {typeof liveLocationsMap[selectedIncident.sos_id].accuracy_meters === 'number' && ` (±${Math.round(liveLocationsMap[selectedIncident.sos_id].accuracy_meters as number)}m)`}
                  </span>
                </div>
              )}
            </div>

            {/* Target Status Selector */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                New Triage Status:
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as IncidentStatus)}
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.9rem',
                }}
              >
                <option value="pending">Pending</option>
                <option value="acknowledged">Acknowledged (P1 Assigned)</option>
                <option value="dispatched">Dispatched (Rescue En Route)</option>
                <option value="resolved">Resolved (Completed)</option>
              </select>
            </div>

            {/* Operator Notes Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="operator-notes"
                style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
              >
                {t.operatorDashboard.operatorNotesLabel}:
              </label>
              <textarea
                id="operator-notes"
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                placeholder="e.g. Unit SDRF-4 dispatched via boat. Expected ETA 12 minutes."
                rows={3}
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </div>

            {updateMessage && (
              <div 
                style={{ 
                  padding: '0.6rem', 
                  borderRadius: 'var(--radius-sm)', 
                  marginBottom: '1rem', 
                  fontSize: '0.85rem',
                  backgroundColor: updateMessage.startsWith('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: updateMessage.startsWith('Error') ? '#F87171' : '#34D399',
                }}
              >
                {updateMessage}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                disabled={isUpdating}
                className="btn btn-outline"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {t.operatorDashboard.cancel}
              </button>

              <button
                type="button"
                onClick={handleConfirmStatusUpdate}
                disabled={isUpdating}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                {isUpdating ? 'Saving...' : t.operatorDashboard.saveStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
