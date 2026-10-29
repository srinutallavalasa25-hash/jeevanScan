// ==============================================================================
// JEEVASCAN AI — JEEVADROP RELIEF SUPPLY COORDINATION VIEW
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Phase 12 — Structured supply requests, 6-state lifecycle & simulated fulfillment
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
  Package,
  Droplets,
  Utensils,
  HeartPulse,
  Pill,
  Sun,
  Baby,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  ShieldCheck,
  Truck,
  XCircle,
  Search,
  Filter,
  ArrowRight,
  MapPin,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type {
  JeevaDropRequest,
  JeevaDropStatus,
  ReliefItemCategory,
} from '../types/phase12';
import {
  RELIEF_ITEM_CATALOG,
  SIMULATED_FULFILLMENT_NOTICE,
  MEDICINE_SAFETY_WARNING,
  createJeevaDropRequest,
  updateJeevaDropStatus,
  cancelJeevaDropRequest,
  listJeevaDropRequests,
} from '../lib/relief/jeevaDropStore';

interface ReliefRequestViewProps {
  t: TranslationDict;
  onNavigate?: (view: NavView) => void;
  initialSosId?: string | null;
}

export const ReliefRequestView: React.FC<ReliefRequestViewProps> = ({
  t,
  onNavigate,
  initialSosId,
}) => {
  // Form State
  const [itemCategory, setItemCategory] = useState<ReliefItemCategory>('potable_water');
  const [quantity, setQuantity] = useState<number>(5);
  const [urgency, setUrgency] = useState<'critical' | 'urgent' | 'standard'>('urgent');
  const [sosId, setSosId] = useState<string>(initialSosId || '');
  const [locationName, setLocationName] = useState<string>('');
  const [floorLevel, setFloorLevel] = useState<string>('Ground Floor');
  const [landmark, setLandmark] = useState<string>('');
  const [justification, setJustification] = useState<string>('');

  // UI State
  const [activeTab, setActiveTab] = useState<'request' | 'pipeline'>('request');
  const [requests, setRequests] = useState<JeevaDropRequest[]>(() => {
    try {
      return listJeevaDropRequests();
    } catch {
      return [];
    }
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Operator Action Modal
  const [selectedRequest, setSelectedRequest] = useState<JeevaDropRequest | null>(null);
  const [targetStatus, setTargetStatus] = useState<JeevaDropStatus>('approved');
  const [operatorNotes, setOperatorNotes] = useState<string>('');

  const catalogSpec = RELIEF_ITEM_CATALOG[itemCategory] || RELIEF_ITEM_CATALOG.potable_water;

  // Load stored requests
  const loadRequests = () => {
    try {
      const all = listJeevaDropRequests();
      setRequests(all);
    } catch (err) {
      console.warn('Could not read JeevaDrop requests store:', err);
    }
  };

  // Filtered requests for pipeline
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (urgencyFilter !== 'all' && req.urgency !== urgencyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mCode = req.requestCode.toLowerCase().includes(q);
        const mSos = req.sosId?.toLowerCase().includes(q);
        const mItem = req.itemName.toLowerCase().includes(q);
        const mLoc = req.deliveryLocation.locationName?.toLowerCase().includes(q);
        const mJust = req.justification.toLowerCase().includes(q);
        if (!mCode && !mSos && !mItem && !mLoc && !mJust) return false;
      }
      return true;
    });
  }, [requests, statusFilter, urgencyFilter, searchQuery]);

  const handleSubmit = (startAsDraft = false) => {
    setStatusMessage(null);

    if (!justification.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please provide situation details and justification for the supply allocation.',
      });
      return;
    }

    try {
      const created = createJeevaDropRequest({
        sosId: sosId.trim() ? sosId.trim().toUpperCase() : null,
        itemCategory,
        quantity,
        deliveryLocation: {
          locationName: locationName.trim() || 'Designated Delivery Area',
          floorLevel: floorLevel.trim() || 'Ground Floor',
          landmark: landmark.trim() || null,
        },
        urgency,
        justification: justification.trim(),
        startAsDraft,
      });

      setStatusMessage({
        type: 'success',
        text: `Request registered successfully! Code: ${created.requestCode}. Stored locally for operator triage.`,
      });

      // Reset form fields
      setJustification('');
      setLocationName('');
      setLandmark('');
      loadRequests();
      setActiveTab('pipeline');
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to register relief request',
      });
    }
  };

  const handleOpenStatusModal = (req: JeevaDropRequest, nextStatus: JeevaDropStatus) => {
    setSelectedRequest(req);
    setTargetStatus(nextStatus);
    setOperatorNotes('');
  };

  const handleConfirmStatusChange = () => {
    if (!selectedRequest) return;
    try {
      updateJeevaDropStatus(
        selectedRequest.id,
        targetStatus,
        'OP-COORDINATOR-DEMO',
        operatorNotes.trim() || undefined
      );
      setSelectedRequest(null);
      loadRequests();
      setStatusMessage({
        type: 'success',
        text: `Request ${selectedRequest.requestCode} updated to ${targetStatus.replace('_', ' ').toUpperCase()}.`,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleCancelRequest = (req: JeevaDropRequest) => {
    const reason = window.prompt(`Reason for cancelling request ${req.requestCode}:`, 'Citizen moved to higher shelter or supplies fulfilled locally');
    if (!reason) return;
    try {
      cancelJeevaDropRequest(req.id, reason);
      loadRequests();
      setStatusMessage({
        type: 'warning',
        text: `Request ${req.requestCode} cancelled.`,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cancellation failed');
    }
  };

  const getItemIcon = (cat: ReliefItemCategory) => {
    switch (cat) {
      case 'potable_water': return <Droplets size={18} color="#0284C7" />;
      case 'survival_rations': return <Utensils size={18} color="#D97706" />;
      case 'first_aid_kit': return <HeartPulse size={18} color="#DC2626" />;
      case 'essential_medicines': return <Pill size={18} color="#9333EA" />;
      case 'thermal_blankets': return <Sun size={18} color="#EA580C" />;
      case 'infant_supplies': return <Baby size={18} color="#0D9488" />;
      case 'hygiene_sanitation': return <Sparkles size={18} color="#2563EB" />;
      default: return <Package size={18} color="#64748B" />;
    }
  };

  const getStatusBadge = (status: JeevaDropStatus) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-subtle">DRAFT</span>;
      case 'submitted':
        return <span className="badge badge-amber">SUBMITTED</span>;
      case 'under_review':
        return <span className="badge badge-cyan">UNDER REVIEW</span>;
      case 'approved':
        return <span className="badge badge-teal">APPROVED</span>;
      case 'simulated_fulfillment':
        return <span className="badge badge-purple" style={{ background: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE' }}>SIMULATED DELIVERY</span>;
      case 'completed':
        return <span className="badge badge-emerald">COMPLETED</span>;
      case 'cancelled':
        return <span className="badge badge-red">CANCELLED</span>;
      default:
        return <span className="badge badge-subtle">{status}</span>;
    }
  };

  const isMedicalCategory = itemCategory === 'first_aid_kit' || itemCategory === 'essential_medicines';

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 4.5rem', maxWidth: '1080px' }}>
      {/* 1. Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="badge badge-amber" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', gap: '0.4rem' }}>
            <Package size={14} />
            Phase 12 — JeevaDrop Supply Coordination
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', marginBottom: '0.5rem', fontWeight: 800 }}>
          {t.drop?.pageTitle || 'JeevaDrop Relief Supply Coordination'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '720px', margin: '0 auto' }}>
          {t.drop?.pageSubtitle || 'Structured catalog for critical emergency supplies, 6-state verification lifecycle, and simulated fulfillment tracking.'}
        </p>
      </div>

      {/* 2. Mandatory Simulation Notice Banner */}
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1.25rem',
          fontSize: '0.825rem',
          color: '#B45309',
          marginBottom: '1.75rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}
      >
        <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#D97706' }} />
        <div>
          <strong style={{ display: 'block', color: '#92400E', lineHeight: 1.5, marginBottom: '0.2rem' }}>
            DEMO RELIEF SIMULATION NOTICE:
          </strong>
          <span>{SIMULATED_FULFILLMENT_NOTICE}</span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('request')}
            className={`btn ${activeTab === 'request' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
          >
            <Package size={16} />
            <span>Request Relief Supplies</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('pipeline');
              loadRequests();
            }}
            className={`btn ${activeTab === 'pipeline' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
          >
            <History size={16} />
            <span>Fulfillment Pipeline ({requests.length})</span>
          </button>
        </div>

        {onNavigate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('flood-rescue')}
              className="btn btn-outline"
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
            >
              <span>Flood Rescue Mode</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigate('rescue-map')}
              className="btn btn-outline"
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
            >
              <span>Rescue Map</span>
              <ExternalLink size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background:
              statusMessage.type === 'success'
                ? '#F0FDFA'
                : statusMessage.type === 'warning'
                ? '#FFEDD5'
                : '#FEE2E2',
            border: `1px solid ${
              statusMessage.type === 'success'
                ? '#99F6E4'
                : statusMessage.type === 'warning'
                ? '#FED7AA'
                : '#FECACA'
            }`,
            color:
              statusMessage.type === 'success'
                ? '#0F766E'
                : statusMessage.type === 'warning'
                ? '#C2410C'
                : '#DC2626',
          }}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={18} color="#10B981" />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 4. Tab 1: Request Supplies Form */}
      {activeTab === 'request' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            Structured Relief Supply Request
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Log structured requests for marooned victims, rooftop evacuees, or flood shelters.
          </p>

          {/* Medicine Safety Notice */}
          {isMedicalCategory && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem 1.15rem',
                marginBottom: '1.5rem',
                fontSize: '0.825rem',
                color: '#B91C1C',
                display: 'flex',
                gap: '0.65rem',
              }}
            >
              <Info size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#DC2626' }} />
              <div>
                <strong>Prescription & Controlled Medicine Restriction:</strong>
                <p style={{ margin: '0.2rem 0 0', lineHeight: 1.45 }}>
                  {MEDICINE_SAFETY_WARNING}
                </p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
            {/* Item Category Catalog Picker */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Select Emergency Supply Category:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {(Object.keys(RELIEF_ITEM_CATALOG) as ReliefItemCategory[]).map((key) => {
                  const item = RELIEF_ITEM_CATALOG[key];
                  const isSelected = itemCategory === key;
                  return (
                    <div
                      key={key}
                      onClick={() => {
                        setItemCategory(key);
                        setQuantity(Math.min(quantity, item.maxPerRequest));
                      }}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '2px solid #0284C7' : '1px solid var(--border-medium)',
                        background: isSelected ? '#F0F9FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div className="flex items-center gap-2" style={{ marginBottom: '0.35rem' }}>
                        {getItemIcon(key)}
                        <strong style={{ fontSize: '0.875rem', color: isSelected ? '#0369A1' : 'var(--text-primary)' }}>
                          {item.name}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                        Max {item.maxPerRequest} {item.defaultUnit} per drop • {item.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity & Urgency Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Quantity ({catalogSpec.defaultUnit}):
                </label>
                <input
                  type="number"
                  min={1}
                  max={catalogSpec.maxPerRequest}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(catalogSpec.maxPerRequest, parseInt(e.target.value) || 1)))}
                  className="input-field"
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.3rem' }}>
                  Allowable maximum: {catalogSpec.maxPerRequest} {catalogSpec.defaultUnit}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Urgency Level:
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as 'critical' | 'urgent' | 'standard')}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="critical">Critical (Immediate life hazard / trapped)</option>
                  <option value="urgent">Urgent (Supply depleted within 12 hours)</option>
                  <option value="standard">Standard (Precautionary / replenishment)</option>
                </select>
              </div>
            </div>

            {/* Location Details & Floor Level */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Delivery Destination / Address:
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Near Moosarambagh Bridge, House #4-21"
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Structure / Floor Level:
                </label>
                <select
                  value={floorLevel}
                  onChange={(e) => setFloorLevel(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="Rooftop / Terrace">Rooftop / Terrace (High water clearance)</option>
                  <option value="Second Floor or Higher">Second Floor or Higher</option>
                  <option value="First Floor">First Floor</option>
                  <option value="Ground Floor">Ground Floor</option>
                  <option value="Relief Camp Center">Relief Camp Center</option>
                </select>
              </div>
            </div>

            {/* Landmark & Associated SOS ID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Visible Visual Landmark (for UAV / boat spotters):
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Blue water tank on roof, yellow cloth tied to rail"
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Linked SOS Incident ID (Optional):
                </label>
                <input
                  type="text"
                  value={sosId}
                  onChange={(e) => setSosId(e.target.value.toUpperCase())}
                  placeholder="e.g. SOS-HYD-001"
                  className="input-field"
                  style={{ width: '100%', fontFamily: 'monospace', textTransform: 'uppercase' }}
                />
              </div>
            </div>

            {/* Justification Rationale */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Situation Details & Allocation Rationale: *
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="State the number of affected persons, water condition, and why these supplies are urgently required..."
                rows={3}
                className="input-field"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center gap-3" style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                className="btn btn-amber"
                style={{ padding: '0.85rem 1.6rem', fontSize: '0.95rem' }}
              >
                <Package size={18} />
                <span>Submit Relief Request</span>
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="btn btn-outline"
                style={{ padding: '0.85rem 1.4rem', fontSize: '0.95rem' }}
              >
                <span>Save as Draft</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Relief Coordination Pipeline (Operator View) */}
      {activeTab === 'pipeline' && (
        <div>
          {/* Filters Bar */}
          <div
            className="glass-panel"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code, SOS ID, item, or destination..."
                className="input-field"
                style={{ width: '100%', paddingLeft: '2.4rem' }}
              />
            </div>

            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <div className="flex items-center gap-2">
                <Filter size={15} style={{ color: 'var(--text-muted)' }} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                >
                  <option value="all">All Lifecycle Stages</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="simulated_fulfillment">Simulated Fulfillment</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                >
                  <option value="all">All Urgency Levels</option>
                  <option value="critical">Critical</option>
                  <option value="urgent">Urgent</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
              <Package size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4, color: 'var(--text-muted)' }} />
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>No relief requests found</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                No requests match the selected filters. Use the "Request Relief Supplies" tab to register one.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="glass-panel"
                  style={{
                    padding: '1.35rem',
                    borderLeft:
                      req.urgency === 'critical'
                        ? '4px solid #EF4444'
                        : req.urgency === 'urgent'
                        ? '4px solid #F59E0B'
                        : '4px solid #0284C7',
                  }}
                >
                  <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-subtle" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {req.requestCode}
                      </span>
                      {getStatusBadge(req.status)}
                      <span
                        className={`badge ${
                          req.urgency === 'critical'
                            ? 'badge-red'
                            : req.urgency === 'urgent'
                            ? 'badge-amber'
                            : 'badge-subtle'
                        }`}
                        style={{ fontSize: '0.725rem' }}
                      >
                        {req.urgency.toUpperCase()}
                      </span>
                      {req.isHumanVerified && (
                        <span className="badge badge-emerald" style={{ gap: '0.3rem', fontSize: '0.7rem' }}>
                          <ShieldCheck size={12} />
                          Operator Verified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <Clock size={13} />
                      <span>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#FFFFFF',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getItemIcon(req.itemCategory)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {req.quantityRequested} {req.quantityUnit} — {req.itemName}
                      </div>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {req.justification}
                      </p>
                    </div>
                  </div>

                  {/* Meta details & location */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '1.25rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <MapPin size={14} style={{ color: '#0284C7' }} />
                      <span><strong>Destination:</strong> {req.deliveryLocation.locationName} ({req.deliveryLocation.floorLevel})</span>
                    </div>

                    {req.deliveryLocation.landmark && (
                      <div>
                        <strong>Landmark:</strong> {req.deliveryLocation.landmark}
                      </div>
                    )}

                    {req.sosId && (
                      <div>
                        <strong>Linked Incident:</strong>{' '}
                        <span style={{ fontFamily: 'monospace', color: '#0284C7', fontWeight: 600 }}>
                          {req.sosId}
                        </span>
                      </div>
                    )}

                    {req.operatorNotes && (
                      <div style={{ width: '100%', color: '#475569', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.4rem' }}>
                        <strong>Operator Log:</strong> {req.operatorNotes}
                      </div>
                    )}
                  </div>

                  {/* Operator Lifecycle Action Toolbar */}
                  <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div className="flex items-center gap-2">
                      {/* State Transitions */}
                      {req.status === 'draft' && (
                        <button
                          onClick={() => handleOpenStatusModal(req, 'submitted')}
                          className="btn btn-amber"
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          <span>Submit Request</span>
                          <ChevronRight size={14} />
                        </button>
                      )}

                      {req.status === 'submitted' && (
                        <button
                          onClick={() => handleOpenStatusModal(req, 'under_review')}
                          className="btn btn-cyan"
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          <span>Review Request</span>
                          <ChevronRight size={14} />
                        </button>
                      )}

                      {(req.status === 'submitted' || req.status === 'under_review') && (
                        <button
                          onClick={() => handleOpenStatusModal(req, 'approved')}
                          className="btn btn-teal"
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Approve Allocation</span>
                        </button>
                      )}

                      {req.status === 'approved' && (
                        <button
                          onClick={() => handleOpenStatusModal(req, 'simulated_fulfillment')}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          <Truck size={14} />
                          <span>Simulate Delivery</span>
                        </button>
                      )}

                      {req.status === 'simulated_fulfillment' && (
                        <button
                          onClick={() => handleOpenStatusModal(req, 'completed')}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', color: '#10B981', borderColor: '#10B981' }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Mark Completed</span>
                        </button>
                      )}

                      {req.status !== 'completed' && req.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelRequest(req)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        >
                          <XCircle size={14} />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>

                    {/* Contextual links */}
                    {onNavigate && req.sosId && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigate('drone-simulator')}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                        >
                          <span>Simulate Drone Drop</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Operator Action Confirmation Modal */}
      {selectedRequest && (
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
              maxWidth: '520px',
              padding: '1.75rem',
              border: '1px solid var(--border-medium)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Advance Request Lifecycle
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Advancing <strong>{selectedRequest.requestCode}</strong> ({selectedRequest.itemName}) to{' '}
              <strong style={{ color: '#0284C7', textTransform: 'uppercase' }}>
                {targetStatus.replace('_', ' ')}
              </strong>.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Operator Triage Notes / Verification Justification:
              </label>
              <textarea
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                placeholder="e.g. Allocation verified against ground SDRF boat team. Simulated dispatch route confirmed."
                rows={3}
                className="input-field"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="btn btn-outline"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Confirm State Transition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
