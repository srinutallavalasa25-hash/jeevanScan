import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  Copy,
  Check,
  LifeBuoy,
  EyeOff,
  Flame,
  Waves,
  UserCheck,
  HeartPulse,
  Building2,
  UserX,
  UtensilsCrossed,
  MapPin,
  Navigation,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type { IncidentRecord, LocationUpdateRecord, EmergencyType, IncidentStatus } from '../types/database';
import { backend } from '../lib/supabase';
import { LiveLocationSharingCard } from '../components/LiveLocationSharingCard';
import { getCitizenToken } from '../lib/location/liveLocationManager';

interface CitizenStatusTrackerViewProps {
  t: TranslationDict;
  onNavigate: (view: NavView) => void;
  initialSosId?: string | null;
}

export const CitizenStatusTrackerView: React.FC<CitizenStatusTrackerViewProps> = ({
  t,
  onNavigate,
  initialSosId,
}) => {
  const [searchId, setSearchId] = useState<string>(initialSosId || '');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(Boolean(initialSosId));
  const [matchedIncident, setMatchedIncident] = useState<IncidentRecord | null>(null);
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdateRecord[]>([]);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const performLookup = useCallback(async (idToFind: string) => {
    const cleanId = idToFind.trim().toUpperCase();
    if (!cleanId) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const incidents = await backend.fetchIncidents();
      const match = incidents.find(
        (i) => i.sos_id.toUpperCase() === cleanId || i.id.toUpperCase() === cleanId
      );
      setMatchedIncident(match || null);
    } catch (err) {
      console.warn('Could not read demo incidents store:', err);
      setMatchedIncident(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Auto-search if initialSosId provided
  useEffect(() => {
    let ignore = false;
    if (initialSosId) {
      const cleanId = initialSosId.trim().toUpperCase();
      backend.fetchIncidents()
        .then((incidents) => {
          if (!ignore) {
            const match = incidents.find(
              (i) => i.sos_id.toUpperCase() === cleanId || i.id.toUpperCase() === cleanId
            );
            setMatchedIncident(match || null);
          }
        })
        .catch((err) => {
          if (!ignore) {
            console.warn('Could not read demo incidents store:', err);
            setMatchedIncident(null);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [initialSosId]);

  // Load and subscribe to live location updates for the matched incident
  useEffect(() => {
    if (!matchedIncident) return;

    let ignore = false;
    const fetchUpdates = () => {
      const citizenToken = getCitizenToken(matchedIncident.sos_id) || matchedIncident.update_token_hash;
      backend
        .fetchLocationUpdates(matchedIncident.sos_id, citizenToken)
        .then((updates) => {
          if (!ignore) {
            setLocationUpdates(updates);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch location updates:', err);
        });
    };

    fetchUpdates();

    const handleLocationEvent = () => {
      fetchUpdates();
    };

    window.addEventListener('jeevascan:location_sharing_updated', handleLocationEvent);
    return () => {
      ignore = true;
      window.removeEventListener('jeevascan:location_sharing_updated', handleLocationEvent);
    };
  }, [matchedIncident]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(searchId);
  };

  const handleCopyId = () => {
    if (!matchedIncident) return;
    navigator.clipboard.writeText(matchedIncident.sos_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const getCategoryIcon = (cat: EmergencyType) => {
    switch (cat) {
      case 'flood': return <Waves size={18} className="text-cyan" />;
      case 'trapped': return <UserCheck size={18} style={{ color: '#F59E0B' }} />;
      case 'medical': return <HeartPulse size={18} style={{ color: '#EF4444' }} />;
      case 'fire': return <Flame size={18} style={{ color: '#F97316' }} />;
      case 'building_collapse': return <Building2 size={18} style={{ color: '#E11D48' }} />;
      case 'missing_person': return <UserX size={18} style={{ color: '#A855F7' }} />;
      case 'food_water_shortage': return <UtensilsCrossed size={18} style={{ color: '#38BDF8' }} />;
      default: return <HelpCircle size={18} style={{ color: '#94A3B8' }} />;
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-amber">{t.statusTracker.statuses.pending}</span>;
      case 'acknowledged':
        return <span className="badge badge-blue">{t.statusTracker.statuses.acknowledged}</span>;
      case 'dispatched':
        return <span className="badge badge-red">{t.statusTracker.statuses.dispatched}</span>;
      case 'resolved':
        return <span className="badge badge-emerald">{t.statusTracker.statuses.resolved}</span>;
      default:
        return <span className="badge badge-subtle">{status}</span>;
    }
  };

  const getReassuranceMessage = (status: IncidentStatus) => {
    switch (status) {
      case 'pending':
        return t.statusTracker.reassurance.pending;
      case 'acknowledged':
        return t.statusTracker.reassurance.acknowledged;
      case 'dispatched':
        return t.statusTracker.reassurance.dispatched;
      case 'resolved':
        return t.statusTracker.reassurance.resolved;
      default:
        return t.statusTracker.reassurance.pending;
    }
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 4rem', maxWidth: '780px' }}>
      {/* 1. Header & Title */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="badge badge-subtle" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>
            <ShieldCheck size={14} color="#38BDF8" />
            Public Civilian Portal
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.3rem)', marginBottom: '0.5rem', fontWeight: 800 }}>
          {t.statusTracker.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '560px', margin: '0 auto' }}>
          {t.statusTracker.subtitle}
        </p>
      </div>

      {/* 2. Mandatory Simulation Disclaimer Notice */}
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1.25rem',
          fontSize: '0.825rem',
          color: '#FCD34D',
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}
      >
        <LifeBuoy size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#F59E0B' }} />
        <div>
          <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#FDE68A' }}>
            {t.statusTracker.prototypeNotice}
          </strong>
        </div>
      </div>

      {/* 3. Lookup Search Box */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="sos-tracker-id"
            style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            {t.statusTracker.inputLabel}
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              id="sos-tracker-id"
              type="text"
              className="input-field"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              placeholder={t.statusTracker.inputPlaceholder}
              autoComplete="off"
              spellCheck="false"
              style={{
                flex: '1 1 240px',
                fontFamily: 'monospace',
                fontSize: '1rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            />
            <button
              id="sos-tracker-search-btn"
              type="submit"
              disabled={isSearching || !searchId.trim()}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', minWidth: '160px' }}
            >
              {isSearching ? (
                <span>{t.statusTracker.searching}</span>
              ) : (
                <>
                  <Search size={18} />
                  <span>{t.statusTracker.searchBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Privacy & Zero-PII Guarantee Notice */}
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <EyeOff size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#94A3B8' }} />
          <span>{t.statusTracker.privacyNotice}</span>
        </div>
      </div>

      {/* 4. Search Results */}
      {hasSearched && (
        <div>
          {matchedIncident ? (
            <div
              className="glass-panel"
              style={{
                padding: '2rem',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {/* Header with Tracking ID & Copy */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  paddingBottom: '1.25rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    {t.statusTracker.sosIdLabel}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <code
                      style={{
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        color: 'var(--color-navy)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {matchedIncident.sos_id}
                    </code>
                    <button
                      onClick={handleCopyId}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      title="Copy Tracking ID"
                    >
                      {copiedId ? (
                        <>
                          <Check size={14} color="#10B981" />
                          <span style={{ color: '#10B981' }}>{t.statusTracker.codeCopied}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>{t.statusTracker.copyCodeBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>{getStatusBadge(matchedIncident.status)}</div>
              </div>

              {/* Status Details Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                {/* Submitted Timestamp */}
                <div
                  style={{
                    padding: '0.9rem',
                    background: '#F8FAFC',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    {t.statusTracker.submittedAtLabel}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <Clock size={16} color="var(--color-teal)" />
                    <span>{formatTimestamp(matchedIncident.created_at)}</span>
                  </div>
                </div>

                {/* Emergency Category */}
                <div
                  style={{
                    padding: '0.9rem',
                    background: '#F8FAFC',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    {t.statusTracker.categoryLabel}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                    {getCategoryIcon(matchedIncident.emergency_type)}
                    <span>{matchedIncident.emergency_type.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                {/* Priority */}
                <div
                  style={{
                    padding: '0.9rem',
                    background: '#F8FAFC',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    {t.statusTracker.priorityLabel}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', color: matchedIncident.priority === 'critical' ? 'var(--color-red)' : 'var(--color-orange)' }}>
                    {matchedIncident.priority}
                  </div>
                </div>
              </div>

              {/* Safe Public Reassurance Guidance */}
              <div
                style={{
                  background: '#F0FDFA',
                  border: '1px solid #99F6E4',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--color-teal-dark)',
                    marginBottom: '0.4rem',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{t.statusTracker.reassuranceLabel}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                  {getReassuranceMessage(matchedIncident.status)}
                </p>
              </div>

              {/* Location Comparison Card (Original vs Live) */}
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1.25rem',
                  background: '#F8FAFC',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
                  {/* Original SOS Coordinates */}
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <MapPin size={13} style={{ color: '#F59E0B' }} />
                      {t.liveLocation.originalCoordsLabel}
                    </span>
                    {matchedIncident.latitude !== undefined && matchedIncident.latitude !== null && matchedIncident.longitude !== undefined && matchedIncident.longitude !== null ? (
                      <code style={{ fontSize: '0.85rem', color: 'var(--color-navy)', fontWeight: 700 }}>
                        {matchedIncident.latitude.toFixed(5)}, {matchedIncident.longitude.toFixed(5)}
                        {typeof matchedIncident.accuracy_meters === 'number' && (
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                            (±{Math.round(matchedIncident.accuracy_meters)}m)
                          </span>
                        )}
                      </code>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No initial coordinates recorded
                      </span>
                    )}
                  </div>

                  {/* Latest Live Coordinates */}
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Navigation size={13} style={{ color: '#0D9488' }} />
                      {t.liveLocation.latestCoordsLabel}
                    </span>
                    {locationUpdates.length > 0 ? (
                      <div>
                        <code style={{ fontSize: '0.85rem', color: '#0F766E', fontWeight: 700 }}>
                          {locationUpdates[0].latitude.toFixed(5)}, {locationUpdates[0].longitude.toFixed(5)}
                          {typeof locationUpdates[0].accuracy_meters === 'number' && (
                            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                              (±{Math.round(locationUpdates[0].accuracy_meters)}m)
                            </span>
                          )}
                        </code>
                        <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Reported: {new Date(locationUpdates[0].reported_at).toLocaleTimeString()} ({locationUpdates.length} updates recorded)
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {t.liveLocation.noLiveUpdates}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Phase 9 Live Location Sharing Controls */}
              <div style={{ marginTop: '1.5rem' }}>
                <LiveLocationSharingCard
                  t={t}
                  sosId={matchedIncident.sos_id}
                  updateTokenHash={getCitizenToken(matchedIncident.sos_id) || matchedIncident.update_token_hash}
                />
              </div>
            </div>
          ) : (
            /* Not Found Card */
            <div
              className="glass-panel"
              style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <AlertTriangle size={26} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                {t.statusTracker.notFoundTitle}
              </h3>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '480px',
                  margin: '0 auto 1.5rem',
                  lineHeight: 1.6,
                }}
              >
                {t.statusTracker.notFoundDesc}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => onNavigate('send-sos')}
                  className="btn btn-sos"
                  style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
                >
                  {t.hero.ctaSendSos}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
