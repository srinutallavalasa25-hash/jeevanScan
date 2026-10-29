import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Square,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Compass,
  WifiOff,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import {
  startLocationSharing,
  stopLocationSharing,
  subscribeToLocationState,
  type LocationSharingState,
} from '../lib/location/liveLocationManager';

interface LiveLocationSharingCardProps {
  t: TranslationDict;
  sosId: string;
  updateTokenHash?: string | null;
  compact?: boolean;
}

export const LiveLocationSharingCard: React.FC<LiveLocationSharingCardProps> = ({
  t,
  sosId,
  updateTokenHash,
  compact = false,
}) => {
  const [sharingState, setSharingState] = useState<LocationSharingState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLocationState((nextState) => {
      setSharingState(nextState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const isCurrentSosTracking =
    sharingState !== null &&
    sharingState.status !== 'stopped' &&
    sharingState.sosId === sosId;

  const handleStart = async () => {
    setActionError(null);
    const result = await startLocationSharing(sosId, updateTokenHash);
    if (!result.success) {
      setActionError(result.error || 'Failed to start location sharing');
    }
  };

  const handleStop = () => {
    setActionError(null);
    stopLocationSharing();
  };

  const getStatusBadge = () => {
    if (!sharingState || !isCurrentSosTracking) {
      return (
        <span className="badge badge-subtle" style={{ fontSize: '0.75rem' }}>
          {t.liveLocation.statusStopped}
        </span>
      );
    }

    switch (sharingState.status) {
      case 'requesting_permission':
        return (
          <span className="badge badge-amber" style={{ fontSize: '0.75rem', gap: '0.4rem' }}>
            <span className="pulse-dot pulse-dot-amber" />
            {t.liveLocation.statusRequesting}
          </span>
        );
      case 'active':
        return (
          <span className="badge badge-emerald" style={{ fontSize: '0.75rem', gap: '0.4rem' }}>
            <span className="pulse-dot pulse-dot-emerald" />
            {t.liveLocation.statusActive}
          </span>
        );
      case 'paused_offline':
        return (
          <span className="badge badge-amber" style={{ fontSize: '0.75rem', gap: '0.4rem' }}>
            <WifiOff size={12} />
            {t.liveLocation.statusPausedOffline}
          </span>
        );
      case 'inaccurate':
        return (
          <span className="badge badge-amber" style={{ fontSize: '0.75rem', gap: '0.4rem' }}>
            <AlertTriangle size={12} />
            {t.liveLocation.statusInaccurate}
          </span>
        );
      case 'denied':
        return (
          <span className="badge badge-red" style={{ fontSize: '0.75rem' }}>
            {t.liveLocation.statusDenied}
          </span>
        );
      case 'timeout':
        return (
          <span className="badge badge-red" style={{ fontSize: '0.75rem' }}>
            {t.liveLocation.statusTimeout}
          </span>
        );
      case 'unavailable':
      default:
        return (
          <span className="badge badge-red" style={{ fontSize: '0.75rem' }}>
            {t.liveLocation.statusUnavailable}
          </span>
        );
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: compact ? '1rem' : '1.5rem',
        borderRadius: 'var(--radius-lg)',
        border: isCurrentSosTracking ? '2px solid var(--color-teal)' : '1px solid var(--border-medium)',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        boxShadow: isCurrentSosTracking ? '0 4px 20px rgba(13, 148, 136, 0.12)' : 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: isCurrentSosTracking ? 'var(--color-teal-light)' : '#F1F5F9',
              color: isCurrentSosTracking ? 'var(--color-teal-dark)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Navigation size={20} className={isCurrentSosTracking ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 style={{ fontSize: compact ? '1rem' : '1.15rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
              {t.liveLocation.cardTitle}
            </h3>
            {!compact && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                {t.liveLocation.cardSubtitle}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {getStatusBadge()}
        </div>
      </div>

      {/* Explanation Banner when stopped */}
      {!isCurrentSosTracking && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#F8FAFC',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.825rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <Compass size={16} style={{ color: 'var(--color-teal)', flexShrink: 0, marginTop: '2px' }} />
            <span>{t.liveLocation.permissionExplanation}</span>
          </div>
        </div>
      )}

      {/* Reading metrics when active or paused */}
      {isCurrentSosTracking && sharingState?.currentReading && (
        <div
          style={{
            background: '#F8FAFC',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.825rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.725rem' }}>
              {t.liveLocation.latitudeLabel} / {t.liveLocation.longitudeLabel}
            </span>
            <code style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.85rem' }}>
              {sharingState.currentReading.latitude.toFixed(5)}, {sharingState.currentReading.longitude.toFixed(5)}
            </code>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.725rem' }}>
              {t.liveLocation.accuracyLabel}
            </span>
            <strong style={{ color: sharingState.currentReading.accuracyMeters <= 50 ? '#059669' : '#D97706' }}>
              ±{Math.round(sharingState.currentReading.accuracyMeters)} m
            </strong>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.725rem' }}>
              {t.liveLocation.timestampLabel}
            </span>
            <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={12} style={{ color: 'var(--text-muted)' }} />
              {new Date(sharingState.currentReading.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.725rem' }}>
              {t.liveLocation.updatesCountLabel}
            </span>
            <strong style={{ color: 'var(--color-teal)' }}>
              {sharingState.updateCount}
            </strong>
          </div>
        </div>
      )}

      {/* Retained in Memory or Throttle Note */}
      {isCurrentSosTracking && sharingState?.currentReading && !sharingState.currentReading.transmitted && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.75rem',
            color: '#B45309',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>{sharingState.currentReading.transmissionError || t.liveLocation.retainedInMemoryNotice}</span>
        </div>
      )}

      {/* Permission Denied Help Banner */}
      {isCurrentSosTracking && sharingState?.status === 'denied' && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.8rem',
            color: '#B91C1C',
            marginBottom: '1rem',
          }}
        >
          {t.liveLocation.deniedHelp}
        </div>
      )}

      {actionError && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.775rem',
            color: '#B91C1C',
            marginBottom: '1rem',
          }}
        >
          {actionError}
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        {!isCurrentSosTracking ? (
          <button
            onClick={handleStart}
            className="btn btn-teal"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', width: compact ? '100%' : 'auto' }}
          >
            <Navigation size={16} />
            <span>{t.liveLocation.startSharing}</span>
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="btn btn-outline"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.9rem',
              color: '#DC2626',
              borderColor: '#FCA5A5',
              backgroundColor: '#FEF2F2',
              width: compact ? '100%' : 'auto',
            }}
          >
            <Square size={16} fill="#DC2626" />
            <span>{t.liveLocation.stopSharing}</span>
          </button>
        )}

        {isCurrentSosTracking && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Tracking active for SOS: <code>{sosId.slice(0, 8)}...</code>
          </span>
        )}
      </div>

      {/* Mandatory Emergency Disclaimer */}
      <div
        style={{
          padding: '0.65rem 0.85rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          fontSize: '0.75rem',
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          lineHeight: 1.4,
        }}
      >
        <ShieldAlert size={16} style={{ flexShrink: 0, color: '#D97706' }} />
        <span>
          <strong>Emergency Notice:</strong> {t.liveLocation.emergencyDisclaimer}
        </span>
      </div>

      {/* Demo Mode Notice */}
      {sharingState?.isDemo && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.4rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            background: '#F1F5F9',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          {t.liveLocation.demoBanner}
        </div>
      )}
    </div>
  );
};
