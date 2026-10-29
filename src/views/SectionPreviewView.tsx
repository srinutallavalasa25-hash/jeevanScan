import React from 'react';
import { 
  AlertCircle, 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Code2, 
  Lock, 
  ShieldCheck 
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';

interface SectionPreviewViewProps {
  viewId: NavView;
  title: string;
  icon: React.ReactNode;
  scheduledPhase: string;
  description: string;
  plannedFeatures: string[];
  t: TranslationDict;
  onBackToHome: () => void;
}

export const SectionPreviewView: React.FC<SectionPreviewViewProps> = ({
  title,
  icon,
  scheduledPhase,
  description,
  plannedFeatures,
  t,
  onBackToHome,
}) => {
  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 4rem', maxWidth: '850px' }}>
      {/* Back button */}
      <button
        onClick={onBackToHome}
        className="btn btn-outline"
        style={{ marginBottom: '1.5rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Overview</span>
      </button>

      {/* Main Preview Card */}
      <div className="glass-panel" style={{ border: '1px solid var(--border-medium)', position: 'relative' }}>
        {/* Header */}
        <div className="flex items-center gap-3" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--color-teal-light)',
              border: '1px solid #99F6E4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-teal)',
            }}
          >
            {icon}
          </div>

          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.2rem', color: 'var(--text-primary)' }}>{title}</h1>
            <div className="flex items-center gap-2">
              <span className="badge badge-teal">
                <Calendar size={12} />
                {scheduledPhase}
              </span>
              <span className="badge badge-subtle">
                <ShieldCheck size={12} />
                {t.previewNotice.currentPhase}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.75rem', color: 'var(--text-secondary)' }}>
          {description}
        </p>

        {/* Non-Negotiable Transparency Notice */}
        <div
          style={{
            background: '#FFEDD5',
            border: '1px solid #FED7AA',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={18} style={{ color: '#F97316', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#C2410C', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                {t.previewNotice.title} (Rules 9 & 16)
              </strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {t.previewNotice.body}
              </p>
            </div>
          </div>
        </div>

        {/* Planned Technical Scope */}
        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Planned Technical Deliverables</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2rem' }}>
          {plannedFeatures.map((feat, idx) => (
            <li
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                fontSize: '0.9rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: '#F8FAFC',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <CheckCircle2 size={16} style={{ color: 'var(--color-teal)', flexShrink: 0, marginTop: '3px' }} />
              <span style={{ color: 'var(--text-primary)' }}>{feat}</span>
            </li>
          ))}
        </ul>

        {/* Footer info */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.825rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div className="flex items-center gap-2">
            <Code2 size={14} />
            <span>Architecture Shell: React 19 + TypeScript + Vite</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock size={14} />
            <span>Secure website-only implementation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
