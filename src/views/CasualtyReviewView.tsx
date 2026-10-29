// ==============================================================================
// JEEVASCAN AI — AI INCIDENT REVIEW & DECISION SUPPORT VIEW
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Phase 11 — Decision support, hazard identification, and operator guidance
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  AlertTriangle,
  Search,
  ShieldAlert,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Activity,
  FileQuestion,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type { IncidentRecord } from '../types/database';
import { backend } from '../lib/supabase';
import { IncidentReviewPanel } from '../components/IncidentReviewPanel';

interface CasualtyReviewViewProps {
  t: TranslationDict;
  onNavigate: (view: NavView) => void;
  initialSelectedSosId?: string | null;
}

export const CasualtyReviewView: React.FC<CasualtyReviewViewProps> = ({
  t,
  onNavigate,
  initialSelectedSosId = null,
}) => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(initialSelectedSosId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [attachedImage, setAttachedImage] = useState<{ url: string; description: string } | null>(null);

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
        console.warn('Error loading incidents for review:', err);
      });
  }, [selectedIncidentId]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (categoryFilter !== 'all' && inc.emergency_type !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mId = inc.sos_id.toLowerCase().includes(q);
        const mDesc = inc.description?.toLowerCase().includes(q);
        const mLandmark = inc.location_name?.toLowerCase().includes(q);
        if (!mId && !mDesc && !mLandmark) return false;
      }
      return true;
    });
  }, [incidents, categoryFilter, searchQuery]);

  const selectedIncident = useMemo(() => {
    return incidents.find((i) => i.sos_id === selectedIncidentId) || null;
  }, [incidents, selectedIncidentId]);

  const handleLaunchDrone = (_incident: IncidentRecord) => {
    onNavigate('drone-simulator');
  };

  const handleSimulateImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const simulatedUrl = URL.createObjectURL(file);
      setAttachedImage({
        url: simulatedUrl,
        description: `Operator provided image: "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Visual observation only.`,
      });
    }
  };

  return (
    <div className="container" style={{ padding: '1.5rem 1rem 4rem', maxWidth: '1440px' }}>
      {/* 1. HEADER & MANDATORY OPERATIONAL NOTICE */}
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
                backgroundColor: 'rgba(13, 148, 136, 0.1)',
                color: '#0D9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
                {t.review.pageTitle || 'AI-Assisted Incident Review'}
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                {t.review.pageSubtitle || 'Automated rule-based triage assessment, hazard extraction, and human verification checklist.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(13, 148, 136, 0.12)',
                color: '#0D9488',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              Deterministic Rule Engine Active
            </span>
          </div>
        </div>

        {/* Mandatory Safety Alert */}
        <div
          style={{
            marginTop: '0.75rem',
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
            <strong>Medical & Dispatch Safety Notice:</strong> AI incident reviews are advisory decision-support tools for human triage operators. They do NOT provide medical diagnoses, assess survivability, or autonomously dispatch emergency units. For urgent life threats, dial local authorities (112 / 100 / 108).
          </span>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 380px) 1fr',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Incident Selector List */}
        <div
          className="glass-panel"
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-medium)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--color-navy)' }}>
            Select Emergency Incident ({filteredIncidents.length})
          </h3>

          {/* Search Input */}
          <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter by SOS ID, text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{
                width: '100%',
                paddingLeft: '32px',
                fontSize: '0.775rem',
                borderRadius: 'var(--radius-sm)',
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field"
            style={{ width: '100%', fontSize: '0.775rem', marginBottom: '0.85rem' }}
          >
            <option value="all">All Emergency Categories</option>
            <option value="flood">Flood</option>
            <option value="trapped">Trapped / Collapsed</option>
            <option value="medical">Medical</option>
            <option value="fire">Fire</option>
            <option value="building_collapse">Building Collapse</option>
          </select>

          {/* Incidents List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '550px', overflowY: 'auto' }}>
            {filteredIncidents.map((inc) => {
              const isSelected = inc.sos_id === selectedIncidentId;
              const isCritical = inc.priority === 'critical';

              return (
                <div
                  key={inc.sos_id}
                  onClick={() => setSelectedIncidentId(inc.sos_id)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${isSelected ? '#0D9488' : 'var(--border-subtle)'}`,
                    backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.06)' : '#FAFCFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-out',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.825rem', color: isSelected ? '#0D9488' : 'var(--color-navy)' }}>
                      {inc.sos_id.slice(0, 8)}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
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
                    {inc.description ? inc.description.slice(0, 75) + '...' : 'No details'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span style={{ textTransform: 'capitalize' }}>{inc.emergency_type}</span>
                    <span>Status: {inc.status}</span>
                  </div>
                </div>
              );
            })}

            {filteredIncidents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <FileQuestion size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <span>No incidents match the search criteria.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Incident Review Panel & Image Decision Support */}
        <div>
          {selectedIncident ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <IncidentReviewPanel
                t={t}
                incident={selectedIncident}
                onLaunchDroneSim={handleLaunchDrone}
              />

              {/* Optional Aerial / Incident Imagery Inspection */}
              <div
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Eye size={18} color="#0284C7" />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                      Optional Aerial / Bystander Imagery Inspection
                    </h4>
                  </div>
                  <label
                    className="btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--color-navy)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Upload size={13} />
                    <span>Upload Incident Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSimulateImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {attachedImage ? (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ width: '160px', height: '110px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
                      <img src={attachedImage.url} alt="Incident Inspection" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px', fontSize: '0.775rem' }}>
                      <p style={{ margin: '0 0 0.4rem 0', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {attachedImage.description}
                      </p>
                      <div style={{ padding: '0.5rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', color: '#92400e', fontSize: '0.725rem' }}>
                        <strong>Image Safety Protocol:</strong> Visual analysis is strictly for identifying structural barriers (flooded streets, roof access). It does NOT confirm that trapped persons are uninjured or safe. Human triage required.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '1.25rem',
                      border: '1px dashed var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.775rem',
                    }}
                  >
                    <ImageIcon size={22} style={{ margin: '0 auto 0.35rem', opacity: 0.5 }} />
                    <p style={{ margin: '0 0 0.25rem 0' }}>
                      No imagery attached to this incident record.
                    </p>
                    <span style={{ fontSize: '0.7rem' }}>
                      Operators may upload verified bystander or drone reconnaissance photos for decision-support annotation.
                    </span>
                  </div>
                )}
              </div>
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
              <AlertTriangle size={32} style={{ margin: '0 auto 0.75rem', color: '#D97706', opacity: 0.7 }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-navy)' }}>No Incident Selected</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Select an emergency incident from the left panel to generate an automated triage review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
