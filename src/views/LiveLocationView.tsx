import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  ShieldCheck, 
  MapPin, 
  AlertTriangle, 
  Radio, 
  Map, 
  Search, 
  CheckCircle,
  EyeOff,
  Compass
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import { LiveLocationSharingCard } from '../components/LiveLocationSharingCard';
import { getCitizenToken } from '../lib/location/liveLocationManager';
import { backend } from '../lib/supabase';
import type { IncidentRecord } from '../types/database';

interface LiveLocationViewProps {
  t: TranslationDict;
  onNavigate: (view: NavView) => void;
  activeSosId?: string | null;
}

export const LiveLocationView: React.FC<LiveLocationViewProps> = ({
  t,
  onNavigate,
  activeSosId,
}) => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedSosId, setSelectedSosId] = useState<string>(activeSosId || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [manualInput, setManualInput] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    backend.fetchIncidents()
      .then((data) => {
        if (mounted) {
          setIncidents(data);
          if (!selectedSosId && data.length > 0) {
            // Select the most recent active incident by default
            const activeInc = data.find((i) => i.status !== 'resolved' && i.status !== 'cancelled');
            setSelectedSosId(activeInc ? activeInc.sos_id : data[0].sos_id);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load incidents for live location:', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedSosId]);

  const selectedIncident = incidents.find((i) => i.sos_id === selectedSosId || i.id === selectedSosId);
  const token = selectedSosId ? getCitizenToken(selectedSosId) : null;

  const handleManualSelect = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      setSelectedSosId(manualInput.trim());
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem 4rem', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
            }}
          >
            <Navigation size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>
                {t.liveLocation.cardTitle}
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                Phase 9 / 9.1 Telemetry
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
              {t.liveLocation.cardSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Incident Selector Controls */}
      <div 
        className="glass-panel" 
        style={{ 
          marginBottom: '2rem', 
          padding: '1.25rem',
          background: 'rgba(16, 42, 67, 0.65)',
          border: '1px solid #243B53'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 300px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Target Emergency Incident:
            </label>
            {incidents.length > 0 ? (
              <select
                aria-label="Select Target Emergency Incident"
                value={selectedSosId}
                onChange={(e) => setSelectedSosId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  background: 'rgba(10, 25, 47, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {incidents.map((inc) => (
                  <option key={inc.sos_id} value={inc.sos_id}>
                    {inc.sos_id.slice(0, 8)}... — [{inc.emergency_type.toUpperCase()}] {inc.description.slice(0, 45)} ({inc.status})
                  </option>
                ))}
              </select>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                {loading ? 'Loading incidents...' : 'No incident reports found in local store.'}
              </p>
            )}
          </div>

          {/* Manual ID Input */}
          <form onSubmit={handleManualSelect} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Or Enter Custom SOS ID:
              </label>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste sos_id..."
                style={{
                  padding: '0.65rem 0.9rem',
                  background: 'rgba(10, 25, 47, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  width: '180px',
                }}
              />
            </div>
            <button type="submit" className="btn btn-outline" style={{ padding: '0.65rem 1rem' }}>
              <Search size={16} />
              <span>Load</span>
            </button>
          </form>
        </div>

        {/* Selected Incident Context Strip */}
        {selectedIncident && (
          <div 
            style={{ 
              marginTop: '1rem', 
              paddingTop: '0.85rem', 
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.25rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}
          >
            <div>
              <strong style={{ color: '#FFFFFF' }}>Type:</strong>{' '}
              <span className="badge badge-amber" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {selectedIncident.emergency_type}
              </span>
            </div>
            <div>
              <strong style={{ color: '#FFFFFF' }}>Status:</strong>{' '}
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {selectedIncident.status}
              </span>
            </div>
            <div>
              <strong style={{ color: '#FFFFFF' }}>Initial GPS:</strong>{' '}
              {selectedIncident.latitude ? `${selectedIncident.latitude.toFixed(4)}, ${selectedIncident.longitude?.toFixed(4)}` : 'Manual / None'}
            </div>
            <div>
              <strong style={{ color: '#FFFFFF' }}>Priority:</strong>{' '}
              <span style={{ color: '#F87171', fontWeight: 600 }}>{selectedIncident.priority.toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Active Sharing Card */}
      {selectedSosId ? (
        <div style={{ marginBottom: '2.5rem' }}>
          <LiveLocationSharingCard
            t={t}
            sosId={selectedSosId}
            updateTokenHash={token}
          />
        </div>
      ) : (
        <div 
          className="glass-panel" 
          style={{ 
            textAlign: 'center', 
            padding: '3rem 1.5rem', 
            marginBottom: '2.5rem',
            border: '1px dashed var(--border-subtle)' 
          }}
        >
          <Compass size={40} style={{ color: '#38BDF8', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No SOS Incident Selected</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            To begin live location broadcasting, select an active SOS incident above or submit a new emergency report.
          </p>
          <button onClick={() => onNavigate('send-sos')} className="btn btn-sos">
            <AlertTriangle size={18} />
            <span>Submit New SOS</span>
          </button>
        </div>
      )}

      {/* Privacy, Security & Technical Architecture Cards */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700 }}>
        Location Privacy & Browser Boundaries
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem', color: '#34D399' }}>
            <CheckCircle size={18} />
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Explicit Consent Gate</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Location telemetry is never transmitted in the background. It only activates after an explicit click on "Start Live Sharing" and halts immediately when revoked.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem', color: '#38BDF8' }}>
            <ShieldCheck size={18} />
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Cryptographic Token Security</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Phase 9.1 stores only SHA-256 digests. Only the browser session holding the original submission bearer token is permitted to append telemetry updates.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem', color: '#FBBF24' }}>
            <MapPin size={18} />
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Original GPS Preservation</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Live location updates are strictly stored as supplementary telemetry in <code>jeevascan_location_updates</code>. The original distress GPS is never overwritten.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem', color: '#F87171' }}>
            <EyeOff size={18} />
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Foregound-Only Operation</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Standard browser sandboxing limits Geolocation API updates to active browser tabs. Closing or putting the tab into background stops live transmission.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem', color: '#A78BFA' }}>
            <Radio size={18} />
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Rate Limiting & Accuracy Caps</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Updates are throttled to a minimum 10-second interval, capped at 500 records per incident, and reject readings with accuracy coarser than 500 meters.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem', color: '#38BDF8' }}>
            <Compass size={18} />
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Stale-Data Transparency</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Readings older than 10 minutes are visually flagged as "Stale" on the Rescue Map and Operator Command desk to prevent dispatchers from acting on outdated positions.
          </p>
        </div>
      </div>

      {/* Navigation Footer */}
      <div 
        className="glass-panel" 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          border: '1px solid #243B53'
        }}
      >
        <div>
          <h4 style={{ fontSize: '1rem', margin: '0 0 0.25rem' }}>View Tactical Rescue Map</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            See your live telemetry plotted alongside designated relief camps, shelters, and hospital trauma centers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('citizen-tracker')} 
            className="btn btn-outline"
            style={{ padding: '0.6rem 1.1rem' }}
          >
            <Search size={16} />
            <span>Citizen Tracker</span>
          </button>
          <button 
            onClick={() => onNavigate('rescue-map')} 
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.1rem' }}
          >
            <Map size={16} />
            <span>Open Rescue Map</span>
          </button>
        </div>
      </div>
    </div>
  );
};

