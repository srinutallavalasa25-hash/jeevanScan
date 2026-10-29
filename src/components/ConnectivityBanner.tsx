import React from 'react';
import { Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';

interface ConnectivityBannerProps {
  t: TranslationDict;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  queueCount?: number;
  pendingCount?: number;
  committedCount?: number;
  onOpenQueue?: () => void;
}

export const ConnectivityBanner: React.FC<ConnectivityBannerProps> = ({
  t,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  isOnline,
  isSyncing,
  queueCount = 0,
  pendingCount,
  committedCount = 0,
  onOpenQueue,
}) => {
  const effectiveOnline = isOnline && !isSimulatedOffline;

  // Resolve pending count from explicit prop or backwards-compatible queueCount
  const effectivePending = pendingCount !== undefined ? pendingCount : queueCount;

  // Determine descriptive queue label to eliminate queue count confusion
  let queueLabelText = `Queue (${effectivePending})`;
  if (effectivePending > 0) {
    queueLabelText = `Queue (${effectivePending} pending)`;
  } else if (committedCount > 0) {
    queueLabelText = `Queue (0 pending / ${committedCount} saved)`;
  }

  return (
    <div
      style={{
        backgroundColor: effectiveOnline
          ? isSyncing
            ? 'var(--color-teal-light)'
            : '#F0FDFA'
          : 'var(--color-red-light)',
        borderBottom: `1px solid ${
          effectiveOnline
            ? isSyncing
              ? '#99F6E4'
              : '#CCFBF1'
            : '#FECACA'
        }`,
        padding: '0.5rem 1rem',
        fontSize: '0.85rem',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="container flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="flex items-center gap-2">
          {effectiveOnline ? (
            isSyncing ? (
              <RefreshCw size={16} style={{ color: 'var(--color-teal-dark)', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Wifi size={16} style={{ color: 'var(--color-teal)' }} />
            )
          ) : (
            <WifiOff size={16} style={{ color: 'var(--color-red)' }} />
          )}

          <div>
            <strong style={{ color: effectiveOnline ? (isSyncing ? 'var(--color-teal-dark)' : 'var(--color-teal)') : 'var(--color-red)' }}>
              {effectiveOnline
                ? isSyncing
                  ? t.connectivity.syncingTitle
                  : t.connectivity.onlineTitle
                : t.connectivity.offlineTitle}
            </strong>
            <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', display: 'inline-block' }}>
              {effectiveOnline
                ? isSyncing
                  ? t.connectivity.syncingDesc
                  : t.connectivity.onlineDesc
                : t.connectivity.offlineDesc}
            </span>
          </div>
        </div>

        {/* Demo simulator toggle button + Local queue button */}
        <div className="flex items-center gap-2">
          {onOpenQueue && (
            <button
              id="connectivity-queue-btn"
              onClick={onOpenQueue}
              className="badge badge-teal"
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                border: '1px solid #99F6E4',
              }}
              title={`${effectivePending} pending local processing, ${committedCount} committed in local storage`}
            >
              <Database size={13} />
              <span>{queueLabelText}</span>
            </button>
          )}

          <button
            id="toggle-offline-mode-btn"
            onClick={onToggleSimulatedOffline}
            className={`badge ${isSimulatedOffline ? 'badge-orange' : 'badge-subtle'}`}
            style={{
              cursor: 'pointer',
              border: '1px solid var(--border-medium)',
              background: isSimulatedOffline ? 'var(--color-orange-light)' : '#FFFFFF',
            }}
            title="Toggle offline state simulation for hackathon verification"
          >
            {isSimulatedOffline ? t.connectivity.normalMode : t.connectivity.simulateToggle}
          </button>
        </div>
      </div>
    </div>
  );
};
