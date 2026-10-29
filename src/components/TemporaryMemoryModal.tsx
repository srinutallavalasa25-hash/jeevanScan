import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, X } from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { CreateIncidentPayload } from '../types/database';
import { formatSOSTextForClipboard } from '../lib/offline/memoryQueue';

interface TemporaryMemoryModalProps {
  t: TranslationDict;
  payload: CreateIncidentPayload | null;
  onClose: () => void;
}

export const TemporaryMemoryModal: React.FC<TemporaryMemoryModalProps> = ({
  t,
  payload,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!payload) return null;

  const handleCopy = async () => {
    try {
      const text = formatSOSTextForClipboard(payload);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1.25rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          border: '2px solid var(--color-red)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          position: 'relative',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 10px 25px rgba(16, 42, 67, 0.2)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-red-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-red)',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-red)' }}>
              {t.offlineQueue.storageFailureAlertTitle}
            </h3>
            <span className="badge badge-red" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
              {t.offlineQueue.memoryOnlyLabel}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {t.offlineQueue.storageFailureAlertBody}
        </p>

        {/* SOS Summary Preview */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.825rem',
            fontFamily: 'monospace',
            color: 'var(--text-primary)',
          }}
        >
          <div><strong>SOS ID:</strong> {payload.sos_id}</div>
          <div><strong>Type:</strong> {payload.emergency_type}</div>
          <div><strong>Priority:</strong> {payload.priority}</div>
          <div><strong>Valid Until:</strong> {payload.valid_until}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3" style={{ flexWrap: 'wrap' }}>
          <button
            onClick={handleCopy}
            className="btn btn-outline"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', borderColor: 'var(--color-teal)', color: 'var(--color-teal)' }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? t.offlineQueue.copiedSuccess : t.offlineQueue.copyPayload}</span>
          </button>

          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
          >
            <span>{t.offlineQueue.acknowledgeMemoryWarning}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
