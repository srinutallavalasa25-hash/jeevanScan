// ==============================================================================
// JEEVASCAN AI — AI-ASSISTED INCIDENT REVIEW PANEL
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Authoritative decision-support interface for emergency incident triage
// ==============================================================================

import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  Search,
  Crosshair,
  Copy,
  Check,
  Radio,
  Eye,
  Activity,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { IncidentRecord } from '../types/database';
import type { IncidentReviewReport } from '../types/phase11';
import { generateIncidentReview } from '../lib/ai/incidentReviewEngine';

interface IncidentReviewPanelProps {
  t: TranslationDict;
  incident: IncidentRecord;
  onLaunchDroneSim?: (incident: IncidentRecord) => void;
  onAcknowledgeIncident?: (incidentId: string) => void;
}

export const IncidentReviewPanel: React.FC<IncidentReviewPanelProps> = ({
  t,
  incident,
  onLaunchDroneSim,
  onAcknowledgeIncident,
}) => {
  const [report] = useState<IncidentReviewReport>(() => generateIncidentReview(incident));
  const [copied, setCopied] = useState(false);
  const [checkedVerifications, setCheckedVerifications] = useState<Record<number, boolean>>({});

  const handleCopySummary = () => {
    const text = `[JEEVASCAN AI INCIDENT REVIEW - DECISION SUPPORT]\nIncident: ${incident.sos_id}\nType: ${incident.emergency_type}\nPriority: ${incident.priority}\nSummary: ${report.summary}\nReported Facts:\n- ${report.reportedFacts.join('\n- ')}\nMissing Information:\n- ${report.missingInformation.join('\n- ')}\n\nNOTICE: Preliminary decision-support only. Not a medical diagnosis.`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const toggleVerification = (idx: number) => {
    setCheckedVerifications((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EA580C';
      case 'medium':
      default:
        return '#D97706';
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-medium)',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(16, 42, 67, 0.08)',
      }}
    >
      {/* 1. HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(13, 148, 136, 0.12)',
              color: '#0D9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-navy)' }}>
              {t.review.panelTitle || 'AI-Assisted Incident Review'}
            </h3>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              SOS ID: <strong>{incident.sos_id}</strong> • Category: <strong style={{ textTransform: 'capitalize' }}>{incident.emergency_type}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            className="badge"
            style={{
              backgroundColor: incident.priority === 'critical' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(234, 88, 12, 0.12)',
              color: incident.priority === 'critical' ? '#DC2626' : '#EA580C',
              border: `1px solid ${incident.priority === 'critical' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(234, 88, 12, 0.3)'}`,
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            Original Priority: {report.originalPriorityPreserved.toUpperCase()}
          </span>

          <button
            onClick={handleCopySummary}
            className="btn"
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--color-navy)',
            }}
            title="Copy triage brief for operator radio"
          >
            {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Brief'}</span>
          </button>
        </div>
      </div>

      {/* 2. MANDATORY SAFETY DISCLAIMER */}
      <div
        style={{
          padding: '0.65rem 0.85rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          fontSize: '0.75rem',
          color: '#92400e',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
          marginBottom: '1rem',
          lineHeight: 1.4,
        }}
      >
        <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#D97706' }} />
        <span>
          <strong>Decision-Support Notice:</strong> {report.safetyNotice}
        </span>
      </div>

      {/* 3. CONCISE INCIDENT SUMMARY */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(2, 132, 199, 0.05)',
          border: '1px solid rgba(2, 132, 199, 0.2)',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284C7', marginBottom: '0.3rem', fontWeight: 700, fontSize: '0.8rem' }}>
          <FileText size={15} />
          <span>Automated Triage Summary</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
          {report.summary}
        </p>
      </div>

      {/* 4. THREE-PILLAR INFORMATION ISOLATION (Facts / Inferences / Missing) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        {/* Reported Facts */}
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0F172A', fontWeight: 700, fontSize: '0.775rem', marginBottom: '0.4rem' }}>
            <CheckCircle2 size={14} color="#059669" />
            <span>Reported Facts (Direct Evidence)</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {report.reportedFacts.map((fact, i) => (
              <li key={`fact-${i}`} style={{ marginBottom: '0.25rem' }}>{fact}</li>
            ))}
          </ul>
        </div>

        {/* Inferred Possibilities */}
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0F172A', fontWeight: 700, fontSize: '0.775rem', marginBottom: '0.4rem' }}>
            <Info size={14} color="#0284C7" />
            <span>Inferred Possibilities (Heuristics)</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {report.inferredPossibilities.map((inf, i) => (
              <li key={`inf-${i}`} style={{ marginBottom: '0.25rem' }}>{inf}</li>
            ))}
          </ul>
        </div>

        {/* Missing Information */}
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#991B1B', fontWeight: 700, fontSize: '0.775rem', marginBottom: '0.4rem' }}>
            <Search size={14} color="#DC2626" />
            <span>Missing Information (Gaps)</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: '#7F1D1D', lineHeight: 1.4 }}>
            {report.missingInformation.map((miss, i) => (
              <li key={`miss-${i}`} style={{ marginBottom: '0.25rem' }}>{miss}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 5. EXTRACTED HAZARDS & URGENCY RATIONALE */}
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={15} color="#EA580C" />
          <span>Extracted Hazard Factors & Urgency Rationale</span>
        </h4>

        {report.extractedHazards.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {report.extractedHazards.map((h) => (
              <div
                key={h.id}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${getSeverityColor(h.severity)}`,
                  fontSize: '0.725rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: getSeverityColor(h.severity),
                  }}
                />
                <strong style={{ color: 'var(--color-navy)' }}>{h.hazard}:</strong>
                <span style={{ color: 'var(--text-muted)' }}>"{h.evidenceText}"</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>
            No specific acute hazard keywords detected in citizen description.
          </p>
        )}

        {/* Triggered Rule Justifications */}
        {report.urgencyRationale.length > 0 && (
          <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-subtle)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-navy)', display: 'block', marginBottom: '0.2rem' }}>
              Transparent Rule Justifications:
            </span>
            {report.urgencyRationale.map((rule) => (
              <div key={rule.ruleId} style={{ marginBottom: '0.2rem' }}>
                <code>[{rule.ruleId}]</code>: {rule.title} — <em>{rule.description}</em>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. OPERATOR VERIFICATION CHECKLIST & COORDINATION STEPS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {/* Verification Checklist */}
        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FFFFFF', border: '1px solid var(--border-medium)' }}>
          <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.775rem', fontWeight: 700, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Crosshair size={14} color="#0284C7" />
            <span>Human Operator Verification Checklist</span>
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {report.suggestedVerifications.map((v, idx) => (
              <label
                key={`verif-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.45rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  color: checkedVerifications[idx] ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: checkedVerifications[idx] ? 'line-through' : 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(checkedVerifications[idx])}
                  onChange={() => toggleVerification(idx)}
                  style={{ marginTop: '2px' }}
                />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Recommended Coordination Steps */}
        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FFFFFF', border: '1px solid var(--border-medium)' }}>
          <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.775rem', fontWeight: 700, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Radio size={14} color="#0D9488" />
            <span>Recommended Coordination Steps</span>
          </h5>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {report.recommendedCoordinationSteps.map((step, idx) => (
              <li key={`step-${idx}`} style={{ marginBottom: '0.25rem' }}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      {/* 7. OPTIONAL IMAGE DECISION SUPPORT (if image exists) */}
      {report.imageDecisionSupport && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(13, 148, 136, 0.05)',
            border: '1px solid rgba(13, 148, 136, 0.25)',
            marginBottom: '1.25rem',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0D9488', fontWeight: 700, marginBottom: '0.3rem' }}>
            <Eye size={15} />
            <span>Aerial / Incident Imagery Review (Decision Support)</span>
          </div>
          <p style={{ margin: '0 0 0.4rem 0', color: 'var(--text-primary)' }}>
            {report.imageDecisionSupport.observationSummary}
          </p>
          <div style={{ fontSize: '0.7rem', color: '#B45309', fontStyle: 'italic' }}>
            {report.imageDecisionSupport.survivabilityAssessmentDisclaimer}
          </div>
        </div>
      )}

      {/* 8. ACTION CONTROLS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
        {incident.status === 'pending' && onAcknowledgeIncident && (
          <button
            onClick={() => onAcknowledgeIncident(incident.id)}
            className="btn btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '0.775rem',
              backgroundColor: '#0284C7',
            }}
          >
            <CheckCircle2 size={14} />
            <span>{t.map.actionAcknowledge || 'Acknowledge Incident'}</span>
          </button>
        )}

        {onLaunchDroneSim && (
          <button
            onClick={() => onLaunchDroneSim(incident)}
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '0.775rem',
              backgroundColor: '#102A43',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Radio size={14} color="#38BDF8" />
            <span>Simulate Drone Mission</span>
          </button>
        )}
      </div>
    </div>
  );
};

